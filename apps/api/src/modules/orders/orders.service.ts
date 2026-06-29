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

    const totalAmount = dto.quantity * dto.pricePerUnit;
    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: dto.customerId,
          driverId: dto.driverId || null,
          createdById: userId,
          quantity: dto.quantity,
          pricePerUnit: dto.pricePerUnit,
          totalAmount,
          bottlesReturned: dto.bottlesReturned || 0,
          paymentType: dto.paymentType as any,
          status: dto.driverId ? "ASSIGNED" : "NEW",
          notes: dto.notes,
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, address: true } },
          driver: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // Update customer bottles
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          bottlesGiven: { increment: dto.quantity },
          bottlesReturned: { increment: dto.bottlesReturned || 0 },
          // If debt payment, adjust balance
          ...(dto.paymentType === "DEBT" ? { balance: { decrement: totalAmount } } : {}),
        },
      });

      // Create income transaction for cash/card
      if (dto.paymentType !== "DEBT") {
        await tx.transaction.create({
          data: {
            type: "INCOME",
            amount: totalAmount,
            paymentMethod: dto.paymentType === "CASH" ? "CASH" : "CARD",
            category: "Suv sotuvi",
            description: `${customer.name} — ${dto.quantity} ta suv`,
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
          customer: { select: { id: true, name: true, phone: true, address: true } },
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
        customer: { select: { id: true, name: true, phone: true, phone2: true, address: true, balance: true } },
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
        customer: { select: { id: true, name: true, phone: true, address: true } },
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

    const totalAmount = dto.quantity && dto.pricePerUnit
      ? dto.quantity * dto.pricePerUnit
      : dto.quantity
        ? dto.quantity * Number(order.pricePerUnit)
        : dto.pricePerUnit
          ? Number(order.quantity) * dto.pricePerUnit
          : undefined;

    return this.prisma.order.update({
      where: { id },
      data: { ...dto, ...(totalAmount ? { totalAmount } : {}) },
      include: {
        customer: { select: { id: true, name: true, phone: true, address: true } },
        driver: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Buyurtma topilmadi");
    if (!["NEW", "PROCESSING"].includes(order.status)) {
      throw new BadRequestException("Faqat yangi yoki jarayondagi buyurtmani o'chirish mumkin");
    }
    await this.prisma.order.update({ where: { id }, data: { status: "CANCELLED" } });
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
        customer: { select: { id: true, name: true, phone: true, address: true, lat: true, lng: true } },
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
