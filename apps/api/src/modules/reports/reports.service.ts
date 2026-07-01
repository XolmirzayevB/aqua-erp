import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ReportQueryDto, TopQueryDto } from "./dto/query-report.dto";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
} from "date-fns";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private getRange(period?: string, dateFrom?: string, dateTo?: string) {
    if (dateFrom && dateTo) {
      return { from: startOfDay(new Date(dateFrom)), to: endOfDay(new Date(dateTo)) };
    }
    const now = new Date();
    switch (period) {
      case "daily":  return { from: startOfDay(now), to: endOfDay(now) };
      case "weekly": return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case "yearly": return { from: startOfYear(now), to: endOfYear(now) };
      default:       return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  }

  // Overall report for a period
  async getOverview(query: ReportQueryDto) {
    const { from, to } = this.getRange(query.period, query.dateFrom, query.dateTo);

    const [
      orders, deliveredCount, cancelledCount,
      transactions, sessions, newCustomers,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { quantity: true, totalAmount: true, status: true, bottlesReturned: true },
      }),
      this.prisma.order.count({ where: { status: "DELIVERED", deliveredAt: { gte: from, lte: to } } }),
      this.prisma.order.count({ where: { status: "CANCELLED", updatedAt: { gte: from, lte: to } } }),
      this.prisma.transaction.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { type: true, amount: true },
      }),
      this.prisma.driverSession.findMany({
        where: { date: { gte: from, lte: to } },
        select: { bottlesSold: true, emptyReturned: true, bottlesTaken: true },
      }),
      this.prisma.customer.count({ where: { createdAt: { gte: from, lte: to } } }),
    ]);

    const income = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type !== "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const waterSold = orders.reduce((s, o) => s + o.quantity, 0);
    const bottlesReturned = orders.reduce((s, o) => s + o.bottlesReturned, 0);

    return {
      orders: {
        total: orders.length,
        delivered: deliveredCount,
        cancelled: cancelledCount,
        revenue: orders.filter(o => o.status === "DELIVERED").reduce((s, o) => s + Number(o.totalAmount), 0),
      },
      finance: {
        income,
        expense,
        profit: income - expense,
      },
      water: {
        sold: waterSold,
        bottlesReturned,
      },
      bottles: {
        soldBySessions: sessions.reduce((s, x) => s + x.bottlesSold, 0),
        emptyReturned: sessions.reduce((s, x) => s + x.emptyReturned, 0),
        takenBySessions: sessions.reduce((s, x) => s + x.bottlesTaken, 0),
      },
      newCustomers,
      period: { from, to },
    };
  }

  // Top customers by spending
  async getTopCustomers(query: TopQueryDto) {
    const { from, to } = this.getRange(query.period);

    const grouped = await this.prisma.transaction.groupBy({
      by: ["customerId"],
      where: {
        type: "INCOME",
        customerId: { not: null },
        createdAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take: query.limit,
    });

    const customerIds = grouped.map((g) => g.customerId!).filter(Boolean);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true },
    });
    const map = Object.fromEntries(customers.map((c) => [c.id, c]));

    return grouped.map((g) => ({
      customer: map[g.customerId!],
      totalSpent: Number(g._sum.amount ?? 0),
      transactionCount: g._count.id,
    }));
  }

  // Top drivers by revenue
  async getTopDrivers(query: TopQueryDto) {
    const { from, to } = this.getRange(query.period);

    const sessions = await this.prisma.driverSession.groupBy({
      by: ["driverId"],
      where: { date: { gte: from, lte: to }, status: "CLOSED" },
      _sum: { bottlesSold: true, cashCollected: true, cardCollected: true },
      _count: { id: true },
    });

    const driverIds = sessions.map((s) => s.driverId);
    const drivers = await this.prisma.user.findMany({
      where: { id: { in: driverIds } },
      select: { id: true, name: true, phone: true },
    });
    const map = Object.fromEntries(drivers.map((d) => [d.id, d]));

    return sessions
      .map((s) => ({
        driver: map[s.driverId],
        bottlesSold: s._sum.bottlesSold ?? 0,
        revenue: Number(s._sum.cashCollected ?? 0) + Number(s._sum.cardCollected ?? 0),
        workDays: s._count.id,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, query.limit);
  }

  // Top regions (by address parsing — first word as district)
  async getTopRegions(query: TopQueryDto) {
    const { from, to } = this.getRange(query.period);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to }, status: "DELIVERED" },
      select: { totalAmount: true, customer: { select: { address: true } } },
    });

    const regionMap = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      const region = (o.customer.address || "Noma'lum").split(/[,\s]/)[0] || "Noma'lum";
      const cur = regionMap.get(region) || { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += Number(o.totalAmount);
      regionMap.set(region, cur);
    }

    return Array.from(regionMap.entries())
      .map(([region, data]) => ({ region, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, query.limit);
  }

  // Qarz to'lovlari — kim qancha to'lagani (davr bo'yicha)
  async getDebtPayments(query: ReportQueryDto) {
    const { from, to } = this.getRange(query.period, query.dateFrom, query.dateTo);

    const payments = await this.prisma.payment.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true, phone: true, balance: true } } },
    });

    const total = payments.reduce((s, p) => s + Number(p.amount), 0);
    const cash = payments.filter((p) => p.method === "CASH").reduce((s, p) => s + Number(p.amount), 0);
    const card = payments.filter((p) => p.method === "CARD").reduce((s, p) => s + Number(p.amount), 0);

    return {
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        notes: p.notes,
        createdAt: p.createdAt,
        customer: p.customer
          ? { ...p.customer, balance: Number(p.customer.balance) }
          : null,
      })),
      summary: { total, cash, card, count: payments.length },
      period: { from, to },
    };
  }

  // Aggregated data for export (returns flat rows)
  async getExportData(query: ReportQueryDto) {
    const { from, to } = this.getRange(query.period, query.dateFrom, query.dateTo);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, phone: true } },
        driver: { select: { name: true } },
      },
    });

    return { orders, period: { from, to } };
  }
}
