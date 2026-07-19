import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { QueryFinanceDto, SummaryQueryDto } from "./dto/query-finance.dto";
import { Prisma, TransactionType } from "@aqua/database";
import {
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachMonthOfInterval, format,
} from "date-fns";
import { localDayRange, toLocal, fromLocal } from "../../common/utils/date.util";

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
  //
  // ISHCHI BALANSI (2026-07-19): xarajat KIMNING PULIDAN qilinganini
  // operator/admin tanlaydi (dto.sourceUserId — masalan haydovchi puli;
  // haydovchi "o'zim yozmayman, operatorga aytaman" degan). Tanlanmasa —
  // kirituvchining o'zi. Pul manba balansidan (naqd/klik) AYIRILADI;
  // balansda yetarli pul bo'lmasa xarajat qabul qilinmaydi.
  async createExpense(dto: CreateExpenseDto, user: { sub: string; role: string }) {
    const isDriver = user.role === "DRIVER";
    const isOperator = user.role === "OPERATOR";
    const method = (dto.paymentMethod ?? "CASH") as "CASH" | "CARD";
    const isCash = method === "CASH";

    // Boshqa ishchi pulini manba qilish — faqat operator/admin huquqi
    const sourceUserId =
      dto.sourceUserId && (user.role === "ADMIN" || isOperator)
        ? dto.sourceUserId
        : user.sub;
    const source = await this.prisma.user.findUnique({
      where: { id: sourceUserId },
      select: { id: true, name: true, isActive: true },
    });
    if (!source || !source.isActive) throw new NotFoundException("Manba ishchi topilmadi");

    const description = [
      dto.description?.trim() || null,
      isDriver ? "(haydovchi)" : isOperator ? "(operator)" : null,
      // Kimning pulidan ketgani doim izohda ko'rinadi
      sourceUserId !== user.sub ? `— pul: ${source.name} (${isCash ? "naqd" : "klik"})` : null,
    ].filter(Boolean).join(" ") || null;

    return this.prisma.$transaction(async (tx) => {
      // Atomar ayirish — balans yetarli bo'lsagina (poyga xavfsiz)
      const res = await tx.user.updateMany({
        where: {
          id: sourceUserId,
          ...(isCash
            ? { cashBalance: { gte: dto.amount } }
            : { clickBalance: { gte: dto.amount } }),
        },
        data: isCash
          ? { cashBalance: { decrement: dto.amount } }
          : { clickBalance: { decrement: dto.amount } },
      });
      if (res.count === 0) {
        throw new BadRequestException(
          `${sourceUserId === user.sub ? "Balansingizda" : `${source.name} balansida`} yetarli ${isCash ? "naqd" : "klik"} pul yo'q — xarajat balansdagi puldan qilinadi`,
        );
      }

      return tx.transaction.create({
        data: {
          type: "EXPENSE" as TransactionType,
          amount: dto.amount,
          paymentMethod: method as any,
          category: dto.category?.trim() || (isDriver ? "Haydovchi xarajati" : "Boshqa"),
          description,
          createdById: user.sub,
        },
        include: { createdBy: { select: { id: true, name: true } } },
      });
    });
  }

  // Foydalanuvchining BUGUNGI (O'zbekiston kuni) o'z xarajatlari
  async getMyTodayExpenses(userId: string) {
    const { start, end } = localDayRange();

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
    // Oraliqlar O'zbekiston kuni bo'yicha (date.util.ts)
    const localNow = toLocal(new Date());
    let from: Date, to: Date;

    switch (query.period) {
      case "daily": { const r = localDayRange(); from = r.start; to = r.end; break; }
      case "weekly":  from = fromLocal(startOfWeek(localNow, { weekStartsOn: 1 })); to = fromLocal(endOfWeek(localNow, { weekStartsOn: 1 })); break;
      case "yearly":  from = fromLocal(startOfYear(localNow)); to = fromLocal(endOfYear(localNow)); break;
      default:        from = fromLocal(startOfMonth(localNow)); to = fromLocal(endOfMonth(localNow));
    }

    const [transactions, pendingAgg, pendingClickAgg, freeAgg] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { createdAt: { gte: from, lte: to } },
      }),
      // YO'LDAGI (yetkazilmagan) zakazlar — kutilayotgan pul.
      // Tushum yetkazilganda yoziladi; bu — hali kelmagani (sanasidan qat'i nazar).
      this.prisma.order.aggregate({
        where: { status: { in: ["NEW", "PROCESSING", "ASSIGNED"] as any } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // KUTILAYOTGAN KLIK (snapshot, sanasidan qat'i nazar): yetkazilgan, Karta
      // (Click), operator hali tasdiqlamagan — Kirimга KIRMAGAN pul.
      this.prisma.order.aggregate({
        where: { status: "DELIVERED" as any, paymentType: "CARD" as any, cardConfirmedAt: null },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // IMTIYOZLI (bepul) yetkazilganlar — davr bo'yicha (tushumga kirmaydi,
      // lekin egasi qancha "sovg'a" ketganini bilib turishi kerak)
      this.prisma.order.aggregate({
        where: {
          paymentType: "FREE" as any,
          status: "DELIVERED" as any,
          deliveredAt: { gte: from, lte: to },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
    ]);

    const sum = (filter: (t: any) => boolean) =>
      transactions.filter(filter).reduce((s, t) => s + Number(t.amount), 0);

    const income = sum((t) => t.type === "INCOME");
    const expense = sum((t) => t.type === "EXPENSE");
    const salary = sum((t) => t.type === "SALARY");
    const supplier = sum((t) => t.type === "SUPPLIER_PAYMENT");
    const totalOut = expense + salary + supplier;

    const cashIn = sum((t) => t.type === "INCOME" && t.paymentMethod === "CASH");
    const cardIn = sum((t) => t.type === "INCOME" && t.paymentMethod === "CARD");

    // Chart data — bucket'lar LOKAL kalendar bo'yicha (from/to UTC instant,
    // toLocal bilan surilsa kun chegaralari to'g'ri kalendar kunига tushadi)
    const isYearly = query.period === "yearly";
    const buckets = isYearly
      ? eachMonthOfInterval({ start: toLocal(from), end: toLocal(to) })
      : eachDayOfInterval({ start: toLocal(from), end: toLocal(to) });

    const chart = buckets.map((b) => {
      const fmt = isYearly ? "yyyy-MM" : "yyyy-MM-dd";
      const label = isYearly ? format(b, "MMM") : format(b, "dd.MM");
      // Tranzaksiya kuni ham LOKAL bo'yicha (kechki 19:00+ dagi to'lov
      // ertangi kunga tushib qolmasin)
      const bucketTxns = transactions.filter(
        (t) => format(toLocal(new Date(t.createdAt)), fmt) === format(b, fmt)
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
      // Yo'lda (yetkazilmagan zakazlar) — kutilayotgan pul
      pendingAmount: Number(pendingAgg._sum.totalAmount ?? 0),
      pendingCount: pendingAgg._count.id,
      // Kutilayotgan Klik — tasdiqlanmagan karta to'lovlari (Kirimga kirmagan)
      pendingClickAmount: Number(pendingClickAgg._sum.totalAmount ?? 0),
      pendingClickCount: pendingClickAgg._count.id,
      // Imtiyozli (bepul) berilganlar — shu davrda
      freeAmount: Number(freeAgg._sum.totalAmount ?? 0),
      freeCount: freeAgg._count.id,
      transactionCount: transactions.length,
      chart,
      period: { from, to },
    };
  }

  // ── IMTIYOZLI (BEPUL) ZAKAZLAR HISOBOTI (2026-07-17, egasi so'rovi) ──
  // Prokuratura kabi joylarga bepul berilganlar: jami soni/tarasi/summasi
  // + KIMGA qancha berilgani (mijoz bo'yicha guruhlab, eng ko'pi birinchi).
  // period: daily/weekly/monthly/yearly yoki "all" (butun vaqt).
  async getFreeOrders(period = "monthly") {
    const localNow = toLocal(new Date());
    let from: Date | undefined, to: Date | undefined;
    switch (period) {
      case "daily": { const r = localDayRange(); from = r.start; to = r.end; break; }
      case "weekly": from = fromLocal(startOfWeek(localNow, { weekStartsOn: 1 })); to = fromLocal(endOfWeek(localNow, { weekStartsOn: 1 })); break;
      case "yearly": from = fromLocal(startOfYear(localNow)); to = fromLocal(endOfYear(localNow)); break;
      case "all": break; // butun vaqt — filtr yo'q
      default: from = fromLocal(startOfMonth(localNow)); to = fromLocal(endOfMonth(localNow));
    }

    const orders = await this.prisma.order.findMany({
      where: {
        paymentType: "FREE" as any,
        status: "DELIVERED" as any,
        ...(from ? { deliveredAt: { gte: from, lte: to } } : {}),
      },
      orderBy: { deliveredAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone: true, zone: true, customerType: true } },
        driver: { select: { name: true } },
      },
    });

    // Mijoz bo'yicha guruhlash — "kimga qancha berilgan"
    const map = new Map<string, any>();
    for (const o of orders) {
      const m = map.get(o.customerId) ?? {
        customerId: o.customerId,
        name: o.customer.name,
        phone: o.customer.phone,
        zone: o.customer.zone,
        customerType: o.customer.customerType,
        count: 0, bottles: 0, amount: 0, lastAt: null as Date | null,
      };
      m.count += 1;
      m.bottles += o.quantity;
      m.amount += Number(o.totalAmount);
      if (o.deliveredAt && (!m.lastAt || o.deliveredAt > m.lastAt)) m.lastAt = o.deliveredAt;
      map.set(o.customerId, m);
    }
    const byCustomer = [...map.values()].sort((a, b) => b.amount - a.amount);

    return {
      totalCount: orders.length,
      totalBottles: orders.reduce((s, o) => s + o.quantity, 0),
      totalAmount: orders.reduce((s, o) => s + Number(o.totalAmount), 0),
      byCustomer,
      // Oxirgi 50 tasi — tafsilot ro'yxati
      orders: orders.slice(0, 50).map((o) => ({
        id: o.id, seq: o.seq,
        customerId: o.customerId,
        customerName: o.customer.name,
        quantity: o.quantity,
        totalAmount: Number(o.totalAmount),
        deliveredAt: o.deliveredAt,
        driverName: o.driver?.name ?? null,
      })),
      period: { from: from ?? null, to: to ?? null },
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
