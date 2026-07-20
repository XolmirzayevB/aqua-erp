import { IsEnum, IsOptional, IsString, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateStatusDto {
  @ApiProperty({ enum: ["NEW", "PROCESSING", "ASSIGNED", "DELIVERED", "CANCELLED"] })
  @IsEnum(["NEW", "PROCESSING", "ASSIGNED", "DELIVERED", "CANCELLED"])
  status: "NEW" | "PROCESSING" | "ASSIGNED" | "DELIVERED" | "CANCELLED";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  // "Yetkazildi" bosilganda haydovchi to'lov turini tanlaydi:
  // naqd/karta/nasiya/BEPUL (imtiyozli — prokuratura kabi, pul olinmaydi).
  // Buyurtmada to'lov turi hali belgilanmagan bo'lsa MAJBURIY.
  @ApiPropertyOptional({ enum: ["CASH", "CARD", "DEBT", "FREE"] })
  @IsOptional()
  @IsEnum(["CASH", "CARD", "DEBT", "FREE"])
  paymentType?: "CASH" | "CARD" | "DEBT" | "FREE";

  // LOKATSIYA SAQLASH (2026-07-20, egasi so'rovi): haydovchi zakaz yopishda
  // "Lokatsiyani saqlash"ni yoqqan bo'lsa — uning hozirgi GPS joyi shu zakaz
  // mijozining (yoki tanlangan qo'shimcha manzilining) lokatsiyasi qilib yoziladi.
  @ApiPropertyOptional({ description: "Haydovchining GPS kengligi (lat)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  driverLat?: number;

  @ApiPropertyOptional({ description: "Haydovchining GPS uzunligi (lng)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  driverLng?: number;

  @ApiPropertyOptional({ description: "GPS aniqligi (metr) — izohga yoziladi" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  locationAccuracy?: number;
}
