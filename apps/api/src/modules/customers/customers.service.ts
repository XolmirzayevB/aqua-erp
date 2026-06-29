import {
  Injectable, NotFoundException, ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { QueryCustomersDto } from "./dto/query-customers.dto";
import { AddPaymentDto } from "./dto/add-payment.dto";
import { Prisma } from "@aqua/database";

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto, userId: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { phone: dto.phone },
    });
    if (existing) throw new ConflictException("Bu telefon raqam allaqachon mavjud");

    return this.prisma.customer.create({
      data: { ...dto, createdById: userId },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async findAll(query: QueryCustomersDto) {
    const { search, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", debtorsOnly } = query;

    const where: Prisma.CustomerWhereInput = {
      isActive: true,
      ...(debtorsOnly ? { balance: { lt: 0 } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              { phone2: { contains: search } },
              { address: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { orders: true, payments: true } },
      },
    });
    if (!customer) throw new NotFoundException("Mijoz topilmadi");
    return customer;
  }

  async getOrders(id: string, page = 1, limit = 10) {
    await this.assertExists(id);

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { driver: { select: { id: true, name: true } } },
      }),
      this.prisma.order.count({ where: { customerId: id } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getPayments(id: string, page = 1, limit = 10) {
    await this.assertExists(id);

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where: { customerId: id } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async addPayment(id: string, dto: AddPaymentDto, userId: string) {
    const customer = await this.assertExists(id);

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: { customerId: id, amount: dto.amount, method: dto.method as any, notes: dto.notes },
      }),
      this.prisma.customer.update({
        where: { id },
        data: { balance: { increment: dto.amount } },
      }),
      this.prisma.transaction.create({
        data: {
          type: "INCOME",
          amount: dto.amount,
          paymentMethod: dto.method as any,
          category: "Qarz to'lovi",
          description: `${customer.name} dan qarz to'lovi`,
          customerId: id,
          createdById: userId,
        },
      }),
    ]);

    return payment;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.assertExists(id);
    if (dto.phone) {
      const conflict = await this.prisma.customer.findFirst({
        where: { phone: dto.phone, NOT: { id } },
      });
      if (conflict) throw new ConflictException("Bu telefon raqam boshqa mijozda mavjud");
    }
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.customer.update({ where: { id }, data: { isActive: false } });
    return { message: "Mijoz o'chirildi" };
  }

  async getStats(id: string) {
    await this.assertExists(id);

    const [totalSpent, orderStats, lastOrder] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { customerId: id, type: "INCOME" },
        _sum: { amount: true },
      }),
      this.prisma.order.groupBy({
        by: ["status"],
        where: { customerId: id },
        _count: { id: true },
      }),
      this.prisma.order.findFirst({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, status: true },
      }),
    ]);

    return {
      totalSpent: Number(totalSpent._sum.amount ?? 0),
      orderStats: Object.fromEntries(orderStats.map((s) => [s.status, s._count.id])),
      lastOrder,
    };
  }

  private async assertExists(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException("Mijoz topilmadi");
    return customer;
  }
}
