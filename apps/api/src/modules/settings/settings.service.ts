import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

// Standart qiymatlar (bazada bo'lmasa shu ishlatiladi)
const DEFAULTS: Record<string, string> = {
  newBottlePrice: "45000",
  refillPrice: "12000",
  zones: "A,B,C,D,G",
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const rows = await this.prisma.setting.findMany();
    const map: Record<string, string> = { ...DEFAULTS };
    for (const r of rows) map[r.key] = r.value;
    return {
      newBottlePrice: Number(map.newBottlePrice),
      refillPrice: Number(map.refillPrice),
      zones: map.zones.split(",").map((z) => z.trim()).filter(Boolean),
    };
  }

  async getValue(key: string): Promise<string> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row?.value ?? DEFAULTS[key] ?? "";
  }

  async getNumber(key: string): Promise<number> {
    return Number(await this.getValue(key));
  }

  async update(data: { newBottlePrice?: number; refillPrice?: number; zones?: string[] }) {
    const updates: { key: string; value: string }[] = [];
    if (data.newBottlePrice !== undefined) updates.push({ key: "newBottlePrice", value: String(data.newBottlePrice) });
    if (data.refillPrice !== undefined) updates.push({ key: "refillPrice", value: String(data.refillPrice) });
    if (data.zones !== undefined) updates.push({ key: "zones", value: data.zones.join(",") });

    await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.setting.upsert({
          where: { key: u.key },
          update: { value: u.value },
          create: { key: u.key, value: u.value },
        })
      )
    );
    return this.getAll();
  }
}
