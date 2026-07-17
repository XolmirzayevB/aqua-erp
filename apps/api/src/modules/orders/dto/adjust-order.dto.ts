import { IsInt, Min, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

// YOPILGAN (yetkazilgan) zakazni TAHRIRLASH (2026-07-17, egasi so'rovi).
// Haydovchi yetkazgach mijoz "4 ta kifoya" yoki "yana 1 yangi tara" deb
// qolishi mumkin — haydovchi operatorga aytadi, operator 24 soat ichida
// haqiqiy sonlarga tuzatadi. Ta'siri HAMMA joyga: ombor, moliya, mijoz tarasi.
export class AdjustOrderDto {
  @ApiProperty({ example: 4, description: "To'ldirish (almashtirish) soni — YANGI haqiqiy qiymat" })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  refillCount: number;

  @ApiProperty({ example: 1, description: "Yangi tara soni — YANGI haqiqiy qiymat" })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  newBottles: number;

  @ApiPropertyOptional({ example: "Mijoz 4 ta kifoya dedi", description: "Tahrir sababi (ixtiyoriy)" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
