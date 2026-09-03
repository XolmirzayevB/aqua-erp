import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { QueryFinanceDto, SummaryQueryDto, ExpenseReportQueryDto } from "./dto/query-finance.dto";
import { Prisma, TransactionType } from "@aqua/database";
import {
  eachDayOfInterval, eachMonthOfInterval, format,
} from "date-fns";
import { localDayRange, toLocal, periodRange } from "../../common/utils/date.util";
import { cleanExpenseNote, expenseGroupKey } from "../../common/utils/expense-group.util";

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
    // Oraliqlar O'zbekiston kuni bo'yicha (date.util.ts). dateFrom/dateTo
    // berilsa — aynan o'sha oraliq (o'tgan oylarni ko'rish uchun, 2026-09-03).
    const { from, to } = periodRange(query.period, query.dateFrom, query.dateTo);

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
    // toLocal bilan surilsa kun chegaralari to'g'ri kalendar kunига tushadi).
    // Uzun oraliq (2 oydan ko'p) OYLAR bo'yicha — aks holda chart siqilib ketadi.
    const isYearly = (to.getTime() - from.getTime()) / 86_400_000 > 62;
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
  async getFreeOrders(period = "monthly", dateFrom?: string, dateTo?: string) {
    // "all" — butun vaqt (filtrsiz); qolganlari period yoki sana oralig'i
    let from: Date | undefined, to: Date | undefined;
    if (period !== "all") {
      const r = periodRange(period, dateFrom, dateTo);
      from = r.from; to = r.to;
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

  // ─── XARAJATLAR BO'LIMI (2026-09-03, egasi so'rovi) ─────────────────────────
  // "1 oyda KIMGA qancha, NIMAGA qancha pul ketdi" — bitta so'rovda:
  //   summary — jami/soni/naqd-klik/kunlik o'rtacha
  //   daily   — kun bo'yicha jami (ketma-ketlik ko'rinishi uchun)
  //   groups  — SMART guruhlash ("G'ayrat akaga" = "gayratga" = bitta guruh)
  //   byWorker/bySource — kim yozgan / kimning pulidan ketgan
  //   list    — har bir yozuv (tozalangan izoh bilan)
  // Xarajat = INCOME BO'LMAGAN tranzaksiyalar (EXPENSE + SALARY + SUPPLIER_PAYMENT).
  async getExpenseReport(query: ExpenseReportQueryDto) {
    const { from, to } = periodRange(query.period, query.dateFrom, query.dateTo);

    const rows = await this.prisma.transaction.findMany({
      where: { type: { not: "INCOME" }, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true, role: true } } },
    });

    type Group = {
      key: string; label: string; total: number; count: number;
      cash: number; card: number; lastAt: Date; labelCounts: Map<string, number>;
      items: any[];
    };
    const groups = new Map<string, Group>();
    const daily = new Map<string, { date: string; total: number; count: number }>();
    const byWorker = new Map<string, { userId: string; name: string; role: string; total: number; count: number }>();
    const bySource = new Map<string, { name: string; total: number; count: number }>();
    const byType = { EXPENSE: 0, SALARY: 0, SUPPLIER_PAYMENT: 0 } as Record<string, number>;

    let total = 0, cash = 0, card = 0;

    const list = rows.map((t) => {
      const amount = Number(t.amount);
      const { note, sourceName, sourceMethod } = cleanExpenseNote(t.description);
      const { key } = expenseGroupKey(t.category, note);
      // Ko'rinadigan nom: ma'noli kategoriya bo'lsa o'sha, aks holda izoh
      const label = (t.category && t.category.trim()) || note || "Boshqa";
      // Pul kimning balansidan ketgan: izohda ko'rsatilgan bo'lsa o'sha,
      // aks holda yozuvni kiritgan odamning o'zi
      const spentBy = sourceName || t.createdBy.name;
      const method = (sourceMethod ?? t.paymentMethod) as "CASH" | "CARD";

      const item = {
        id: t.id,
        type: t.type,
        amount,
        paymentMethod: method,
        category: t.category,
        note,
        label,
        groupKey: key,
        createdAt: t.createdAt,
        createdBy: { id: t.createdBy.id, name: t.createdBy.name, role: t.createdBy.role },
        spentBy,
      };

      total += amount;
      if (method === "CASH") cash += amount; else card += amount;
      byType[t.type] = (byType[t.type] ?? 0) + amount;

      // Guruh (smart)
      const g = groups.get(key) ?? {
        key, label, total: 0, count: 0, cash: 0, card: 0,
        lastAt: t.createdAt, labelCounts: new Map<string, number>(), items: [],
      };
      g.total += amount;
      g.count += 1;
      if (method === "CASH") g.cash += amount; else g.card += amount;
      if (t.createdAt > g.lastAt) g.lastAt = t.createdAt;
      g.labelCounts.set(label, (g.labelCounts.get(label) ?? 0) + 1);
      g.items.push(item);
      groups.set(key, g);

      // Kun bo'yicha (LOKAL kun — kechqurun 19:00 dagi xarajat ertaga tushmasin)
      const dayKey = format(toLocal(t.createdAt), "yyyy-MM-dd");
      const d = daily.get(dayKey) ?? { date: dayKey, total: 0, count: 0 };
      d.total += amount; d.count += 1;
      daily.set(dayKey, d);

      // Kim yozgan
      const w = byWorker.get(t.createdBy.id) ?? {
        userId: t.createdBy.id, name: t.createdBy.name, role: t.createdBy.role, total: 0, count: 0,
      };
      w.total += amount; w.count += 1;
      byWorker.set(t.createdBy.id, w);

      // Kimning pulidan
      const sv = bySource.get(spentBy) ?? { name: spentBy, total: 0, count: 0 };
      sv.total += amount; sv.count += 1;
      bySource.set(spentBy, sv);

      return item;
    });

    // Guruh nomi — o'sha guruhda eng ko'p uchragan yozuv matni
    const groupList = [...groups.values()]
      .map((g) => {
        // Eng ko'p uchragan yozuv; teng bo'lsa — to'liqrog'i (uzunrog'i)
        const label = [...g.labelCounts.entries()]
          .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0]))[0][0];
        return {
          key: g.key,
          label,
          total: g.total,
          count: g.count,
          cash: g.cash,
          card: g.card,
          share: total > 0 ? Math.round((g.total / total) * 1000) / 10 : 0,
          lastAt: g.lastAt,
          // Har xil yozilgan variantlar ("G'ayrat akaga", "gayratga") — shaffoflik uchun
          variants: [...g.labelCounts.keys()],
          items: g.items,
        };
      })
      .sort((a, b) => b.total - a.total);

    const dailyList = [...daily.values()].sort((a, b) => (a.date < b.date ? 1 : -1));

    // O'rtacha kunlik — oraliqdagi kunlar bo'yicha (kelajakdagi kunlar sanalmaydi)
    const today = localDayRange().end;
    const endForAvg = to > today ? today : to;
    // Kunlar soni — millisekundlardan (date-fns tizim TZ'ida hisoblaydi,
    // serverda UTC bo'lgani uchun bir kun farq qilib ketardi)
    const spanDays = Math.max(1, Math.round((endForAvg.getTime() - from.getTime()) / 86_400_000));

    return {
      summary: {
        total,
        count: rows.length,
        cash,
        card,
        byType,
        daysCount: spanDays,
        activeDays: dailyList.length,
        avgPerDay: Math.round(total / spanDays),
        topLabel: groupList[0]?.label ?? null,
        topAmount: groupList[0]?.total ?? 0,
      },
      daily: dailyList,
      groups: groupList,
      byWorker: [...byWorker.values()].sort((a, b) => b.total - a.total),
      bySource: [...bySource.values()].sort((a, b) => b.total - a.total),
      list,
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
