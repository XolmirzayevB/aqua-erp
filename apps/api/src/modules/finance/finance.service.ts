import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { QueryFinanceDto, SummaryQueryDto } from "./dto/query-finance.dto";
import { Prisma, TransactionType } from "@aqua/database";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachMonthOfInterval, format,
} from "date-fns";

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTransactionDto, createdById: string) {
    return this.prisma.transaction.create({
      data: {
        type: dto.type as TransactionType,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod as any,
        category: dto.category,
        description: dto.description,
        createdById,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  // Xarajat kiritish — haydovchi o'ziniki uchun ham ishlaydi.
  // createdById orqali KIM kiritgani doim ko'rinadi; haydovchi kiritgani
  // izohda "(haydovchi)" belgisi bilan ajralib turadi.
  async createExpense(dto: CreateExpenseDto, user: { sub: string; role: string }) {
    const isDriver = user.role === "DRIVER";
    const description = [
      dto.description?.trim() || null,
      isDriver ? "(haydovchi)" : null,
    ].filter(Boolean).join(" ") || null;

    return this.prisma.transaction.create({
      data: {
        type: "EXPENSE" as TransactionType,
        amount: dto.amount,
        paymentMethod: (dto.paymentMethod ?? "CASH") as any,
        category: dto.category?.trim() || (isDriver ? "Haydovchi xarajati" : "Boshqa"),
        description,
        createdById: user.sub,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  // Foydalanuvchining BUGUNGI (O'zbekiston kuni, UTC+5) o'z xarajatlari
  async getMyTodayExpenses(userId: string) {
    const TZ_MS = 5 * 60 * 60 * 1000; // Asia/Tashkent, DST yo'q
    const local = new Date(Date.now() + TZ_MS);
    local.setUTCHours(0, 0, 0, 0);
    const start = new Date(local.getTime() - TZ_MS);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

    const data = await this.prisma.transaction.findMany({
      where: { createdById: userId, type: "EXPENSE", createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      select: { id: true, amount: true, category: true, description: true, createdAt: true },
    });
    return {
      data,
      total: data.reduce((s, t) => s + Number(t.amount), 0),
    };
  }

  async findAll(query: QueryFinanceDto) {
    const { type, paymentMethod, category, dateFrom, dateTo, page = 1, limit = 20 } = query;

    const where: Prisma.TransactionWhereInput = {
      ...(type ? { type: type as TransactionType } : {}),
      ...(paymentMethod ? { paymentMethod: paymentMethod as any } : {}),
      ...(category ? { category: { contains: category, mode: "insensitive" } } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          order: { select: { id: true, orderNumber: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getSummary(query: SummaryQueryDto) {
    const now = new Date();
    let from: Date, to: Date;

    switch (query.period) {
      case "daily":   from = startOfDay(now); to = endOfDay(now); break;
      case "weekly":  from = startOfWeek(now, { weekStartsOn: 1 }); to = endOfWeek(now, { weekStartsOn: 1 }); break;
      case "yearly":  from = startOfYear(now); to = endOfYear(now); break;
      default:        from = startOfMonth(now); to = endOfMonth(now);
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: from, lte: to } },
    });

    const sum = (filter: (t: any) => boolean) =>
      transactions.filter(filter).reduce((s, t) => s + Number(t.amount), 0);

    const income = sum((t) => t.type === "INCOME");
    const expense = sum((t) => t.type === "EXPENSE");
    const salary = sum((t) => t.type === "SALARY");
    const supplier = sum((t) => t.type === "SUPPLIER_PAYMENT");
    const totalOut = expense + salary + supplier;

    const cashIn = sum((t) => t.type === "INCOME" && t.paymentMethod === "CASH");
    const cardIn = sum((t) => t.type === "INCOME" && t.paymentMethod === "CARD");

    // Chart data
    const isYearly = query.period === "yearly";
    const buckets = isYearly
      ? eachMonthOfInterval({ start: from, end: to })
      : eachDayOfInterval({ start: from, end: to });

    const chart = buckets.map((b) => {
      const fmt = isYearly ? "yyyy-MM" : "yyyy-MM-dd";
      const label = isYearly ? format(b, "MMM") : format(b, "dd.MM");
      const bucketTxns = transactions.filter(
        (t) => format(new Date(t.createdAt), fmt) === format(b, fmt)
      );
      return {
        label,
        income: bucketTxns.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0),
        expense: bucketTxns.filter((t) => t.type !== "INCOME").reduce((s, t) => s + Number(t.amount), 0),
      };
    });

    return {
      income, expense, salary, supplier,
      totalOut,
      profit: income - totalOut,
      cashIn, cardIn,
      transactionCount: transactions.length,
      chart,
      period: { from, to },
    };
  }

  async getCategories() {
    const cats = await this.prisma.transaction.groupBy({
      by: ["category", "type"],
      where: { category: { not: null } },
      _sum: { amount: true },
      _count: { id: true },
    });
    return cats.map((c) => ({
      category: c.category,
      type: c.type,
      total: Number(c._sum.amount ?? 0),
      count: c._count.id,
    }));
  }

  // ─── Debts ─────────────────────────────────────────────────────────────────

  async getDebts(page = 1, limit = 20, search?: string) {
    const where: Prisma.CustomerWhereInput = {
      balance: { lt: 0 },
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total, totalDebtAgg] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { balance: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, phone: true, address: true, balance: true,
          payments: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, amount: true } },
        },
      }),
      this.prisma.customer.count({ where }),
      this.prisma.customer.aggregate({
        where: { balance: { lt: 0 }, isActive: true },
        _sum: { balance: true },
      }),
    ]);

    return {
      data: data.map((c) => ({
        ...c,
        debt: Math.abs(Number(c.balance)),
        lastPayment: c.payments[0] ?? null,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      totalDebt: Math.abs(Number(totalDebtAgg._sum.balance ?? 0)),
    };
  }
}
