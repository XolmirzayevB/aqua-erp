import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { PushService } from "../notifications/push.service";
import { CreateTransferDto } from "./dto/create-transfer.dto";

// Pul ushlaydigan rollar — MANAGER pul ushlamaydi (faqat ko'radi)
const MONEY_ROLES = ["ADMIN", "OPERATOR", "DRIVER"];

const TRANSFER_INCLUDE = {
  fromUser: { select: { id: true, name: true, role: true } },
  toUser: { select: { id: true, name: true, role: true } },
} as const;

// ISHCHI PUL BALANSI (2026-07-19, egasi so'rovi).
// Pul balansga QAYERDAN keladi:
//   - naqd zakaz yetkazilganda → haydovchi naqdiga (orders.updateStatus)
//   - Klik tasdiqlanganda → tasdiqlagan operator klikiga (confirmCardPayment)
//   - qarz to'lovi qabul qilinganda → qabul qilgan ishchiga (customers.addPayment)
// QAYERGA ketadi:
//   - xarajat: tanlangan manba balansidan (finance.createExpense)
//   - o'tkazma: boshqa ishchiga (shu servis)
@Injectable()
export class BalancesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
    private push: PushService,
  ) {}

  // Balanslar ro'yxati.
  // ADMIN/MANAGER/OPERATOR — hammani ko'radi (operator xarajat manbasini
  // tanlashi uchun ham kerak). DRIVER — faqat O'Z summasini ko'radi;
  // boshqalarning ismi/roli o'tkazma qabul qiluvchisini tanlash uchun qaytadi.
  async getBalances(user: { sub: string; role: string }) {
    const workers = await this.prisma.user.findMany({
      where: { isActive: true, role: { in: MONEY_ROLES as any } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true, cashBalance: true, clickBalance: true },
    });

    const showAll = user.role !== "DRIVER";
    const data = workers.map((w) => {
      const visible = showAll || w.id === user.sub;
      return {
        id: w.id,
        name: w.name,
        role: w.role,
        cashBalance: visible ? Number(w.cashBalance) : null,
        clickBalance: visible ? Number(w.clickBalance) : null,
      };
    });

    // Umumiy pul — faqat to'liq ko'ruvchilarga.
    // MUHIM: kutilayotgan (PENDING) o'tkazmalar yuboruvchidan ayirilgan,
    // lekin qabul qiluvchiga hali qo'shilmagan — bu pul "yo'lda". Uni ham
    // jamiga qo'shamiz, aks holda umumiy pul vaqtincha kamayib ko'rinadi.
    let totals: { cash: number; click: number; pendingCash: number; pendingClick: number } | null = null;
    if (showAll) {
      const pendingAgg = await this.prisma.workerTransfer.groupBy({
        by: ["method"],
        where: { status: "PENDING" },
        _sum: { amount: true },
      });
      const pendingCash = Number(pendingAgg.find((p) => p.method === "CASH")?._sum.amount ?? 0);
      const pendingClick = Number(pendingAgg.find((p) => p.method === "CARD")?._sum.amount ?? 0);
      totals = {
        cash: workers.reduce((s, w) => s + Number(w.cashBalance), 0) + pendingCash,
        click: workers.reduce((s, w) => s + Number(w.clickBalance), 0) + pendingClick,
        pendingCash,
        pendingClick,
      };
    }

    return { data, totals };
  }

  // O'tkazmalar ro'yxati: ishchi — o'ziga tegishlilarni, admin/menejer — hammasini.
  // PENDING'lar birinchi (qabul qilish kutilyapti), keyin yangilari.
  async getTransfers(user: { sub: string; role: string }) {
    const mineOnly = user.role === "OPERATOR" || user.role === "DRIVER";
    const where = mineOnly
      ? { OR: [{ fromUserId: user.sub }, { toUserId: user.sub }] }
      : {};

    const [pending, resolved] = await Promise.all([
      this.prisma.workerTransfer.findMany({
        where: { ...where, status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: TRANSFER_INCLUDE,
      }),
      this.prisma.workerTransfer.findMany({
        where: { ...where, status: { not: "PENDING" } },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: TRANSFER_INCLUDE,
      }),
    ]);
    return { pending, resolved };
  }

  // O'tkazma yaratish. MUHIM: pul yuboruvchidan SHU YERDA ayiriladi —
  // bitta pulni ikki joyga yuborib bo'lmaydi. Qabul qilinmasa qaytariladi.
  async createTransfer(dto: CreateTransferDto, user: { sub: string; role: string }) {
    if (dto.toUserId === user.sub) {
      throw new BadRequestException("O'zingizga pul o'tkaza olmaysiz");
    }
    const to = await this.prisma.user.findUnique({ where: { id: dto.toUserId } });
    if (!to || !to.isActive || !MONEY_ROLES.includes(to.role)) {
      throw new NotFoundException("Qabul qiluvchi ishchi topilmadi");
    }

    const isCash = dto.method === "CASH";
    const transfer = await this.prisma.$transaction(async (tx) => {
      // Atomar ayirish — balans yetarli bo'lsagina (parallel so'rovlarda ham xavfsiz)
      const res = await tx.user.updateMany({
        where: {
          id: user.sub,
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
          `Balansingizda yetarli ${isCash ? "naqd" : "klik"} pul yo'q`,
        );
      }
      return tx.workerTransfer.create({
        data: {
          fromUserId: user.sub,
          toUserId: dto.toUserId,
          amount: dto.amount,
          method: dto.method as any,
          notes: dto.notes?.trim() || null,
        },
        include: TRANSFER_INCLUDE,
      });
    });

    // Qabul qiluvchiga darrov bildiramiz: ochiq sahifalar yangilanadi + push
    this.notifications.emitToAll("transfer_updated", { id: transfer.id });
    this.push
      .sendToUser(dto.toUserId, {
        title: "💸 Sizga pul o'tkazildi",
        body: `${transfer.fromUser.name}: ${Number(dto.amount).toLocaleString("ru-RU")} so'm (${isCash ? "naqd" : "klik"}) — "Qabul qilish"ni bosing`,
        url: "/balances",
        tag: `transfer-${transfer.id}`,
      })
      .catch(() => {});

    return transfer;
  }

  // Qabul qilish — FAQAT qabul qiluvchining o'zi. Pul shu yerda unga qo'shiladi.
  async acceptTransfer(id: string, user: { sub: string }) {
    const t = await this.getPendingFor(id);
    if (t.toUserId !== user.sub) {
      throw new ForbiddenException("Bu o'tkazma sizga yuborilmagan — faqat qabul qiluvchi tasdiqlaydi");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // status hali PENDING bo'lsagina — ikki marta bosishdan himoya
      const res = await tx.workerTransfer.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "ACCEPTED", resolvedAt: new Date() },
      });
      if (res.count === 0) throw new BadRequestException("Bu o'tkazma allaqachon hal qilingan");
      await tx.user.update({
        where: { id: t.toUserId },
        data:
          t.method === "CASH"
            ? { cashBalance: { increment: t.amount } }
            : { clickBalance: { increment: t.amount } },
      });
      return tx.workerTransfer.findUnique({ where: { id }, include: TRANSFER_INCLUDE });
    });

    this.notifications.emitToAll("transfer_updated", { id });
    return updated;
  }

  // Rad etish — qabul qiluvchi. Pul yuboruvchiga QAYTADI.
  async rejectTransfer(id: string, user: { sub: string }) {
    const t = await this.getPendingFor(id);
    if (t.toUserId !== user.sub) {
      throw new ForbiddenException("Bu o'tkazma sizga yuborilmagan");
    }
    return this.refund(id, t, "REJECTED");
  }

  // Bekor qilish — yuboruvchi (qabul qilinmagan bo'lsa). Pul o'ziga qaytadi.
  async cancelTransfer(id: string, user: { sub: string }) {
    const t = await this.getPendingFor(id);
    if (t.fromUserId !== user.sub) {
      throw new ForbiddenException("Faqat yuboruvchi bekor qila oladi");
    }
    return this.refund(id, t, "CANCELLED");
  }

  private async getPendingFor(id: string) {
    const t = await this.prisma.workerTransfer.findUnique({ where: { id } });
    if (!t) throw new NotFoundException("O'tkazma topilmadi");
    if (t.status !== "PENDING") {
      throw new BadRequestException("Bu o'tkazma allaqachon hal qilingan");
    }
    return t;
  }

  private async refund(
    id: string,
    t: { fromUserId: string; amount: any; method: string },
    status: "REJECTED" | "CANCELLED",
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.workerTransfer.updateMany({
        where: { id, status: "PENDING" },
        data: { status, resolvedAt: new Date() },
      });
      if (res.count === 0) throw new BadRequestException("Bu o'tkazma allaqachon hal qilingan");
      await tx.user.update({
        where: { id: t.fromUserId },
        data:
          t.method === "CASH"
            ? { cashBalance: { increment: t.amount } }
            : { clickBalance: { increment: t.amount } },
      });
      return tx.workerTransfer.findUnique({ where: { id }, include: TRANSFER_INCLUDE });
    });

    this.notifications.emitToAll("transfer_updated", { id });
    return updated;
  }
}
