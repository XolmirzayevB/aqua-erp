import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { OrderStatus } from "@aqua/database";
import { startOfMonth, endOfMonth } from "date-fns";
import { localDayRange, toLocal, fromLocal } from "../../common/utils/date.util";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    // "Bugun" — O'zbekiston kuni (UTC emas!). Aks holda ertalab soat 5 gacha
    // kechagi sonlar ko'rinib turadi (egasi 2026-07-14 da shu xatoni ko'rgan).
    const { start: todayStart, end: todayEnd } = localDayRange();
    const localNow = toLocal(new Date());
    const monthStart = fromLocal(startOfMonth(localNow));
    const monthEnd = fromLocal(endOfMonth(localNow));

    const OPEN_STATUSES = [OrderStatus.NEW, OrderStatus.PROCESSING, OrderStatus.ASSIGNED];

    const [
      todayOrders,
      deliveredToday,
      cancelledToday,
      pendingAgg,
      debtors,
      totalCustomers,
      emptyBottleInv,
      todayTransactions,
      monthTransactions,
      recentOrders,
    ] = await Promise.all([
      // Bugun yozilgan buyurtmalar (bekor qilinganlar sanalmaydi)
      this.prisma.order.count({
        where: { createdAt: { gte: todayStart, lte: todayEnd }, status: { not: OrderStatus.CANCELLED } },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED, deliveredAt: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED, updatedAt: { gte: todayStart, lte: todayEnd } } }),
      // YO'LDAGI zakazlar (sanasidan qat'i nazar) — soni va KUTILAYOTGAN pul.
      // Tushum endi yetkazilganda yoziladi; bu ko'rsatkich "hali kelmagan pul".
      this.prisma.order.aggregate({
        where: { status: { in: OPEN_STATUSES } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.customer.findMany({ where: { balance: { lt: 0 }, isActive: true }, select: { balance: true } }),
      this.prisma.customer.count({ where: { isActive: true } }),
      this.prisma.inventory.findFirst({ where: { type: "EMPTY_BOTTLE" } }),
      this.prisma.transaction.aggregate({
        where: { type: "INCOME", createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: "INCOME", createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true } } },
      }),
    ]);

    return {
      todayOrders,
      deliveredToday,
      cancelledToday,
      // Yo'lda (yetkazilmagan) — soni istalgan kundan bo'lishi mumkin
      pendingCount: pendingAgg._count.id,
      pendingAmount: Number(pendingAgg._sum.totalAmount ?? 0),
      debtorCount: debtors.length,
      // Balanslar manfiy — qarz miqdori musbat ko'rsatiladi
      totalDebt: Math.abs(debtors.reduce((sum, d) => sum + Number(d.balance), 0)),
      totalCustomers,
      emptyBottles: emptyBottleInv?.quantity ?? 0,
      todayIncome: Number(todayTransactions._sum.amount ?? 0),
      monthIncome: Number(monthTransactions._sum.amount ?? 0),
      recentOrders,
    };
  }
}
