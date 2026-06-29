import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import * as bcrypt from "bcrypt";

const SAFE_SELECT = {
  id: true, name: true, phone: true, role: true,
  isActive: true, createdAt: true, updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { role?: string; isActive?: boolean; limit?: number }) {
    const { role, limit = 100 } = params;
    return this.prisma.user.findMany({
      where: {
        ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
        ...(role ? { role: role as any } : {}),
      },
      select: { ...SAFE_SELECT, _count: { select: { orders: true } } },
      take: limit,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) throw new NotFoundException("Foydalanuvchi topilmadi");
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException("Bu telefon raqam allaqachon mavjud");

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        passwordHash,
        role: dto.role as any,
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Foydalanuvchi topilmadi");

    // Prevent self-deactivation / self-demotion of last admin
    if (id === currentUserId && dto.isActive === false) {
      throw new BadRequestException("O'zingizni nofaol qila olmaysiz");
    }
    if (user.role === "ADMIN" && (dto.role && dto.role !== "ADMIN" || dto.isActive === false)) {
      const adminCount = await this.prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      if (adminCount <= 1) throw new BadRequestException("Oxirgi adminni o'zgartirib bo'lmaydi");
    }

    if (dto.phone) {
      const conflict = await this.prisma.user.findFirst({ where: { phone: dto.phone, NOT: { id } } });
      if (conflict) throw new ConflictException("Bu telefon boshqa foydalanuvchida mavjud");
    }

    const data: any = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      delete data.password;
    }

    return this.prisma.user.update({ where: { id }, data, select: SAFE_SELECT });
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) throw new BadRequestException("O'zingizni o'chira olmaysiz");
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Foydalanuvchi topilmadi");

    if (user.role === "ADMIN") {
      const adminCount = await this.prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      if (adminCount <= 1) throw new BadRequestException("Oxirgi adminni o'chirib bo'lmaydi");
    }

    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { message: "Foydalanuvchi o'chirildi" };
  }

  async getStats() {
    const grouped = await this.prisma.user.groupBy({
      by: ["role"],
      where: { isActive: true },
      _count: { id: true },
    });
    return Object.fromEntries(grouped.map((g) => [g.role, g._count.id]));
  }
}
