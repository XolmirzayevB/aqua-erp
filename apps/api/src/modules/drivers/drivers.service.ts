import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateDriverDto } from "./dto/create-driver.dto";
import { OpenSessionDto } from "./dto/open-session.dto";
import { CloseSessionDto } from "./dto/close-session.dto";
import { QueryReportDto } from "./dto/query-report.dto";
import { Role } from "@aqua/database";
import * as bcrypt from "bcrypt";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subDays, format, eachDayOfInterval,
} from "date-fns";

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  // ─── Driver CRUD ────────────────────────────────────────────────────────────

  async create(dto: CreateDriverDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException("Bu telefon raqam allaqachon mavjud");

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        passwordHash,
        role: Role.DRIVER,
      },
      select: { id: true, name: true, phone: true, role: true, isActive: true, createdAt: true },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { role: Role.DRIVER },
      select: {
        id: true, name: true, phone: true, role: true, isActive: true, createdAt: true,
        _count: { select: { orders: true, driverSessions: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string) {
    const driver = await this.prisma.user.findFirst({
      where: { id, role: Role.DRIVER },
      select: {
        id: true, name: true, phone: true, role: true, isActive: true, createdAt: true,
        _count: { select: { orders: true, driverSessions: true } },
      },
    });
    if (!driver) throw new NotFoundException("Haydovchi topilmadi");
    return driver;
  }

  async toggleActive(id: string) {
    const driver = await this.prisma.user.findFirst({ where: { id, role: Role.DRIVER } });
    if (!driver) throw new NotFoundException("Haydovchi topilmadi");
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !driver.isActive },
      select: { id: true, name: true, isActive: true },
    });
  }

  // ─── Sessions ────────────────────────────────────────────────────────────────

  async openSession(driverId: string, dto: OpenSessionDto) {
    await this.assertDriver(driverId);

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const existing = await this.prisma.driverSession.findUnique({
      where: { driverId_date: { driverId, date: todayDate } },
    });
    if (existing) {
      if (existing.status === "OPEN") throw new BadRequestException("Bugun uchun sessiya allaqachon ochiq");
      throw new BadRequestException("Bugun uchun sessiya allaqachon yopilgan");
    }

    // Deduct from inventory
    await this.prisma.$transaction([
      this.prisma.driverSession.create({
        data: {
          driverId,
          date: todayDate,
          bottlesTaken: dto.bottlesTaken,
          emptyTaken: dto.emptyTaken,
          notes: dto.notes,
          status: "OPEN",
        },
      }),
      this.prisma.inventory.updateMany({
        where: { type: "FULL_BOTTLE" },
        data: { quantity: { decrement: dto.bottlesTaken } },
      }),
      this.prisma.inventory.updateMany({
        where: { type: "EMPTY_BOTTLE" },
        data: { quantity: { decrement: dto.emptyTaken } },
      }),
    ]);

    return this.prisma.driverSession.findUnique({
      where: { driverId_date: { driverId, date: todayDate } },
    });
  }

  async closeSession(driverId: string, dto: CloseSessionDto) {
    await this.assertDriver(driverId);

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const session = await this.prisma.driverSession.findUnique({
      where: { driverId_date: { driverId, date: todayDate } },
    });
    if (!session) throw new NotFoundException("Bugun uchun ochiq sessiya topilmadi");
    if (session.status === "CLOSED") throw new BadRequestException("Sessiya allaqachon yopilgan");

    const unsoldBottles = session.bottlesTaken - dto.bottlesSold;

    await this.prisma.$transaction([
      this.prisma.driverSession.update({
        where: { id: session.id },
        data: {
          bottlesSold: dto.bottlesSold,
          emptyReturned: dto.emptyReturned,
          cashCollected: dto.cashCollected,
          cardCollected: dto.cardCollected,
          notes: dto.notes,
          status: "CLOSED",
          closedAt: new Date(),
        },
      }),
      // Return unsold full bottles to inventory
      this.prisma.inventory.updateMany({
        where: { type: "FULL_BOTTLE" },
        data: { quantity: { increment: unsoldBottles > 0 ? unsoldBottles : 0 } },
      }),
      // Return empty bottles collected during delivery
      this.prisma.inventory.updateMany({
        where: { type: "EMPTY_BOTTLE" },
        data: { quantity: { increment: dto.emptyReturned } },
      }),
    ]);

    return this.prisma.driverSession.findUnique({ where: { id: session.id } });
  }

  async getTodaySession(driverId: string) {
    await this.assertDriver(driverId);
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return this.prisma.driverSession.findUnique({
      where: { driverId_date: { driverId, date: todayDate } },
    });
  }

  async getSessions(driverId: string, limit = 30) {
    await this.assertDriver(driverId);
    return this.prisma.driverSession.findMany({
      where: { driverId },
      orderBy: { date: "desc" },
      take: limit,
    });
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  async getReport(driverId: string, query: QueryReportDto) {
    await this.assertDriver(driverId);

    let dateFrom: Date;
    let dateTo: Date;
    const now = new Date();

    if (query.dateFrom && query.dateTo) {
      dateFrom = startOfDay(new Date(query.dateFrom));
      dateTo = endOfDay(new Date(query.dateTo));
    } else {
      switch (query.period) {
        case "weekly":
          dateFrom = startOfWeek(now, { weekStartsOn: 1 });
          dateTo = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "monthly":
          dateFrom = startOfMonth(now);
          dateTo = endOfMonth(now);
          break;
        default: // daily
          dateFrom = startOfDay(now);
          dateTo = endOfDay(now);
      }
    }

    const [sessions, orders] = await Promise.all([
      this.prisma.driverSession.findMany({
        where: { driverId, date: { gte: dateFrom, lte: dateTo } },
        orderBy: { date: "asc" },
      }),
      this.prisma.order.findMany({
        where: {
          driverId,
          createdAt: { gte: dateFrom, lte: dateTo },
          status: { in: ["DELIVERED", "ASSIGNED"] },
        },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalBottlesSold = sessions.reduce((s, x) => s + x.bottlesSold, 0);
    const totalEmptyReturned = sessions.reduce((s, x) => s + x.emptyReturned, 0);
    const totalCash = sessions.reduce((s, x) => s + Number(x.cashCollected), 0);
    const totalCard = sessions.reduce((s, x) => s + Number(x.cardCollected), 0);
    const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;

    // Daily breakdown for chart
    const days = eachDayOfInterval({ start: dateFrom, end: dateTo });
    const dailyChart = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const daySession = sessions.find((s) => format(new Date(s.date), "yyyy-MM-dd") === dayStr);
      const dayOrders = orders.filter(
        (o) => format(new Date(o.createdAt), "yyyy-MM-dd") === dayStr
      );
      return {
        date: dayStr,
        label: format(day, "dd.MM"),
        bottlesSold: daySession?.bottlesSold ?? 0,
        cash: Number(daySession?.cashCollected ?? 0),
        card: Number(daySession?.cardCollected ?? 0),
        orders: dayOrders.length,
      };
    });

    return {
      summary: {
        totalBottlesSold,
        totalEmptyReturned,
        totalCash,
        totalCard,
        totalRevenue: totalCash + totalCard,
        deliveredOrders,
        totalOrders: orders.length,
        avgPerDay: sessions.length > 0 ? Math.round(totalBottlesSold / sessions.length) : 0,
      },
      sessions,
      orders,
      dailyChart,
      period: { from: dateFrom, to: dateTo },
    };
  }

  async getAllDriversReport(query: QueryReportDto) {
    const drivers = await this.prisma.user.findMany({
      where: { role: Role.DRIVER, isActive: true },
      select: { id: true, name: true, phone: true },
    });

    const results = await Promise.all(
      drivers.map(async (driver) => {
        const report = await this.getReport(driver.id, query);
        return { driver, ...report.summary };
      })
    );

    return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  private async assertDriver(id: string) {
    const driver = await this.prisma.user.findFirst({ where: { id, role: Role.DRIVER } });
    if (!driver) throw new NotFoundException("Haydovchi topilmadi");
    return driver;
  }
}
