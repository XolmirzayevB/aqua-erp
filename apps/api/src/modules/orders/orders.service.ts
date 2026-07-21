import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
  Logger, OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { PushService } from "../notifications/push.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { AdjustOrderDto } from "./dto/adjust-order.dto";
import { AssignDriverDto } from "./dto/assign-driver.dto";
import { QueryOrdersDto } from "./dto/query-orders.dto";
import { SettingsService } from "../settings/settings.service";
import { AuditService } from "../audit/audit.service";
import { Prisma, OrderStatus, Role } from "@aqua/database";
import { parseLatLngFromUrl, resolveLatLng } from "../../common/utils/geo.util";
import { localDayRange, toLocal } from "../../common/utils/date.util";
import { format } from "date-fns";

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW:        ["PROCESSING", "CANCELLED"],
  PROCESSING: ["ASSIGNED", "CANCELLED"],
  ASSIGNED:   ["DELIVERED", "CANCELLED"],
  DELIVERED:  [],
  CANCELLED:  [],
};

// Klik (karta) to'lovi shu muddat ichida tasdiqlanmasa zakaz NASIYAGA o'tadi
// (2026-07-20: egasi so'rovi bilan 48 → 12 soat qilindi)
const CARD_CONFIRM_HOURS = 12;

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
    private push: PushService,
    private settings: SettingsService,
    private audit: AuditService,
  ) {}

  // Muddati o'tgan Klik zakazlarini muntazam tekshirib nasiyaga o'tkazamiz:
  // ishga tushganda bir marta + har 30 daqiqada (server bitta nusxada ishlaydi,
  // @nestjs/schedule keraksiz — oddiy interval yetarli va qo'shimcha paketsiz).
  onModuleInit() {
    setTimeout(() => this.convertExpiredCardOrders().catch((e) =>
      this.logger.error(`Klik avto-nasiya (boshlang'ich) xatosi: ${e?.message}`)), 15_000);
    setInterval(() => this.convertExpiredCardOrders().catch((e) =>
      this.logger.error(`Klik avto-nasiya xatosi: ${e?.message}`)), 30 * 60 * 1000);
  }

  async create(dto: CreateOrderDto, userId: string) {
    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException("Mijoz topilmadi");

    // Verify driver if provided
    if (dto.driverId) {
      const driver = await this.prisma.user.findFirst({
        where: { id: dto.driverId, role: Role.DRIVER, isActive: true },
      });
      if (!driver) throw new NotFoundException("Haydovchi topilmadi");
    }

    // Lokatsiya tanlangan bo'lsa — SHU mijozники bo'lishi shart
    if (dto.locationId) {
      const loc = await this.prisma.customerLocation.findFirst({
        where: { id: dto.locationId, customerId: dto.customerId },
      });
      if (!loc) throw new NotFoundException("Tanlangan manzil bu mijozga tegishli emas");
    }

    const refillCount = dto.refillCount ?? 0;
    const newBottles = dto.newBottles ?? 0;

    if (refillCount + newBottles <= 0) {
      throw new BadRequestException("Kamida 1 ta tara to'ldirish yoki yangi tara bo'lishi kerak");
    }

    // ANIQLASHTIRISH (2026-07-17, egasi so'rovi): daftardagi tara soni noaniq —
    // operator mijozdan telefonda so'rab haqiqiy sonni yuboradi. Mijozning
    // bottlesOwned qiymati SHU songa tuzatiladi (zakaz hisobidan OLDIN).
    const ownedCorrected =
      dto.actualBottlesOwned != null && dto.actualBottlesOwned !== customer.bottlesOwned;
    const ownedNow = ownedCorrected ? dto.actualBottlesOwned! : customer.bottlesOwned;

    // TO'KIB OLISH (2026-07-20, operator so'rovi): mijoz uyidagi tarasidan
    // KO'P suv olishi mumkin — masalan 5 tarasi bor, 6 ta oladi: 5 tasini
    // almashtiradi, 1 tasining suvini idishiga to'kib, tarani DARROV qaytaradi.
    // Shuning uchun refill > owned endi XATO EMAS — ortiqchasi "to'kib olish".
    // Mijoz tarasi o'zgarmaydi (almashtirish ham, to'kib olish ham owned'ga
    // ta'sir qilmaydi), tara hammasi qaytadi (bottlesReturned = refillCount),
    // ombor ham o'zgarmaydi (net nol). Faqat izohga belgi yozamiz — haydovchi
    // nechta tarani joyida bo'shatib qaytarishini bilsin.
    const pourCount = Math.max(0, refillCount - ownedNow);

    // Narxlar — sozlamadan (o'zgaruvchan)
    const refillPrice = await this.settings.getNumber("refillPrice");
    const newBottlePrice = await this.settings.getNumber("newBottlePrice");
    const totalAmount = refillCount * refillPrice + newBottles * newBottlePrice;
    const quantity = refillCount + newBottles; // jami yetkazilgan suv
    const bottlesReturned = dto.bottlesReturned ?? refillCount; // odatda almashtirilgan = qaytarilgan

    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: dto.customerId,
          driverId: dto.driverId || null,
          createdById: userId,
          quantity,
          pricePerUnit: refillPrice,
          refillCount,
          newBottles,
          refillPrice,
          newBottlePrice,
          totalAmount,
          bottlesReturned,
          // To'lov turi endi odatda YETKAZILGANDA tanlanadi (null bo'lib turadi).
          // Eski klient yuborsa — eski mantiq saqlanadi (DEBT balansi pastda).
          paymentType: (dto.paymentType as any) ?? null,
          locationId: dto.locationId || null,
          status: dto.driverId ? "ASSIGNED" : "NEW",
          // Aniqlashtirish/to'kib olish izlari — keyin "nega o'zgardi" savoli chiqmasin
          notes: [
            dto.notes,
            ownedCorrected
              ? `Tara aniqlashtirildi: ${customer.bottlesOwned} → ${ownedNow} (mijozdan so'raldi)`
              : null,
            pourCount > 0
              ? `♻️ ${pourCount} ta suv TO'KIB olinadi (mijoz tarasi ${ownedNow} ta — suvi idishga quyilib, tara darrov qaytadi)`
              : null,
          ].filter(Boolean).join(" · ") || null,
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true, bottlesOwned: true } },
          driver: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
          location: true,
        },
      });

      // Mijoz tarasi: yangi sotib olingan tara mijozники bo'ladi.
      // Aniqlashtirilgan bo'lsa — increment EMAS, to'g'ridan-to'g'ri
      // "haqiqiy son + yangi tara" qilib O'RNATILADI (daftar tuzatildi).
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          ...(ownedCorrected
            ? { bottlesOwned: ownedNow + newBottles }
            : { bottlesOwned: { increment: newBottles } }),
          bottlesGiven: { increment: quantity },
          bottlesReturned: { increment: bottlesReturned },
          // Faqat eski klient DEBT yuborsa (yangi oqimda paymentType kelmaydi —
          // nasiya balansi yetkazilganda yoziladi)
          ...(dto.paymentType === "DEBT" ? { balance: { decrement: totalAmount } } : {}),
        },
      });

      // Ombor harakati (soddalashtirilgan model):
      // FAQAT yangi sotilgan tara ombordan butunlay chiqadi (mijozники bo'ladi).
      // Almashtirish (to'ldirish) — bo'sh tara chiqib, bo'sh tara qaytadi →
      // omborga ta'sir qilmaydi (net nol).
      if (newBottles > 0) {
        const emptyInv = await tx.inventory.findUnique({ where: { type: "EMPTY_BOTTLE" } });
        if (emptyInv) {
          await tx.inventory.update({
            where: { type: "EMPTY_BOTTLE" },
            data: { quantity: { decrement: newBottles } },
          });
          await tx.inventoryAction.create({
            data: {
              inventoryId: emptyInv.id,
              actionType: "DELIVERY",
              quantity: -newBottles,
              description: `Buyurtma #${created.seq} — ${newBottles} ta yangi tara sotildi (${customer.name})`,
            },
          });
        }
      }

      // ⚠️ KIRIM (INCOME) BU YERDA YOZILMAYDI (2026-07-14 o'zgarishi).
      // Pul haydovchi YETKAZIB, olganда keladi — tushum updateStatus(DELIVERED)da
      // yoziladi. Yaratilganda yozish "hali kelmagan pul"ni moliyaga qo'shib
      // yuborardi (egasi so'rovi bilan o'zgartirilgan).

      return created;
    });

    // Real-time: notify driver
    if (order.driverId) {
      // Tanlangan lokatsiya bo'lsa — xabarda o'sha manzil ko'rsatiladi
      const deliverAddr = order.location
        ? `${order.location.label}${order.location.address ? " — " + order.location.address : ""}`
        : order.customer.address;
      this.notifications.emitToUser(order.driverId, "new_order", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        quantity: order.quantity,
        address: deliverAddr,
      });
      // Push: ilova yopiq bo'lsa ham telefonga xabar boradi
      this.push.sendToUser(order.driverId, {
        title: `Yangi buyurtma #${order.seq}`,
        body: `${order.customer.name} — ${order.quantity} ta suv${deliverAddr ? ", " + deliverAddr : ""}`,
        url: `/orders/${order.id}`,
        tag: `order-${order.id}`,
      }).catch(() => {});
    }

    // Notify operators/admins
    this.notifications.emitToRole("OPERATOR", "order_created", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
    });
    this.notifications.emitToRole("ADMIN", "order_created", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
    });

    return order;
  }

  async findAll(query: QueryOrdersDto) {
    const {
      search, status, driverId, customerId, paymentType, zone,
      dateFrom, dateTo, page = 1, limit = 20, overdue, cardPending,
      open, unassigned,
    } = query;
    let { sortBy = "createdAt", sortOrder = "desc" } = query;

    // QOLIB KETGAN zakazlar: avvalgi kunlardan ochiq qolganlar (bugungi lokal
    // kun boshidan OLDIN yozilgan, hali yetkazilmagan). Eng eskisi birinchi.
    const todayStart = localDayRange(new Date()).start;
    if (overdue) {
      sortBy = "createdAt";
      sortOrder = "asc";
    }
    // KLIK TASDIQLASH ro'yxati: yetkazilgan, Karta (Click), hali tasdiqlanmagan.
    // Eng eskisi birinchi — muddati (48h) tugashiga oz qolganlar tepada.
    if (cardPending) {
      sortBy = "deliveredAt";
      sortOrder = "asc";
      // Qo'shimcha himoya: ro'yxat ochilganda muddati o'tganlar DARROV
      // nasiyaga o'tkaziladi (intervalga qaramasdan) — operator har doim
      // to'g'ri holatni ko'radi.
      await this.convertExpiredCardOrders().catch((e) =>
        this.logger.error(`Klik avto-nasiya (ro'yxat) xatosi: ${e?.message}`));
    }

    const where: Prisma.OrderWhereInput = {
      ...(overdue
        ? {
            status: { in: ["NEW", "PROCESSING", "ASSIGNED"] as OrderStatus[] },
            createdAt: { lt: todayStart },
          }
        : {}),
      ...(cardPending
        ? {
            status: "DELIVERED" as OrderStatus,
            paymentType: "CARD" as any,
            cardConfirmedAt: null,
          }
        : {}),
      ...(status && !overdue && !cardPending ? { status: status as OrderStatus } : {}),
      // "Yo'lda" — barcha ochiq zakazlar (status filtri bilan birga kelmaydi)
      ...(open && !status
        ? { status: { in: ["NEW", "PROCESSING", "ASSIGNED"] as OrderStatus[] } }
        : {}),
      // "Haydovchi yuklash" — haydovchisiz ochiqlar (ASSIGNED'da haydovchi bor)
      ...(unassigned
        ? {
            status: { in: ["NEW", "PROCESSING"] as OrderStatus[] },
            driverId: null,
          }
        : {}),
      ...(driverId ? { driverId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(paymentType ? { paymentType: paymentType as any } : {}),
      // Hudud bo'yicha filtr (mijozning hududi)
      ...(zone ? { customer: { zone } } : {}),
      // Sana oralig'i — O'ZBEKISTON kuni bo'yicha (localDayRange), UTC emas
      // (overdue rejimida ishlatilmaydi — u o'z createdAt filtriga ega).
      // "Yetkazildi" tabida sana O'SHA KUNI YETKAZILGANLARNI bildiradi
      // (qachon yozilgani farqsiz — egasi so'rovi 2026-07-20); boshqa
      // tablarда avvalgidek yozilgan sana bo'yicha.
      ...((dateFrom || dateTo) && !overdue
        ? {
            [status === "DELIVERED" ? "deliveredAt" : "createdAt"]: {
              ...(dateFrom ? { gte: localDayRange(new Date(dateFrom)).start } : {}),
              ...(dateTo ? { lte: localDayRange(new Date(dateTo)).end } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: (() => {
              const s = search.trim();
              // "#12" — aniq zakaz raqami so'ralgan, faqat seq bo'yicha
              if (/^#\d{1,6}$/.test(s)) {
                return [{ seq: parseInt(s.slice(1), 10) }];
              }
              // Raqamli qidiruv: bo'shliq/+/-/() larni olib tashlaymiz —
              // operator "91 727 27 72" yoki "917272772" yozsa ham topiladi.
              // Qisqa raqam ham TELEFON ham SEQ bo'lishi mumkin — ikkalasida qidiramiz
              // (2026-07-20: avval faqat seq edi, telefon topilmasdi — egasi shikoyati).
              const digits = s.replace(/[\s\-+()]/g, "");
              if (/^\d+$/.test(digits)) {
                const or: Prisma.OrderWhereInput[] = [
                  { customer: { phone: { contains: digits } } },
                  { orderNumber: { contains: digits } },
                ];
                if (digits.length <= 6) or.push({ seq: parseInt(digits, 10) });
                return or;
              }
              return [
                { orderNumber: { contains: s, mode: "insensitive" as const } },
                { customer: { name: { contains: s, mode: "insensitive" as const } } },
                { customer: { phone: { contains: s } } },
              ];
            })(),
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true, bottlesOwned: true } },
          driver: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          location: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user?: { sub: string; role: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, phone2: true, address: true, balance: true, zone: true, locationLink: true, lat: true, lng: true, bottlesOwned: true } },
        driver: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
        editedBy: { select: { id: true, name: true } },
        location: true,
        transactions: true,
      },
    });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");
    // Haydovchi faqat O'ZIGA biriktirilgan buyurtmani ochadi (ID bilan ham)
    if (user?.role === "DRIVER" && order.driverId !== user.sub) {
      throw new ForbiddenException("Bu buyurtma sizga tegishli emas");
    }
    return order;
  }

  async updateStatus(
    id: string,
    dto: UpdateStatusDto,
    userId: string,
    userRole: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");

    // Rol qoidalari:
    // - HAYDOVCHI faqat o'ziga biriktirilgan buyurtmani "Yetkazildi" qila oladi.
    // - "Yetkazildi"ni FAQAT haydovchi (yoki admin) belgilaydi — operator emas.
    // - Boshqa statuslarni (jarayon/tayinlash/bekor) operator/admin qo'yadi.
    if (userRole === "DRIVER") {
      if (order.driverId !== userId) throw new ForbiddenException("Bu buyurtma sizga tegishli emas");
      if (dto.status !== "DELIVERED") throw new ForbiddenException("Haydovchi faqat 'Yetkazildi' statusini qo'ya oladi");
    } else if (dto.status === "DELIVERED" && userRole !== "ADMIN") {
      throw new ForbiddenException("'Yetkazildi'ni faqat haydovchi belgilashi mumkin");
    }

    const allowed = STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `"${order.status}" statusidan "${dto.status}" ga o'tib bo'lmaydi. Ruxsat etilgan: ${allowed.join(", ") || "yo'q"}`
      );
    }

    // TO'LOV TURI YETKAZILGANDA TANLANADI (2026-07-16, egasi so'rovi):
    // haydovchi "Yetkazildi" bosganda naqd/karta/nasiya ni belgilaydi.
    // - Buyurtmada to'lov turi yo'q (yangi oqim) → dto.paymentType MAJBURIY.
    // - Buyurtmada avvaldan bor (eski oqim: yaratishda tanlangan) → o'zgartirib
    //   bo'lmaydi (nasiya balansi yaratishда yozilgan — almashtirish chalkashtiradi).
    let effectivePayment: "CASH" | "CARD" | "DEBT" | "FREE" | null =
      (order.paymentType as any) ?? null;
    let applyDebtNow = false; // nasiya balansini SHU yetkazishda yozish kerakmi
    if (dto.status === "DELIVERED") {
      if (!order.paymentType) {
        if (!dto.paymentType) {
          throw new BadRequestException("To'lov turini tanlang: naqd, karta, nasiya yoki bepul");
        }
        effectivePayment = dto.paymentType;
        applyDebtNow = dto.paymentType === "DEBT";
      } else if (dto.paymentType && dto.paymentType !== order.paymentType) {
        throw new BadRequestException(
          "Bu buyurtmada to'lov turi avvaldan belgilangan — o'zgartirib bo'lmaydi"
        );
      }
    }

    // LOKATSIYA SAQLASH (2026-07-20, egasi so'rovi): haydovchi "Lokatsiyani
    // saqlash"ni yoqib zakazni yopsa — uning GPS joyi ADASHMASDAN to'g'ri
    // manzilga yoziladi: zakaz qo'shimcha manzilga (Do'kon, Apteka...) berilgan
    // bo'lsa O'SHA CustomerLocation'ga, aks holda mijozning asosiy kartasiga.
    const saveLocation =
      dto.status === "DELIVERED" && dto.driverLat != null && dto.driverLng != null;
    const geoNote = saveLocation
      ? `📍 Lokatsiya haydovchi tomonidan o'rnatildi${dto.locationAccuracy ? ` (aniqlik ~${Math.round(dto.locationAccuracy)} m)` : ""}`
      : null;
    // Qo'shimcha manzilga yozilsa uning nomi (Do'kon...) — audit uchun ichkarida to'ldiriladi
    let locationTargetLabel: string | null = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: {
          status: dto.status as OrderStatus,
          ...(dto.status === "DELIVERED"
            ? { deliveredAt: new Date(), paymentType: effectivePayment as any }
            : {}),
          // Yangi izoh kelsa o'sha; lokatsiya saqlansa iz ham qo'shiladi
          ...(dto.notes || geoNote
            ? { notes: [dto.notes ?? order.notes, geoNote].filter(Boolean).join(" · ") }
            : {}),
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          driver: { select: { id: true, name: true } },
        },
      });

      if (saveLocation) {
        // Google xarita havolasi ham koordinataga moslab yangilanadi — eski
        // link qolib ketsa marshrut yangi, link eski joyni ko'rsatib chalkashtirardi
        const link = `https://maps.google.com/?q=${dto.driverLat},${dto.driverLng}`;
        if (order.locationId) {
          const loc = await tx.customerLocation.update({
            where: { id: order.locationId },
            data: { lat: dto.driverLat, lng: dto.driverLng, locationLink: link },
          });
          locationTargetLabel = loc.label; // qo'shimcha manzil nomi (Do'kon, Apteka...)
        } else {
          await tx.customer.update({
            where: { id: order.customerId },
            data: { lat: dto.driverLat, lng: dto.driverLng, locationLink: link },
          });
        }
      }

      // TUSHUM YETKAZILGANDA yoziladi (2026-07-14): haydovchi yetkazib,
      // NAQD pulini olganда moliyaga kirim tushadi. Yaratilganda EMAS.
      // - CARD (Klik, 2026-07-18): INCOME BU YERDA YOZILMAYDI — operator Click
      //   hisobida pulni ko'rib TASDIQLAGANDA yoziladi (confirmCardPayment).
      //   48 soatda tasdiqlanmasa avto-NASIYA (convertExpiredCardOrders).
      // - DEBT: INCOME yozilMAYDI — pul mijoz qarzini to'laganda keladi
      //   (customers.addPayment "Qarz to'lovi"). Ikki marta hisoblanmasin.
      // - FREE (imtiyozli/bepul): INCOME ham, qarz ham YOZILMAYDI — pul yo'q.
      // - Idempotent: eski (o'tish davri) buyurtmalarda kirim yaratishда
      //   yozilgan bo'lishi mumkin — bor bo'lsa qayta yozilmaydi.
      if (dto.status === "DELIVERED" && effectivePayment === "CASH") {
        const existing = await tx.transaction.findFirst({
          where: { orderId: id, type: "INCOME" },
          select: { id: true },
        });
        if (!existing) {
          await tx.transaction.create({
            data: {
              type: "INCOME",
              amount: order.totalAmount,
              paymentMethod: "CASH",
              category: "Suv sotuvi",
              description: `${result.customer.name} — buyurtma #${result.seq} yetkazildi`,
              orderId: id,
              customerId: order.customerId,
              createdById: userId,
            },
          });
        }
        // ISHCHI BALANSI (2026-07-19): naqd pul yetkazgan HAYDOVCHI qo'lida
        // qoladi — uning naqd balansiga qo'shiladi (haydovchisiz zakazda —
        // "Yetkazildi"ni bosgan odamga). DELIVERED bir marta bo'ladi
        // (STATUS_TRANSITIONS), shuning uchun ikki marta qo'shilmaydi.
        await tx.user.update({
          where: { id: order.driverId ?? userId },
          data: { cashBalance: { increment: order.totalAmount } },
        });
      }

      // NASIYA yetkazishda tanlangan bo'lsa — summa mijoz qarziga SHU YERDA
      // yoziladi (yangi oqim). Eski oqimda (yaratishda DEBT) allaqachon yozilgan
      // bo'ladi — applyDebtNow=false, ikki marta yozilmaydi.
      if (dto.status === "DELIVERED" && applyDebtNow) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { balance: { decrement: order.totalAmount } },
        });
      }

      // Bekor qilinganda — tara/ombor/pul qaytariladi
      if (dto.status === "CANCELLED") {
        await this.reverseEffects(tx, order);
      }

      return result;
    });

    // 📍 LOKATSIYA AUDITI (2026-07-21, egasi so'rovi): haydovchi lokatsiya
    // qo'shsa — KIM (haydovchi), KIMGA (mijoz), QAYERGA (asosiy/qo'shimcha
    // manzil), koordinata, aniqlik va QACHON aniq yozib qo'yiladi. Audit
    // jurnalida "Lokatsiya" filtri orqali ko'rinadi. Talab bo'lganda tekshiriladi.
    if (saveLocation) {
      await this.audit.log({
        userId, // "Yetkazildi" bosgan odam — odatda haydovchi
        action: "UPDATE",
        entity: "location",
        entityId: order.customerId,
        newData: {
          type: "LOCATION_SET",
          orderId: id,
          orderSeq: updated.seq,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          customerName: updated.customer.name,
          customerPhone: updated.customer.phone,
          // Qayerga yozildi — qo'shimcha manzil nomi yoki asosiy manzil
          target: locationTargetLabel ? `${locationTargetLabel} (qo'shimcha manzil)` : "Asosiy manzil",
          lat: dto.driverLat,
          lng: dto.driverLng,
          accuracy: dto.locationAccuracy ?? null,
          mapLink: `https://maps.google.com/?q=${dto.driverLat},${dto.driverLng}`,
          // Vaqt — O'zbekiston vaqti bilan (audit createdAt UTC bo'ladi, bu qulaylik uchun)
          setAtLocal: format(toLocal(new Date()), "yyyy-MM-dd HH:mm:ss"),
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
    }

    // Real-time notifications
    this.notifications.emitToAll("order_status_changed", {
      orderId: id,
      orderNumber: order.orderNumber,
      newStatus: dto.status,
      customerName: updated.customer.name,
    });

    if (dto.status === "CANCELLED") {
      this.notifications.emitToRole("OPERATOR", "order_cancelled", {
        orderId: id, orderNumber: order.orderNumber,
      });
    }

    return updated;
  }

  // ── KLIK (KARTA) TASDIQLASH (2026-07-18, egasi so'rovi) ────────────────────
  // Haydovchi "Karta (Click)" bilan yopadi, lekin pul kelgan-kelmagani noma'lum.
  // Operator Click hisobida pulni KO'RIB shu metod bilan tasdiqlaydi — INCOME
  // (moliya kirimi) FAQAT SHU YERDA yoziladi, shunda barcha hisobotlarga tushadi.
  async confirmCardPayment(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { customer: { select: { id: true, name: true } } },
    });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");
    if (order.status !== "DELIVERED") {
      throw new BadRequestException("Faqat yetkazilgan zakaz tasdiqlanadi");
    }
    if (order.paymentType !== "CARD") {
      throw new BadRequestException(
        order.paymentType === "DEBT"
          ? "Bu zakaz nasiyaga o'tgan — pul kelgan bo'lsa \"Qarz to'lovi\" (karta) orqali qabul qiling"
          : "Bu zakaz Klik (karta) bilan yopilmagan",
      );
    }
    if (order.cardConfirmedAt) {
      throw new BadRequestException("Bu zakazning Klik to'lovi allaqachon tasdiqlangan");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: { cardConfirmedAt: new Date(), cardConfirmedById: userId },
        include: {
          customer: { select: { id: true, name: true } },
          driver: { select: { id: true, name: true } },
        },
      });
      // Idempotent: shu zakazga kirim allaqachon bo'lsa qayta yozilmaydi
      // (masalan eski oqim zakazi yoki ikki marta bosilgan holat)
      const existing = await tx.transaction.findFirst({
        where: { orderId: id, type: "INCOME" },
        select: { id: true },
      });
      if (!existing) {
        await tx.transaction.create({
          data: {
            type: "INCOME",
            amount: order.totalAmount,
            paymentMethod: "CARD",
            category: "Suv sotuvi",
            description: `${order.customer.name} — buyurtma #${order.seq} (Klik tasdiqlandi)`,
            orderId: id,
            customerId: order.customerId,
            createdById: userId,
          },
        });
      }
      // ISHCHI BALANSI (2026-07-19): Klik puli TASDIQLAGAN operator (yoki
      // admin) klik balansiga qo'shiladi — Click hisobini u yuritadi.
      // cardConfirmedAt tekshiruvi yuqorida — ikki marta qo'shilmaydi.
      await tx.user.update({
        where: { id: userId },
        data: { clickBalance: { increment: order.totalAmount } },
      });
      return result;
    });

    // Ochiq sahifalar (moliya/dashboard) real vaqtda yangilansin
    this.notifications.emitToAll("order_status_changed", {
      orderId: id,
      orderNumber: order.orderNumber,
      newStatus: "DELIVERED",
      customerName: updated.customer.name,
    });

    return updated;
  }

  // 48 soat ichida tasdiqlanmagan Klik zakazlari avtomatik NASIYAGA o'tadi:
  // zakaz paymentType=DEBT bo'ladi, summa mijoz qarziga yoziladi (balance -),
  // izohga belgi qo'shiladi. Pul keyin kelsa — "Qarz to'lovi" orqali qabul
  // qilinadi (INCOME o'shanda yoziladi). Interval onModuleInit'da.
  async convertExpiredCardOrders() {
    const cutoff = new Date(Date.now() - CARD_CONFIRM_HOURS * 3600 * 1000);
    const expired = await this.prisma.order.findMany({
      where: {
        paymentType: "CARD",
        status: "DELIVERED",
        cardConfirmedAt: null,
        deliveredAt: { lt: cutoff },
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    for (const order of expired) {
      await this.prisma.$transaction(async (tx) => {
        // Poyga himoyasi: shu orada tasdiqlangan bo'lsa — tegmaymiz
        const fresh = await tx.order.findUnique({
          where: { id: order.id },
          select: { paymentType: true, cardConfirmedAt: true },
        });
        if (!fresh || fresh.paymentType !== "CARD" || fresh.cardConfirmedAt) return;

        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentType: "DEBT",
            notes: [order.notes, `⏰ Klik ${CARD_CONFIRM_HOURS} soat ichida tasdiqlanmadi — nasiyaga o'tkazildi (avto)`]
              .filter(Boolean).join(" · "),
          },
        });
        await tx.customer.update({
          where: { id: order.customerId },
          data: { balance: { decrement: order.totalAmount } },
        });
      });
      this.logger.warn(
        `Buyurtma #${order.seq} (${order.customer.name}): Klik tasdiqlanmadi — nasiyaga o'tkazildi (${order.totalAmount} so'm)`,
      );
      // Operatorlarga real-time xabar — ro'yxatlar yangilanadi
      this.notifications.emitToAll("order_status_changed", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        newStatus: "DELIVERED",
        customerName: order.customer.name,
      });
    }
    return { converted: expired.length };
  }

  async assignDriver(id: string, dto: AssignDriverDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");

    // ASSIGNED ham qabul qilinadi — haydovchini ISTALGAN PAYT almashtirish
    // mumkin (logistika: zakaz bu haydovchidan boshqasiga o'tkaziladi).
    // Faqat yakunlangan (yetkazilgan/bekor) buyurtmada o'zgartirib bo'lmaydi.
    if (!["NEW", "PROCESSING", "ASSIGNED"].includes(order.status)) {
      throw new BadRequestException("Bu statusdagi buyurtmaga haydovchi biriktirib bo'lmaydi");
    }

    const driver = await this.prisma.user.findFirst({
      where: { id: dto.driverId, role: Role.DRIVER, isActive: true },
    });
    if (!driver) throw new NotFoundException("Haydovchi topilmadi yoki faol emas");

    const oldDriverId = order.driverId;
    if (oldDriverId === dto.driverId) {
      throw new BadRequestException("Buyurtma allaqachon shu haydovchida");
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { driverId: dto.driverId, status: "ASSIGNED" },
      include: {
        customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true, bottlesOwned: true } },
        driver: { select: { id: true, name: true } },
        location: true,
      },
    });

    // Eski haydovchiga xabar — zakaz undan olindi (marshruti yangilansin)
    if (oldDriverId) {
      this.notifications.emitToUser(oldDriverId, "order_status_changed", {
        orderId: id, orderNumber: order.orderNumber, newStatus: "ASSIGNED",
      });
      this.push.sendToUser(oldDriverId, {
        title: `Buyurtma #${updated.seq} boshqa haydovchiga o'tkazildi`,
        body: `${updated.customer.name} — bu zakaz endi sizda emas`,
        url: `/orders`,
        tag: `order-${id}`,
      }).catch(() => {});
    }

    // Notify the assigned driver — tanlangan lokatsiya bo'lsa o'sha manzil
    const assignAddr = updated.location
      ? `${updated.location.label}${updated.location.address ? " — " + updated.location.address : ""}`
      : updated.customer.address;
    this.notifications.emitToUser(dto.driverId, "new_order", {
      orderId: id,
      orderNumber: order.orderNumber,
      customer: updated.customer,
      quantity: order.quantity,
      address: assignAddr,
    });
    // Push: ilova yopiq bo'lsa ham telefonga xabar boradi
    this.push.sendToUser(dto.driverId, {
      title: `Yangi buyurtma #${updated.seq}`,
      body: `${updated.customer.name} — ${updated.quantity} ta suv${assignAddr ? ", " + assignAddr : ""}`,
      url: `/orders/${id}`,
      tag: `order-${id}`,
    }).catch(() => {});

    this.notifications.emitToAll("order_status_changed", {
      orderId: id, orderNumber: order.orderNumber,
      newStatus: "ASSIGNED", driverName: driver.name,
    });

    return updated;
  }

  // ── YOPILGAN ZAKAZNI TAHRIRLASH (2026-07-17, egasi so'rovi) ────────────────
  // Haydovchi yetkazgach mijoz sonini o'zgartirib qolsa ("4 ta kifoya" /
  // "yana 1 yangi tara") — operator/admin 24 SOAT ichida tuzatadi.
  // Ta'siri HAMMA joyga tarqaladi:
  //   - Zakaz: soni/summasi qayta hisoblanadi (yaratilgandagi NARXLARDA)
  //   - Mijoz: bottlesOwned (yangi tara farqi), bottlesGiven, bottlesReturned
  //   - Ombor: EMPTY_BOTTLE yangi tara farqiga o'zgaradi (+ tarix yozuvi)
  //   - Moliya: CASH/CARD kirim summasi yangilanadi; DEBT balans farqi tuzatiladi;
  //     FREE — moliyaga tegilmaydi
  //   - Hisobotlar order/transaksiyadan o'qiydi — avtomatik to'g'ri bo'ladi
  // Zakaz "Tahrirlangan" belgisini oladi (editedAt/editedById + izoh).
  async adjustDelivered(id: string, dto: AdjustOrderDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { customer: { select: { id: true, name: true, bottlesOwned: true } } },
    });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");
    if (order.status !== "DELIVERED") {
      throw new BadRequestException("Faqat YETKAZILGAN zakaz tahrirlanadi (ochiqlarini bekor qilib qayta yozing)");
    }
    // 24 soat qoidasi
    const deliveredAt = order.deliveredAt ?? order.updatedAt;
    if (Date.now() - deliveredAt.getTime() > 24 * 3600 * 1000) {
      throw new BadRequestException("Yetkazilganiga 24 soatdan oshgan — endi tahrirlab bo'lmaydi");
    }

    const newRefill = dto.refillCount;
    const newNew = dto.newBottles;
    if (newRefill + newNew <= 0) {
      throw new BadRequestException("Kamida 1 ta tara bo'lishi kerak");
    }
    // 2026-07-20: mijoz uyidagi tara sonini ham shu yerda aniqlashtirish mumkin
    const ownedCorrected =
      dto.actualBottlesOwned != null &&
      dto.actualBottlesOwned !== order.customer.bottlesOwned;
    if (newRefill === order.refillCount && newNew === order.newBottles && !ownedCorrected) {
      throw new BadRequestException("Hech narsa o'zgarmadi");
    }

    // Farqlar (delta) — hamma ta'sir shulardan hisoblanadi
    const dRefill = newRefill - order.refillCount;
    const dNew = newNew - order.newBottles;
    const dQty = dRefill + dNew;

    // Summa — zakaz YARATILGANDAGI narxlarda (narx keyin o'zgargan bo'lsa ham
    // shu zakazga eski narx qo'llanadi, adolatli)
    const newTotal =
      newRefill * Number(order.refillPrice) + newNew * Number(order.newBottlePrice);
    const oldTotal = Number(order.totalAmount);

    const editNote = [
      newRefill !== order.refillCount || newNew !== order.newBottles
        ? `Tahrirlandi: ${order.refillCount}+${order.newBottles} → ${newRefill}+${newNew} (to'ldirish+yangi)`
        : null,
      ownedCorrected
        ? `Tara aniqlashtirildi: ${order.customer.bottlesOwned} → ${dto.actualBottlesOwned} (mijozdan so'raldi)`
        : null,
      dto.reason || null,
    ].filter(Boolean).join(" · ");

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1) Zakaz
      const result = await tx.order.update({
        where: { id },
        data: {
          refillCount: newRefill,
          newBottles: newNew,
          quantity: newRefill + newNew,
          totalAmount: newTotal,
          // Qaytgan bo'sh tara odatda to'ldirishga teng — farq bilan suriladi
          bottlesReturned: Math.max(0, order.bottlesReturned + dRefill),
          editedAt: new Date(),
          editedById: userId,
          notes: [order.notes, editNote].filter(Boolean).join(" · "),
        },
        include: {
          customer: { select: { id: true, name: true } },
          driver: { select: { id: true, name: true } },
        },
      });

      // 2) Mijoz tarasi: yangi tara farqi mijoz hisobiga qo'shiladi/ayiriladi.
      // Aniqlashtirilgan bo'lsa — operator aytgan HOZIRGI son + yangi tara farqi
      // qilib O'RNATILADI (operator modal ochilgandagi holatni aytadi).
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          ...(ownedCorrected
            ? { bottlesOwned: dto.actualBottlesOwned! + dNew }
            : { bottlesOwned: { increment: dNew } }),
          bottlesGiven: { increment: dQty },
          bottlesReturned: { increment: dRefill },
        },
      });

      // 3) Ombor: yangi tara farqi (sotilgani ko'paysa ombordan chiqadi, kamaysa qaytadi)
      if (dNew !== 0) {
        const emptyInv = await tx.inventory.findUnique({ where: { type: "EMPTY_BOTTLE" } });
        if (emptyInv) {
          await tx.inventory.update({
            where: { type: "EMPTY_BOTTLE" },
            data: { quantity: { increment: -dNew } },
          });
          await tx.inventoryAction.create({
            data: {
              inventoryId: emptyInv.id,
              actionType: "ADJUSTMENT",
              quantity: -dNew,
              description: `Buyurtma #${order.seq} tahrirlandi — yangi tara ${order.newBottles} → ${newNew} (${order.customer.name})`,
            },
          });
        }
      }

      // 4) Moliya — to'lov turiga qarab
      // CARD hali TASDIQLANMAGAN bo'lsa: kirim YO'Q va yozilmaydi ham —
      // tasdiqlanganda (confirmCardPayment) YANGI summa bilan yoziladi.
      const cardUnconfirmed = order.paymentType === "CARD" && !order.cardConfirmedAt;

      // ISHCHI BALANSI: summa o'zgargani pul ushlagan ishchida ham aks etadi
      // (naqd — haydovchida; tasdiqlangan klik — tasdiqlagan operatorда).
      // Farq manfiy bo'lishi mumkin (pul qaytarilgan) — increment shuni ham hal qiladi.
      const moneyDiff = newTotal - oldTotal;
      if (moneyDiff !== 0 && order.paymentType === "CASH") {
        await tx.user.update({
          where: { id: order.driverId ?? order.createdById },
          data: { cashBalance: { increment: moneyDiff } },
        });
      } else if (moneyDiff !== 0 && order.paymentType === "CARD" && order.cardConfirmedAt) {
        // Eski (backfill) zakazlarda tasdiqlagan yozilmagan — faol operatorga
        const holderId =
          order.cardConfirmedById ??
          (await tx.user.findFirst({
            where: { role: "OPERATOR", isActive: true },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          }))?.id;
        if (holderId) {
          await tx.user.update({
            where: { id: holderId },
            data: { clickBalance: { increment: moneyDiff } },
          });
        }
      }

      if ((order.paymentType === "CASH" || order.paymentType === "CARD") && !cardUnconfirmed) {
        // Kirim summasi yangi haqiqatga tenglashtiriladi
        const inc = await tx.transaction.findFirst({
          where: { orderId: id, type: "INCOME" },
        });
        if (inc) {
          await tx.transaction.update({
            where: { id: inc.id },
            data: {
              amount: newTotal,
              description: `${inc.description ?? ""} (tahrirlangan)`.trim(),
            },
          });
        } else {
          // Ehtiyot: kirim topilmasa yangisini yozamiz
          await tx.transaction.create({
            data: {
              type: "INCOME",
              amount: newTotal,
              paymentMethod: order.paymentType === "CASH" ? "CASH" : "CARD",
              category: "Suv sotuvi",
              description: `${order.customer.name} — buyurtma #${order.seq} (tahrirlangan)`,
              orderId: id,
              customerId: order.customerId,
              createdById: userId,
            },
          });
        }
      } else if (order.paymentType === "DEBT") {
        // Nasiya: qarz farq qadar tuzatiladi (summa kamaysa qarz kamayadi)
        const diff = newTotal - oldTotal;
        if (diff !== 0) {
          await tx.customer.update({
            where: { id: order.customerId },
            data: { balance: { decrement: diff } },
          });
        }
      }
      // FREE — moliyaga tegilmaydi (pul yo'q edi, yo'q bo'lib qoladi)

      return result;
    });

    // Real-time: ro'yxatlar/panellar yangilansin
    this.notifications.emitToAll("order_status_changed", {
      orderId: id,
      orderNumber: order.orderNumber,
      newStatus: "DELIVERED",
      customerName: updated.customer.name,
      edited: true,
    });

    return updated;
  }

  // ── OCHIQ ZAKAZNI TAHRIRLASH (2026-07-20, egasi so'rovi) ───────────────────
  // Operator yozgan zakazni haydovchi YETKAZMASDAN OLDIN tuzatish mumkin
  // (mijoz qayta qo'ng'iroq qilib "3 ta emas 2 ta" desa). Yopilgan zakaz
  // uchun alohida adjustDelivered (24 soat) bor.
  // Ta'siri (create bilan simmetrik — moliya HALI YO'Q, chunki kirim/qarz
  // faqat yetkazilganda yoziladi):
  //   - Zakaz: soni/summa qayta hisoblanadi (yaratilgandagi NARXLARDA)
  //   - Mijoz: bottlesOwned (yangi tara farqi), bottlesGiven, bottlesReturned
  //   - Ombor: EMPTY_BOTTLE yangi tara farqiga o'zgaradi (+ tarix yozuvi)
  //   - Eski oqim zakazi (yaratishda DEBT tanlangan) — mijoz balansi farqqa tuzatiladi
  //   - Haydovchi biriktirilgan bo'lsa — push/socket xabar (soni o'zgardi)
  async update(id: string, dto: UpdateOrderDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { customer: { select: { id: true, name: true, bottlesOwned: true } } },
    });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");

    if (!["NEW", "PROCESSING", "ASSIGNED"].includes(order.status)) {
      throw new BadRequestException(
        "Faqat ochiq (yetkazilmagan) buyurtma tahrirlanadi — yetkazilganini zakaz sahifasidagi \"Tahrirlash\" (24 soat ichida) bilan tuzating"
      );
    }

    const newRefill = dto.refillCount ?? order.refillCount;
    const newNew = dto.newBottles ?? order.newBottles;

    // Mijozning ZAKAZGACHA bo'lgan tarasi (yaratishda +newBottles qilingan edi).
    // Operator "uyida X ta bor" deb ANIQLASHTIRSA (actualBottlesOwned) — shu olinadi.
    const ownedBeforeCurrent = order.customer.bottlesOwned - order.newBottles;
    const ownedCorrected =
      dto.actualBottlesOwned != null && dto.actualBottlesOwned !== ownedBeforeCurrent;
    const ownedBefore = ownedCorrected ? dto.actualBottlesOwned! : ownedBeforeCurrent;

    const countsChanged =
      newRefill !== order.refillCount || newNew !== order.newBottles || ownedCorrected;

    // Faqat izoh o'zgarsa — sonlarga tegmasdan yangilaymiz (eski xatti-harakat)
    if (!countsChanged) {
      if (dto.notes == null) throw new BadRequestException("Hech narsa o'zgarmadi");
      return this.prisma.order.update({
        where: { id },
        data: { notes: dto.notes },
        include: {
          customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true, bottlesOwned: true } },
          driver: { select: { id: true, name: true } },
        },
      });
    }

    if (newRefill + newNew <= 0) {
      throw new BadRequestException("Kamida 1 ta tara to'ldirish yoki yangi tara bo'lishi kerak");
    }

    // TO'KIB OLISH (2026-07-20): refill > owned endi xato emas — ortiqcha suv
    // idishga quyilib tara darrov qaytadi (create bilan bir xil qoida)
    const pourCount = Math.max(0, newRefill - ownedBefore);

    // Farqlar (delta) — hamma ta'sir shulardan
    const dRefill = newRefill - order.refillCount;
    const dNew = newNew - order.newBottles;
    const dQty = dRefill + dNew;

    // Summa — zakaz YARATILGANDAGI narxlarda (adjustDelivered bilan izchil)
    const newTotal =
      newRefill * Number(order.refillPrice) + newNew * Number(order.newBottlePrice);
    const oldTotal = Number(order.totalAmount);

    const editNote = [
      newRefill !== order.refillCount || newNew !== order.newBottles
        ? `Tahrirlandi (yetkazishdan oldin): ${order.refillCount}+${order.newBottles} → ${newRefill}+${newNew} (to'ldirish+yangi)`
        : null,
      ownedCorrected
        ? `Tara aniqlashtirildi: ${ownedBeforeCurrent} → ${ownedBefore} (mijozdan so'raldi)`
        : null,
      pourCount > 0
        ? `♻️ ${pourCount} ta suv TO'KIB olinadi (mijoz tarasi ${ownedBefore} ta — suvi idishga quyilib, tara darrov qaytadi)`
        : null,
      dto.reason || null,
    ].filter(Boolean).join(" · ");

    const updated = await this.prisma.$transaction(async (tx) => {
      // POYGA HIMOYASI: biz o'qigan paytdan beri haydovchi "Yetkazildi" bosgan
      // bo'lishi mumkin — u holda moliya allaqachon eski summada yozilgan.
      // Tranzaksiya ichida statusni qayta tekshiramiz.
      const fresh = await tx.order.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!fresh || !["NEW", "PROCESSING", "ASSIGNED"].includes(fresh.status)) {
        throw new BadRequestException(
          "Zakaz holati hozirgina o'zgardi (yetkazilgan bo'lishi mumkin) — sahifani yangilab qayta urining"
        );
      }

      // 1) Zakaz
      const result = await tx.order.update({
        where: { id },
        data: {
          refillCount: newRefill,
          newBottles: newNew,
          quantity: newRefill + newNew,
          totalAmount: newTotal,
          // Qaytariladigan bo'sh tara odatda to'ldirishga teng — farq bilan suriladi
          bottlesReturned: Math.max(0, order.bottlesReturned + dRefill),
          editedAt: new Date(),
          editedById: userId,
          notes: [dto.notes ?? order.notes, editNote].filter(Boolean).join(" · "),
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true, bottlesOwned: true } },
          driver: { select: { id: true, name: true } },
        },
      });

      // 2) Mijoz tarasi — create'dagi incrementlarning farqi.
      // Aniqlashtirilgan bo'lsa — increment EMAS, "haqiqiy son + yangi tara"
      // qilib O'RNATILADI (create'dagi bilan bir xil mantiq).
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          ...(ownedCorrected
            ? { bottlesOwned: ownedBefore + newNew }
            : { bottlesOwned: { increment: dNew } }),
          bottlesGiven: { increment: dQty },
          bottlesReturned: { increment: dRefill },
          // ESKI OQIM: yaratishda DEBT tanlangan bo'lsa qarz ham yozilgan edi —
          // farqqa tuzatamiz. Yangi oqimda paymentType ochiq zakazda null —
          // qarz yetkazilganda yoziladi, bu yerda tegilmaydi.
          ...(order.paymentType === "DEBT"
            ? { balance: { decrement: newTotal - oldTotal } }
            : {}),
        },
      });

      // 3) Ombor: yangi tara farqi (ko'paysa ombordan chiqadi, kamaysa qaytadi)
      if (dNew !== 0) {
        const emptyInv = await tx.inventory.findUnique({ where: { type: "EMPTY_BOTTLE" } });
        if (emptyInv) {
          await tx.inventory.update({
            where: { type: "EMPTY_BOTTLE" },
            data: { quantity: { increment: -dNew } },
          });
          await tx.inventoryAction.create({
            data: {
              inventoryId: emptyInv.id,
              actionType: "ADJUSTMENT",
              quantity: -dNew,
              description: `Buyurtma #${order.seq} tahrirlandi (ochiq) — yangi tara ${order.newBottles} → ${newNew} (${order.customer.name})`,
            },
          });
        }
      }

      // 4) Ehtiyot: ochiq zakazda kirim odatda YO'Q (u yetkazilganda yoziladi),
      // lekin juda eski o'tish davri zakazida bo'lishi mumkin — tenglashtiramiz.
      const inc = await tx.transaction.findFirst({
        where: { orderId: id, type: "INCOME" },
        select: { id: true },
      });
      if (inc) {
        await tx.transaction.update({
          where: { id: inc.id },
          data: { amount: newTotal },
        });
      }

      return result;
    });

    // Haydovchi biriktirilgan bo'lsa — sonlar o'zgarganini bilib tursin
    if (order.driverId) {
      this.notifications.emitToUser(order.driverId, "order_status_changed", {
        orderId: id,
        orderNumber: order.orderNumber,
        newStatus: order.status,
        customerName: updated.customer.name,
        edited: true,
      });
      this.push.sendToUser(order.driverId, {
        title: `Buyurtma #${updated.seq} o'zgartirildi`,
        body: `${updated.customer.name} — endi ${updated.quantity} ta suv (${newRefill} to'ldirish + ${newNew} yangi), ${newTotal.toLocaleString()} so'm`,
        url: `/orders/${id}`,
        tag: `order-${id}`,
      }).catch(() => {});
    }

    // Ochiq ro'yxatlar/panellar yangilansin
    this.notifications.emitToAll("order_status_changed", {
      orderId: id,
      orderNumber: order.orderNumber,
      newStatus: order.status,
      customerName: updated.customer.name,
      edited: true,
    });

    return updated;
  }

  // Bekor qilishda tara/ombor/pul o'zgarishlarini qaytaradi
  private async reverseEffects(tx: Prisma.TransactionClient, order: any) {
    await tx.customer.update({
      where: { id: order.customerId },
      data: {
        bottlesOwned: { decrement: order.newBottles },
        bottlesGiven: { decrement: order.quantity },
        bottlesReturned: { decrement: order.bottlesReturned },
        // Nasiya bo'lsa, yaratishda kamaytirilgan balansni qaytaramiz
        ...(order.paymentType === "DEBT" ? { balance: { increment: order.totalAmount } } : {}),
      },
    });
    // Ombor: sotilgan yangi tara omborga qaytadi (bekor qilinganda).
    // Almashtirish omborga ta'sir qilmagan edi — bekor qilinganda ham tegmaydi.
    if (order.newBottles > 0) {
      const emptyInv = await tx.inventory.findUnique({ where: { type: "EMPTY_BOTTLE" } });
      if (emptyInv) {
        await tx.inventory.update({
          where: { type: "EMPTY_BOTTLE" },
          data: { quantity: { increment: order.newBottles } },
        });
        await tx.inventoryAction.create({
          data: {
            inventoryId: emptyInv.id,
            actionType: "ADJUSTMENT",
            quantity: order.newBottles,
            description: `Buyurtma #${order.seq} bekor — ${order.newBottles} ta yangi tara omborga qaytdi`,
          },
        });
      }
    }
    // Shu buyurtmaga bog'liq kirim yozuvlarini o'chiramiz
    await tx.transaction.deleteMany({ where: { orderId: order.id } });
  }

  async remove(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");
    if (order.status === "DELIVERED") {
      throw new BadRequestException("Yetkazilgan buyurtmani bekor qilib bo'lmaydi");
    }
    if (order.status === "CANCELLED") {
      throw new BadRequestException("Buyurtma allaqachon bekor qilingan");
    }

    await this.prisma.$transaction(async (tx) => {
      await this.reverseEffects(tx, order);
      await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
    });

    this.notifications.emitToAll("order_status_changed", {
      orderId: id, orderNumber: order.orderNumber, newStatus: "CANCELLED",
    });
    return { message: "Buyurtma bekor qilindi" };
  }

  async getDriverOrders(driverId: string, date?: string) {
    // "Bugun" — O'zbekiston kuni (umumiy util, date.util.ts)
    const { start, end } = localDayRange(date ? new Date(date) : new Date());

    const orders = await this.prisma.order.findMany({
      where: {
        driverId,
        OR: [
          // Yopilmagan buyurtmalar — sanasidan QAT'I NAZAR (kechagi, bir oylik ham).
          // Haydovchi yetkazmaguncha marshrutdan tushmaydi.
          { status: { in: ["NEW", "PROCESSING", "ASSIGNED"] as OrderStatus[] } },
          // Yetkazilganlar — faqat shu kuni yetkazilganlar (ro'yxat to'lib ketmasin)
          { status: "DELIVERED" as OrderStatus, deliveredAt: { gte: start, lte: end } },
          // Bekor qilinganlar — shu kuni bekor bo'lganlari (haydovchi bilib tursin;
          // egasi so'rovi 2026-07-14). Marshrut xaritasiga kirmaydi (frontend filtrlaydi).
          { status: "CANCELLED" as OrderStatus, updatedAt: { gte: start, lte: end } },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        customer: { select: { id: true, name: true, phone: true, address: true, lat: true, lng: true, zone: true, locationLink: true } },
        location: true,
      },
    });

    // Xarita uchun: lokatsiya linki bor, lekin lat/lng bo'sh mijozlarning
    // koordinatasini ajratib olamiz va saqlaymiz (keyingi safar tayyor bo'ladi).
    await this.ensureCustomerCoords(orders.map((o) => o.customer));
    // Tanlangan qo'shimcha manzillar (Apteka, Uy...) uchun ham xuddi shu
    await this.ensureLocationCoords(orders.map((o) => o.location).filter(Boolean) as any[]);

    return orders;
  }

  // Mijozning locationLink'idan lat/lng ni ajratib bazaga yozadi (best-effort).
  // Qisqa google havolalari redirect orqali hal qilinadi (timeout bilan).
  private async ensureCustomerCoords(
    customers: { id: string; lat: any; lng: any; locationLink: string | null }[],
  ) {
    const seen = new Set<string>();
    const pending = customers.filter((c) => {
      if (!c || seen.has(c.id) || c.lat != null || !c.locationLink) return false;
      seen.add(c.id);
      return true;
    });
    if (pending.length === 0) return;

    await Promise.all(
      pending.map(async (c) => {
        try {
          const coords = parseLatLngFromUrl(c.locationLink!) || (await resolveLatLng(c.locationLink!));
          if (coords) {
            await this.prisma.customer.update({
              where: { id: c.id },
              data: { lat: coords.lat, lng: coords.lng },
            });
            // Javobdagi obyektni ham yangilaymiz — xarita darhol ko'rsata oladi
            (c as any).lat = coords.lat;
            (c as any).lng = coords.lng;
          }
        } catch {
          // best-effort — bitta mijoz xatosi butun so'rovni buzmasin
        }
      }),
    );
  }

  // Qo'shimcha manzil (CustomerLocation) linkidan lat/lng ajratib saqlaydi —
  // ensureCustomerCoords bilan bir xil mantiq, faqat boshqa jadvalga yozadi.
  private async ensureLocationCoords(
    locations: { id: string; lat: any; lng: any; locationLink: string | null }[],
  ) {
    const seen = new Set<string>();
    const pending = locations.filter((l) => {
      if (!l || seen.has(l.id) || l.lat != null || !l.locationLink) return false;
      seen.add(l.id);
      return true;
    });
    if (pending.length === 0) return;

    await Promise.all(
      pending.map(async (l) => {
        try {
          const coords = parseLatLngFromUrl(l.locationLink!) || (await resolveLatLng(l.locationLink!));
          if (coords) {
            await this.prisma.customerLocation.update({
              where: { id: l.id },
              data: { lat: coords.lat, lng: coords.lng },
            });
            (l as any).lat = coords.lat;
            (l as any).lng = coords.lng;
          }
        } catch {
          // best-effort
        }
      }),
    );
  }

  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const prefix = `ORD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    const last = await this.prisma.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });

    const seq = last ? parseInt(last.orderNumber.split("-").pop() || "0") + 1 : 1;
    return `${prefix}-${String(seq).padStart(4, "0")}`;
  }
}
