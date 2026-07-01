import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { AssignDriverDto } from "./dto/assign-driver.dto";
import { QueryOrdersDto } from "./dto/query-orders.dto";
import { SettingsService } from "../settings/settings.service";
import { Prisma, OrderStatus, Role } from "@aqua/database";

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW:        ["PROCESSING", "CANCELLED"],
  PROCESSING: ["ASSIGNED", "CANCELLED"],
  ASSIGNED:   ["DELIVERED", "CANCELLED"],
  DELIVERED:  [],
  CANCELLED:  [],
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
    private settings: SettingsService,
  ) {}

  async create(dto: CreateOrderDto, userId: string) {
    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException("Mijoz topilmadi");

    // Verify driver if provided
    if (dto.driverId) {
      const driver = await this.prisma.user.findFirst({
        where: { id: dto.driverId, role: Role.DRIVER, isActive: true },
      });
      if (!driver) throw new NotFoundException("Haydovchi topilmadi");
    }

    const refillCount = dto.refillCount ?? 0;
    const newBottles = dto.newBottles ?? 0;

    if (refillCount + newBottles <= 0) {
      throw new BadRequestException("Kamida 1 ta tara to'ldirish yoki yangi tara bo'lishi kerak");
    }

    // Tara qoidasi: mijoz o'zidagidan ko'p tara to'ldira olmaydi.
    // Ko'proq kerak bo'lsa — yangi tara sotib olishi shart.
    if (refillCount > customer.bottlesOwned) {
      throw new BadRequestException(
        `Mijozda faqat ${customer.bottlesOwned} ta tara bor. Ko'proq uchun yangi tara qo'shing (sotib olish).`
      );
    }

    // Narxlar — sozlamadan (o'zgaruvchan)
    const refillPrice = await this.settings.getNumber("refillPrice");
    const newBottlePrice = await this.settings.getNumber("newBottlePrice");
    const totalAmount = refillCount * refillPrice + newBottles * newBottlePrice;
    const quantity = refillCount + newBottles; // jami yetkazilgan suv
    const bottlesReturned = dto.bottlesReturned ?? refillCount; // odatda almashtirilgan = qaytarilgan

    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: dto.customerId,
          driverId: dto.driverId || null,
          createdById: userId,
          quantity,
          pricePerUnit: refillPrice,
          refillCount,
          newBottles,
          refillPrice,
          newBottlePrice,
          totalAmount,
          bottlesReturned,
          paymentType: dto.paymentType as any,
          status: dto.driverId ? "ASSIGNED" : "NEW",
          notes: dto.notes,
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true } },
          driver: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // Mijoz tarasi: yangi sotib olingan tara mijozники bo'ladi
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          bottlesOwned: { increment: newBottles },
          bottlesGiven: { increment: quantity },
          bottlesReturned: { increment: bottlesReturned },
          ...(dto.paymentType === "DEBT" ? { balance: { decrement: totalAmount } } : {}),
        },
      });

      // Ombordan yangi sotilgan tara chiqadi (almashtirish ombor sonini o'zgartirmaydi)
      if (newBottles > 0) {
        await tx.inventory.updateMany({
          where: { type: "FULL_BOTTLE" },
          data: { quantity: { decrement: newBottles } },
        });
      }

      // Naqd/karta uchun kirim yozuvi
      if (dto.paymentType !== "DEBT") {
        const parts: string[] = [];
        if (refillCount > 0) parts.push(`${refillCount} ta to'ldirish`);
        if (newBottles > 0) parts.push(`${newBottles} ta yangi tara`);
        await tx.transaction.create({
          data: {
            type: "INCOME",
            amount: totalAmount,
            paymentMethod: dto.paymentType === "CASH" ? "CASH" : "CARD",
            category: "Suv sotuvi",
            description: `${customer.name} — ${parts.join(" + ")}`,
            orderId: created.id,
            customerId: dto.customerId,
            createdById: userId,
          },
        });
      }

      return created;
    });

    // Real-time: notify driver
    if (order.driverId) {
      this.notifications.emitToUser(order.driverId, "new_order", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        quantity: order.quantity,
        address: order.customer.address,
      });
    }

    // Notify operators/admins
    this.notifications.emitToRole("OPERATOR", "order_created", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
    });
    this.notifications.emitToRole("ADMIN", "order_created", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
    });

    return order;
  }

  async findAll(query: QueryOrdersDto) {
    const {
      search, status, driverId, customerId, paymentType,
      dateFrom, dateTo, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc",
    } = query;

    const where: Prisma.OrderWhereInput = {
      ...(status ? { status: status as OrderStatus } : {}),
      ...(driverId ? { driverId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(paymentType ? { paymentType: paymentType as any } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { phone: { contains: search } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true } },
          driver: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, phone2: true, address: true, balance: true, zone: true, locationLink: true } },
        driver: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
        transactions: true,
      },
    });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");
    return order;
  }

  async updateStatus(id: string, dto: UpdateStatusDto, userId: string, userRole: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");

    // Driver can only update their own orders to DELIVERED
    if (userRole === "DRIVER") {
      if (order.driverId !== userId) throw new ForbiddenException("Bu buyurtma sizga tegishli emas");
      if (dto.status !== "DELIVERED") throw new ForbiddenException("Haydovchi faqat 'Yetkazildi' statusini o'zgartira oladi");
    }

    const allowed = STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `"${order.status}" statusidan "${dto.status}" ga o'tib bo'lmaydi. Ruxsat etilgan: ${allowed.join(", ") || "yo'q"}`
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: {
          status: dto.status as OrderStatus,
          ...(dto.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
          ...(dto.notes ? { notes: dto.notes } : {}),
        },
        include: {
          customer: { select: { id: true, name: true } },
          driver: { select: { id: true, name: true } },
        },
      });

      // On delivered: create transaction if debt
      if (dto.status === "DELIVERED" && order.paymentType === "DEBT") {
        await tx.transaction.create({
          data: {
            type: "INCOME",
            amount: order.totalAmount,
            paymentMethod: "CASH",
            category: "Nasiya sotuv",
            description: `${result.customer.name} — nasiya ${order.quantity} ta suv`,
            orderId: id,
            customerId: order.customerId,
            createdById: userId,
          },
        });
      }

      // Bekor qilinganda — tara/ombor/pul qaytariladi
      if (dto.status === "CANCELLED") {
        await this.reverseEffects(tx, order);
      }

      return result;
    });

    // Real-time notifications
    this.notifications.emitToAll("order_status_changed", {
      orderId: id,
      orderNumber: order.orderNumber,
      newStatus: dto.status,
      customerName: updated.customer.name,
    });

    if (dto.status === "CANCELLED") {
      this.notifications.emitToRole("OPERATOR", "order_cancelled", {
        orderId: id, orderNumber: order.orderNumber,
      });
    }

    return updated;
  }

  async assignDriver(id: string, dto: AssignDriverDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");

    if (!["NEW", "PROCESSING"].includes(order.status)) {
      throw new BadRequestException("Bu statusdagi buyurtmaga haydovchi biriktirib bo'lmaydi");
    }

    const driver = await this.prisma.user.findFirst({
      where: { id: dto.driverId, role: Role.DRIVER, isActive: true },
    });
    if (!driver) throw new NotFoundException("Haydovchi topilmadi yoki faol emas");

    const updated = await this.prisma.order.update({
      where: { id },
      data: { driverId: dto.driverId, status: "ASSIGNED" },
      include: {
        customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true } },
        driver: { select: { id: true, name: true } },
      },
    });

    // Notify the assigned driver
    this.notifications.emitToUser(dto.driverId, "new_order", {
      orderId: id,
      orderNumber: order.orderNumber,
      customer: updated.customer,
      quantity: order.quantity,
      address: updated.customer.address,
    });

    this.notifications.emitToAll("order_status_changed", {
      orderId: id, orderNumber: order.orderNumber,
      newStatus: "ASSIGNED", driverName: driver.name,
    });

    return updated;
  }

  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");

    if (!["NEW", "PROCESSING"].includes(order.status)) {
      throw new BadRequestException("Faqat yangi yoki jarayondagi buyurtmani tahrirlash mumkin");
    }

    // Tara/narx o'zgarishi murakkab — faqat izoh tahrirlanadi.
    // Boshqa o'zgarish kerak bo'lsa: bekor qilib, qayta yarating.
    return this.prisma.order.update({
      where: { id },
      data: { notes: dto.notes },
      include: {
        customer: { select: { id: true, name: true, phone: true, address: true, zone: true, locationLink: true } },
        driver: { select: { id: true, name: true } },
      },
    });
  }

  // Bekor qilishda tara/ombor/pul o'zgarishlarini qaytaradi
  private async reverseEffects(tx: Prisma.TransactionClient, order: any) {
    await tx.customer.update({
      where: { id: order.customerId },
      data: {
        bottlesOwned: { decrement: order.newBottles },
        bottlesGiven: { decrement: order.quantity },
        bottlesReturned: { decrement: order.bottlesReturned },
        // Nasiya bo'lsa, yaratishda kamaytirilgan balansni qaytaramiz
        ...(order.paymentType === "DEBT" ? { balance: { increment: order.totalAmount } } : {}),
      },
    });
    // Yangi sotilgan tara omborga qaytadi
    if (order.newBottles > 0) {
      await tx.inventory.updateMany({
        where: { type: "FULL_BOTTLE" },
        data: { quantity: { increment: order.newBottles } },
      });
    }
    // Shu buyurtmaga bog'liq kirim yozuvlarini o'chiramiz
    await tx.transaction.deleteMany({ where: { orderId: order.id } });
  }

  async remove(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");
    if (order.status === "DELIVERED") {
      throw new BadRequestException("Yetkazilgan buyurtmani bekor qilib bo'lmaydi");
    }
    if (order.status === "CANCELLED") {
      throw new BadRequestException("Buyurtma allaqachon bekor qilingan");
    }

    await this.prisma.$transaction(async (tx) => {
      await this.reverseEffects(tx, order);
      await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
    });

    this.notifications.emitToAll("order_status_changed", {
      orderId: id, orderNumber: order.orderNumber, newStatus: "CANCELLED",
    });
    return { message: "Buyurtma bekor qilindi" };
  }

  async getDriverOrders(driverId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate); end.setHours(23, 59, 59, 999);

    return this.prisma.order.findMany({
      where: {
        driverId,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: "asc" },
      include: {
        customer: { select: { id: true, name: true, phone: true, address: true, lat: true, lng: true, zone: true, locationLink: true } },
      },
    });
  }

  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const prefix = `ORD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    const last = await this.prisma.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });

    const seq = last ? parseInt(last.orderNumber.split("-").pop() || "0") + 1 : 1;
    return `${prefix}-${String(seq).padStart(4, "0")}`;
  }
}
