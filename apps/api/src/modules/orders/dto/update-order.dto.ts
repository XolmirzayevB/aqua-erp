import { IsOptional, IsString, IsInt, Min, MaxLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

// OCHIQ (yetkazilmagan) zakazni tahrirlash (2026-07-20, egasi so'rovi):
// operator yozib qo'ygan sonlarni yetkazishdan OLDIN tuzatish mumkin.
// Ta'siri: mijoz tarasi, ombor, summa — hammasi qayta hisoblanadi.
export class UpdateOrderDto {
  @ApiPropertyOptional({ description: "To'ldirish (almashtirish) soni" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  refillCount?: number;

  @ApiPropertyOptional({ description: "Yangi tara soni" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  newBottles?: number;

  @ApiPropertyOptional({ description: "Izoh" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Tahrir sababi (izohga qo'shiladi)" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;

  // Mijoz uyidagi tara sonini aniqlashtirish (bu zakazdan TASHQARI) —
  // create'dagi actualBottlesOwned bilan bir xil semantika
  @ApiPropertyOptional({ description: "Mijoz uyidagi tara soni (zakazdan tashqari, aniqlashtirish)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualBottlesOwned?: number;
}
