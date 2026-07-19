import {
  Injectable, NotFoundException, ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { QueryCustomersDto } from "./dto/query-customers.dto";
import { AddPaymentDto } from "./dto/add-payment.dto";
import { CreateLocationDto, UpdateLocationDto } from "./dto/location.dto";
import { Prisma } from "@aqua/database";
import { parseLatLngFromUrl, resolveLatLng } from "../../common/utils/geo.util";

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // Lokatsiya linkidan lat/lng ni ajratish (xarita/marshrut uchun).
  // To'g'ridan-to'g'ri parse tez; qisqa havola bo'lsa redirect kuzatiladi (timeout bilan).
  private async geoFromLink(locationLink?: string | null) {
    if (!locationLink) return {};
    try {
      const coords = parseLatLngFromUrl(locationLink) || (await resolveLatLng(locationLink));
      return coords ? { lat: coords.lat, lng: coords.lng } : {};
    } catch {
      return {};
    }
  }

  // Lokatsiya havolasi bor, lekin koordinatasi yo'q BARCHA mijozlarni
  // bir yo'la hal qilish (admin tugmasi/endpoint uchun).
  async resolveAllLocations() {
    const pending = await this.prisma.customer.findMany({
      // Bo'sh satr ('') havola emas — faqat haqiqiy havolalar
      where: { locationLink: { not: null }, NOT: { locationLink: "" }, lat: null },
      select: { id: true, name: true, locationLink: true },
    });

    let resolved = 0;
    const failed: string[] = [];
    for (const c of pending) {
      const geo = await this.geoFromLink(c.locationLink);
      if ("lat" in geo) {
        await this.prisma.customer.update({ where: { id: c.id }, data: geo });
        resolved++;
      } else {
        failed.push(c.name);
      }
    }
    return { total: pending.length, resolved, failed };
  }

  async create(dto: CreateCustomerDto, userId: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { phone: dto.phone },
    });
    // Kim ekanini aytamiz — operator "Mavjud mijoz"dan qidirib topsin
    if (existing) {
      throw new ConflictException(
        existing.isActive
          ? `Bu raqam allaqachon "${existing.name}" mijoziga yozilgan${existing.zone ? ` (${existing.zone} hudud)` : ""} — yangi mijoz yaratish shart emas, "Mavjud mijoz"dan qidiring`
          : `Bu raqam arxivlangan (o'chirilgan) mijoz "${existing.name}"da yozilgan — boshqa raqam kiriting yoki adminga ayting`,
      );
    }

    const geo = dto.lat == null ? await this.geoFromLink(dto.locationLink) : {};

    return this.prisma.customer.create({
      data: { ...dto, ...geo, createdById: userId },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async findAll(query: QueryCustomersDto) {
    const { search, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", debtorsOnly, zone } = query;

    const where: Prisma.CustomerWhereInput = {
      isActive: true,
      ...(debtorsOnly ? { balance: { lt: 0 } } : {}),
      ...(zone ? { zone } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              { phone2: { contains: search } },
              { address: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
          _count: { select: { orders: true } },
          // Zakaz formasi mijoz tanlanganda manzillarini ko'rsatadi
          locations: { orderBy: { createdAt: "asc" } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { orders: true, payments: true } },
        locations: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!customer) throw new NotFoundException("Mijoz topilmadi");
    return customer;
  }

  // ── Qo'shimcha manzillar (Uy, Apteka...) ──────────────────────────────────

  async addLocation(customerId: string, dto: CreateLocationDto) {
    await this.assertExists(customerId);
    // Havoladan koordinata ajratamiz (xarita/navigatsiya uchun)
    const geo = dto.lat == null ? await this.geoFromLink(dto.locationLink) : {};
    return this.prisma.customerLocation.create({
      data: { ...dto, ...geo, customerId },
    });
  }

  async updateLocation(customerId: string, locationId: string, dto: UpdateLocationDto) {
    const loc = await this.prisma.customerLocation.findFirst({
      where: { id: locationId, customerId },
    });
    if (!loc) throw new NotFoundException("Manzil topilmadi");
    // Havola o'zgargan bo'lsa koordinatani qayta ajratamiz
    const geo =
      dto.locationLink && dto.locationLink !== loc.locationLink && dto.lat == null
        ? { lat: null, lng: null, ...(await this.geoFromLink(dto.locationLink)) }
        : {};
    return this.prisma.customerLocation.update({
      where: { id: locationId },
      data: { ...dto, ...geo },
    });
  }

  async removeLocation(customerId: string, locationId: string) {
    const loc = await this.prisma.customerLocation.findFirst({
      where: { id: locationId, customerId },
    });
    if (!loc) throw new NotFoundException("Manzil topilmadi");
    // Eski buyurtmalar tarixi buzilmasin: FK ON DELETE SET NULL —
    // o'chirilsa buyurtmadagi locationId bo'shaydi (asosiy manzilga qaytadi).
    await this.prisma.customerLocation.delete({ where: { id: locationId } });
    return { message: "Manzil o'chirildi" };
  }

  // Yo'qolayotgan mijozlar: oxirgi buyurtmasi `days` kundan oldin bo'lganlar.
  // Faqat avval zakaz bergan (endi to'xtagan) aktiv mijozlar; eng uzoq to'xtagani birinchi.
  async getInactive(days = 14, page = 1, limit = 20) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Har mijozning oxirgi (bekor qilinmagan) buyurtma sanasi
    const grouped = await this.prisma.order.groupBy({
      by: ["customerId"],
      where: { status: { not: "CANCELLED" } },
      _max: { createdAt: true },
    });

    // Faqat aktiv mijozlar hisobga olinadi
    const active = await this.prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const activeSet = new Set(active.map((c) => c.id));

    const stale = grouped
      .filter((g) => activeSet.has(g.customerId) && g._max.createdAt && g._max.createdAt < cutoff)
      .sort((a, b) => a._max.createdAt!.getTime() - b._max.createdAt!.getTime());

    const total = stale.length;
    const pageItems = stale.slice((page - 1) * limit, page * limit);
    const ids = pageItems.map((s) => s.customerId);

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, phone: true, phone2: true, address: true, zone: true, balance: true, bottlesOwned: true },
    });
    const map = new Map(customers.map((c) => [c.id, c]));

    const now = Date.now();
    const data = pageItems
      .map((s) => {
        const c = map.get(s.customerId);
        if (!c) return null;
        const last = s._max.createdAt!;
        return { ...c, lastOrderAt: last, daysSince: Math.floor((now - last.getTime()) / 86400000) };
      })
      .filter(Boolean);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) }, days };
  }

  async getOrders(id: string, page = 1, limit = 10) {
    await this.assertExists(id);

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { driver: { select: { id: true, name: true } } },
      }),
      this.prisma.order.count({ where: { customerId: id } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getPayments(id: string, page = 1, limit = 10) {
    await this.assertExists(id);

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where: { customerId: id } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async addPayment(id: string, dto: AddPaymentDto, user: { sub: string; role: string }) {
    const customer = await this.assertExists(id);

    // Haydovchi ham qarzdor mijozdan to'lov qabul qila oladi (yetkazganда yoki
    // qarzdorlar ro'yxatidan). Kim qabul qilgani tranzaksiyada saqlanadi.

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: { customerId: id, amount: dto.amount, method: dto.method as any, notes: dto.notes },
      }),
      this.prisma.customer.update({
        where: { id },
        data: { balance: { increment: dto.amount } },
      }),
      this.prisma.transaction.create({
        data: {
          type: "INCOME",
          amount: dto.amount,
          paymentMethod: dto.method as any,
          category: "Qarz to'lovi",
          description: `${customer.name} dan qarz to'lovi${user.role === "DRIVER" ? " (haydovchi)" : ""}`,
          customerId: id,
          createdById: user.sub,
        },
      }),
      // ISHCHI BALANSI (2026-07-19): qarz puli QABUL QILGAN ishchining qo'lida —
      // naqd bo'lsa naqdiga, karta (Klik) bo'lsa klik balansiga qo'shiladi.
      this.prisma.user.update({
        where: { id: user.sub },
        data:
          dto.method === "CASH"
            ? { cashBalance: { increment: dto.amount } }
            : { clickBalance: { increment: dto.amount } },
      }),
    ]);

    return payment;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.assertExists(id);
    if (dto.phone) {
      const conflict = await this.prisma.customer.findFirst({
        where: { phone: dto.phone, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(
          `Bu raqam boshqa mijozga — "${conflict.name}"${conflict.zone ? ` (${conflict.zone} hudud)` : ""} — yozilgan, shu raqamda ikkita mijoz bo'lmaydi`,
        );
      }
    }
    // Lokatsiya linki o'zgargan bo'lsa — koordinatani qayta ajratamiz
    const geo = dto.locationLink && dto.lat == null ? await this.geoFromLink(dto.locationLink) : {};
    return this.prisma.customer.update({ where: { id }, data: { ...dto, ...geo } });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.customer.update({ where: { id }, data: { isActive: false } });
    return { message: "Mijoz o'chirildi" };
  }

  async getStats(id: string) {
    await this.assertExists(id);

    const [totalSpent, orderStats, lastOrder] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { customerId: id, type: "INCOME" },
        _sum: { amount: true },
      }),
      this.prisma.order.groupBy({
        by: ["status"],
        where: { customerId: id },
        _count: { id: true },
      }),
      this.prisma.order.findFirst({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, status: true },
      }),
    ]);

    return {
      totalSpent: Number(totalSpent._sum.amount ?? 0),
      orderStats: Object.fromEntries(orderStats.map((s) => [s.status, s._count.id])),
      lastOrder,
    };
  }

  private async assertExists(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException("Mijoz topilmadi");
    return customer;
  }
}
