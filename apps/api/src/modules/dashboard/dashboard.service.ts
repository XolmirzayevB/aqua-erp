import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { OrderStatus } from "@aqua/database";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [
      todayOrders,
      deliveredToday,
      cancelledToday,
      debtors,
      totalCustomers,
      emptyBottleInv,
      todayTransactions,
      monthTransactions,
      recentOrders,
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED, deliveredAt: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED, updatedAt: { gte: todayStart, lte: todayEnd } } }),
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
