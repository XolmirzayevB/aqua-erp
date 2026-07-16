import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { PushService } from "../notifications/push.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { AssignDriverDto } from "./dto/assign-driver.dto";
import { QueryOrdersDto } from "./dto/query-orders.dto";
import { SettingsService } from "../settings/settings.service";
import { Prisma, OrderStatus, Role } from "@aqua/database";
import { parseLatLngFromUrl, resolveLatLng } from "../../common/utils/geo.util";
import { localDayRange } from "../../common/utils/date.util";

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW:        ["PROCESSING", "CANCELLED"],
  PROCESSING: ["ASSIGNED", "CANCELLED"],
  ASSIGNED:   ["DELIVERED", "CANCELLED"],
  DELIVERED:  [],
  CANCELLED:  [],
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
    private push: PushService,
    private settings: SettingsService,
  ) {}

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

    // Tara qoidasi: mijoz o'zidagidan ko'p tara to'ldira olmaydi.
    // Ko'proq kerak bo'lsa — yangi tara sotib olishi shart.
    if (refillCount > customer.bottlesOwned) {
      throw new BadRequestException(
        `Mijozda faqat ${customer.bottlesOwned} ta tara bor. Ko'proq uchun yangi tara qo'shing (sotib olish).`
      );
    }

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
          notes: dto.notes,
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true } },
          driver: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
          location: true,
        },
      });

      // Mijoz tarasi: yangi sotib olingan tara mijozники bo'ladi
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          bottlesOwned: { increment: newBottles },
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
      dateFrom, dateTo, page = 1, limit = 20, overdue,
    } = query;
    let { sortBy = "createdAt", sortOrder = "desc" } = query;

    // QOLIB KETGAN zakazlar: avvalgi kunlardan ochiq qolganlar (bugungi lokal
    // kun boshidan OLDIN yozilgan, hali yetkazilmagan). Eng eskisi birinchi.
    const todayStart = localDayRange(new Date()).start;
    if (overdue) {
      sortBy = "createdAt";
      sortOrder = "asc";
    }

    const where: Prisma.OrderWhereInput = {
      ...(overdue
        ? {
            status: { in: ["NEW", "PROCESSING", "ASSIGNED"] as OrderStatus[] },
            createdAt: { lt: todayStart },
          }
        : {}),
      ...(status && !overdue ? { status: status as OrderStatus } : {}),
      ...(driverId ? { driverId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(paymentType ? { paymentType: paymentType as any } : {}),
      // Hudud bo'yicha filtr (mijozning hududi)
      ...(zone ? { customer: { zone } } : {}),
      // Sana oralig'i — O'ZBEKISTON kuni bo'yicha (localDayRange), UTC emas
      // (overdue rejimida ishlatilmaydi — u o'z createdAt filtriga ega)
      ...((dateFrom || dateTo) && !overdue
        ? {
            createdAt: {
              ...(dateFrom ? { gte: localDayRange(new Date(dateFrom)).start } : {}),
              ...(dateTo ? { lte: localDayRange(new Date(dateTo)).end } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: /^#?\d{1,5}$/.test(search.trim())
              ? [
                  // Qisqa raqam ("#12" yoki "12") — FAQAT aniq sanoq raqam
                  { seq: parseInt(search.trim().replace("#", ""), 10) },
                ]
              : [
                  { orderNumber: { contains: search, mode: "insensitive" as const } },
                  { customer: { name: { contains: search, mode: "insensitive" as const } } },
                  { customer: { phone: { contains: search } } },
                ],
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
          customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true } },
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
        customer: { select: { id: true, name: true, phone: true, phone2: true, address: true, balance: true, zone: true, locationLink: true, lat: true, lng: true } },
        driver: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
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

  async updateStatus(id: string, dto: UpdateStatusDto, userId: string, userRole: string) {
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
    let effectivePayment: "CASH" | "CARD" | "DEBT" | null =
      (order.paymentType as any) ?? null;
    let applyDebtNow = false; // nasiya balansini SHU yetkazishda yozish kerakmi
    if (dto.status === "DELIVERED") {
      if (!order.paymentType) {
        if (!dto.paymentType) {
          throw new BadRequestException("To'lov turini tanlang: naqd, karta yoki nasiya");
        }
        effectivePayment = dto.paymentType;
        applyDebtNow = dto.paymentType === "DEBT";
      } else if (dto.paymentType && dto.paymentType !== order.paymentType) {
        throw new BadRequestException(
          "Bu buyurtmada to'lov turi avvaldan belgilangan — o'zgartirib bo'lmaydi"
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: {
          status: dto.status as OrderStatus,
          ...(dto.status === "DELIVERED"
            ? { deliveredAt: new Date(), paymentType: effectivePayment as any }
            : {}),
          ...(dto.notes ? { notes: dto.notes } : {}),
        },
        include: {
          customer: { select: { id: true, name: true } },
          driver: { select: { id: true, name: true } },
        },
      });

      // TUSHUM YETKAZILGANDA yoziladi (2026-07-14): haydovchi yetkazib,
      // naqd/karta pulini olganда moliyaga kirim tushadi. Yaratilganda EMAS.
      // - DEBT: INCOME yozilMAYDI — pul mijoz qarzini to'laganda keladi
      //   (customers.addPayment "Qarz to'lovi"). Ikki marta hisoblanmasin.
      // - Idempotent: eski (o'tish davri) buyurtmalarda kirim yaratishда
      //   yozilgan bo'lishi mumkin — bor bo'lsa qayta yozilmaydi.
      if (dto.status === "DELIVERED" && effectivePayment && effectivePayment !== "DEBT") {
        const existing = await tx.transaction.findFirst({
          where: { orderId: id, type: "INCOME" },
          select: { id: true },
        });
        if (!existing) {
          await tx.transaction.create({
            data: {
              type: "INCOME",
              amount: order.totalAmount,
              paymentMethod: effectivePayment === "CASH" ? "CASH" : "CARD",
              category: "Suv sotuvi",
              description: `${result.customer.name} — buyurtma #${result.seq} yetkazildi`,
              orderId: id,
              customerId: order.customerId,
              createdById: userId,
            },
          });
        }
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
        customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true } },
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

  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");

    if (!["NEW", "PROCESSING"].includes(order.status)) {
      throw new BadRequestException("Faqat yangi yoki jarayondagi buyurtmani tahrirlash mumkin");
    }

    // Tara/narx o'zgarishi murakkab — faqat izoh tahrirlanadi.
    // Boshqa o'zgarish kerak bo'lsa: bekor qilib, qayta yarating.
    return this.prisma.order.update({
      where: { id },
      data: { notes: dto.notes },
      include: {
        customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true } },
        driver: { select: { id: true, name: true } },
      },
    });
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
