import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AdjustInventoryDto } from "./dto/adjust-inventory.dto";
import { IntakeDto } from "./dto/intake.dto";
import { MoveStockDto } from "./dto/move-stock.dto";
import { InventoryType } from "@aqua/database";

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // Ensure all 4 inventory types exist
  private async ensureTypes() {
    for (const type of Object.values(InventoryType)) {
      await this.prisma.inventory.upsert({
        where: { type },
        update: {},
        create: { type, quantity: 0 },
      });
    }
  }

  async getOverview() {
    await this.ensureTypes();

    const items = await this.prisma.inventory.findMany({
      orderBy: { type: "asc" },
    });

    const map = Object.fromEntries(items.map((i) => [i.type, i.quantity]));

    return {
      fullBottles: map.FULL_BOTTLE ?? 0,
      emptyBottles: map.EMPTY_BOTTLE ?? 0,
      brokenBottles: map.BROKEN_BOTTLE ?? 0,
      lostBottles: map.LOST_BOTTLE ?? 0,
      totalBottles: (map.FULL_BOTTLE ?? 0) + (map.EMPTY_BOTTLE ?? 0),
      items,
    };
  }

  async getHistory(page = 1, limit = 30, type?: string) {
    const where = type ? { inventory: { type: type as InventoryType } } : {};

    const [data, total] = await Promise.all([
      this.prisma.inventoryAction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { inventory: { select: { type: true } } },
      }),
      this.prisma.inventoryAction.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // Manual adjustment of a single type
  async adjust(dto: AdjustInventoryDto) {
    await this.ensureTypes();

    const inv = await this.prisma.inventory.findUnique({ where: { type: dto.type as InventoryType } });
    if (!inv) throw new BadRequestException("Inventar turi topilmadi");

    const newQty = inv.quantity + dto.quantity;
    if (newQty < 0) {
      throw new BadRequestException(`Yetarli emas. Hozir: ${inv.quantity}, ayirmoqchi: ${Math.abs(dto.quantity)}`);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.inventory.update({
        where: { type: dto.type as InventoryType },
        data: { quantity: newQty },
      }),
      this.prisma.inventoryAction.create({
        data: {
          inventoryId: inv.id,
          actionType: dto.actionType as any,
          quantity: dto.quantity,
          description: dto.description,
        },
      }),
    ]);

    return updated;
  }

  // Intake from supplier: add full bottles (+ optionally new empties)
  async intake(dto: IntakeDto) {
    await this.ensureTypes();

    const full = await this.prisma.inventory.findUnique({ where: { type: "FULL_BOTTLE" } });
    const empty = await this.prisma.inventory.findUnique({ where: { type: "EMPTY_BOTTLE" } });

    const ops: any[] = [
      this.prisma.inventory.update({
        where: { type: "FULL_BOTTLE" },
        data: { quantity: { increment: dto.fullBottles } },
      }),
      this.prisma.inventoryAction.create({
        data: {
          inventoryId: full!.id,
          actionType: "INTAKE",
          quantity: dto.fullBottles,
          description: dto.description || "Yetkazib beruvchidan qabul",
        },
      }),
    ];

    if (dto.emptyBottles && dto.emptyBottles > 0) {
      ops.push(
        this.prisma.inventory.update({
          where: { type: "EMPTY_BOTTLE" },
          data: { quantity: { increment: dto.emptyBottles } },
        }),
        this.prisma.inventoryAction.create({
          data: {
            inventoryId: empty!.id,
            actionType: "INTAKE",
            quantity: dto.emptyBottles,
            description: dto.description || "Yangi bo'sh tara qabul",
          },
        })
      );
    }

    await this.prisma.$transaction(ops);
    return this.getOverview();
  }

  // Move empty bottles to broken/lost
  async moveStock(dto: MoveStockDto) {
    await this.ensureTypes();

    const empty = await this.prisma.inventory.findUnique({ where: { type: "EMPTY_BOTTLE" } });
    if (!empty || empty.quantity < dto.quantity) {
      throw new BadRequestException(`Bo'sh tara yetarli emas. Hozir: ${empty?.quantity ?? 0}`);
    }

    const destType: InventoryType = dto.destination === "BROKEN" ? "BROKEN_BOTTLE" : "LOST_BOTTLE";
    const dest = await this.prisma.inventory.findUnique({ where: { type: destType } });

    await this.prisma.$transaction([
      // Remove from empty
      this.prisma.inventory.update({
        where: { type: "EMPTY_BOTTLE" },
        data: { quantity: { decrement: dto.quantity } },
      }),
      this.prisma.inventoryAction.create({
        data: {
          inventoryId: empty.id,
          actionType: dto.destination === "BROKEN" ? "BROKEN" : "LOST",
          quantity: -dto.quantity,
          description: dto.description || (dto.destination === "BROKEN" ? "Singan tara" : "Yo'qolgan tara"),
        },
      }),
      // Add to destination
      this.prisma.inventory.update({
        where: { type: destType },
        data: { quantity: { increment: dto.quantity } },
      }),
      this.prisma.inventoryAction.create({
        data: {
          inventoryId: dest!.id,
          actionType: dto.destination === "BROKEN" ? "BROKEN" : "LOST",
          quantity: dto.quantity,
          description: dto.description,
        },
      }),
    ]);

    return this.getOverview();
  }
}
