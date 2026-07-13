import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ReportQueryDto, TopQueryDto } from "./dto/query-report.dto";
import {
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
} from "date-fns";
import { localDayRange, toLocal, fromLocal } from "../../common/utils/date.util";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Barcha oraliqlar O'ZBEKISTON kuni bo'yicha (server UTC — to'g'ridan-to'g'ri
  // startOfDay ishlatilsa hisobot kuni lokal 05:00 da almashib qolardi).
  private getRange(period?: string, dateFrom?: string, dateTo?: string) {
    if (dateFrom && dateTo) {
      // Kun tanlab ko'rish: "2026-07-13" → o'sha LOKAL kun 00:00–23:59
      return {
        from: localDayRange(new Date(dateFrom)).start,
        to: localDayRange(new Date(dateTo)).end,
      };
    }
    const localNow = toLocal(new Date());
    switch (period) {
      case "daily": {
        const { start, end } = localDayRange();
        return { from: start, to: end };
      }
      case "weekly": return { from: fromLocal(startOfWeek(localNow, { weekStartsOn: 1 })), to: fromLocal(endOfWeek(localNow, { weekStartsOn: 1 })) };
      case "yearly": return { from: fromLocal(startOfYear(localNow)), to: fromLocal(endOfYear(localNow)) };
      default:       return { from: fromLocal(startOfMonth(localNow)), to: fromLocal(endOfMonth(localNow)) };
    }
  }

  // Overall report for a period.
  // SEMANTIKA (2026-07-14): suv/tara/tushum — YETKAZILGAN sanasi (deliveredAt)
  // bo'yicha. 12-kuni yozilib 13-da yetkazilgan zakaz 13-kun hisobotida chiqadi.
  // "Buyurtma yozildi" (total) esa yozilgan sanasi bo'yicha qoladi.
  async getOverview(query: ReportQueryDto) {
    const { from, to } = this.getRange(query.period, query.dateFrom, query.dateTo);

    const [
      createdCount, deliveredOrders, cancelledCount,
      transactions, sessions, newCustomers,
    ] = await Promise.all([
      // Shu davrda YOZILGAN buyurtmalar (bekor qilinganlar sanalmaydi)
      this.prisma.order.count({
        where: { createdAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
      }),
      // Shu davrda YETKAZILGAN buyurtmalar (qachon yozilganидан qat'i nazar)
      this.prisma.order.findMany({
        where: { status: "DELIVERED", deliveredAt: { gte: from, lte: to } },
        select: { quantity: true, totalAmount: true, bottlesReturned: true, newBottles: true },
      }),
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
    // Suv/tara — yetkazilganlar asosida (real harakat)
    const waterSold = deliveredOrders.reduce((s, o) => s + o.quantity, 0);
    const bottlesReturned = deliveredOrders.reduce((s, o) => s + o.bottlesReturned, 0);
    const newBottlesSold = deliveredOrders.reduce((s, o) => s + o.newBottles, 0);

    return {
      orders: {
        total: createdCount,
        delivered: deliveredOrders.length,
        cancelled: cancelledCount,
        // Yetkazilgan zakazlar summasi (shu davrda yetkazilganlar)
        revenue: deliveredOrders.reduce((s, o) => s + Number(o.totalAmount), 0),
      },
      finance: {
        income,
        expense,
        profit: income - expense,
      },
      water: {
        sold: waterSold,
        bottlesReturned,
        newBottlesSold,
      },
      bottles: {
        // Yetkazilgan buyurtmalar asosida
        deliveredWater: waterSold,
        newSold: newBottlesSold,
        emptyBack: bottlesReturned,
        // Eski sessiya ko'rsatkichlari (moslik uchun)
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

  // Top drivers by revenue — yetkazilgan buyurtmalar asosida (sessiyasiz ish tartibi)
  async getTopDrivers(query: TopQueryDto) {
    const { from, to } = this.getRange(query.period);

    const orders = await this.prisma.order.findMany({
      where: {
        status: "DELIVERED",
        driverId: { not: null },
        deliveredAt: { gte: from, lte: to },
      },
      select: { driverId: true, quantity: true, totalAmount: true, deliveredAt: true },
    });

    const byDriver = new Map<string, { bottles: number; revenue: number; days: Set<string> }>();
    for (const o of orders) {
      const cur = byDriver.get(o.driverId!) || { bottles: 0, revenue: 0, days: new Set<string>() };
      cur.bottles += o.quantity;
      cur.revenue += Number(o.totalAmount);
      if (o.deliveredAt) cur.days.add(o.deliveredAt.toISOString().slice(0, 10));
      byDriver.set(o.driverId!, cur);
    }

    const driverIds = Array.from(byDriver.keys());
    const drivers = await this.prisma.user.findMany({
      where: { id: { in: driverIds } },
      select: { id: true, name: true, phone: true },
    });
    const map = Object.fromEntries(drivers.map((d) => [d.id, d]));

    return driverIds
      .map((id) => ({
        driver: map[id],
        bottlesSold: byDriver.get(id)!.bottles,
        revenue: byDriver.get(id)!.revenue,
        workDays: byDriver.get(id)!.days.size,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, query.limit);
  }

  // Top regions (by address parsing — first word as district)
  async getTopRegions(query: TopQueryDto) {
    const { from, to } = this.getRange(query.period);

    const orders = await this.prisma.order.findMany({
      where: { deliveredAt: { gte: from, lte: to }, status: "DELIVERED" },
      select: { totalAmount: true, customer: { select: { address: true, zone: true } } },
    });

    const regionMap = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      // Avval mijozning hududi (zone), bo'lmasa manzilning birinchi so'zi
      const region = o.customer.zone
        || (o.customer.address || "Noma'lum").split(/[,\s]/)[0]
        || "Noma'lum";
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
