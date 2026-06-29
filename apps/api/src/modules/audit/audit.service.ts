import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma, AuditAction } from "@aqua/database";

interface LogParams {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: LogParams) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          oldData: params.oldData ?? undefined,
          newData: params.newData ?? undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch {
      // Never break the request if audit logging fails
    }
  }

  async findAll(params: {
    page?: number; limit?: number;
    entity?: string; action?: string; userId?: string;
  }) {
    const { page = 1, limit = 30, entity, action, userId } = params;

    const where: Prisma.AuditLogWhereInput = {
      ...(entity ? { entity } : {}),
      ...(action ? { action: action as AuditAction } : {}),
      ...(userId ? { userId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // BigInt id → string for JSON serialization
    return {
      data: data.map((d) => ({ ...d, id: d.id.toString() })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getEntities() {
    const entities = await this.prisma.auditLog.findMany({
      distinct: ["entity"],
      select: { entity: true },
    });
    return entities.map((e) => e.entity);
  }
}
