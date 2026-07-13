import { IsEnum, IsNumber, IsOptional, IsString, Min, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

// Haydovchi (va admin) uchun soddalashtirilgan xarajat kiritish.
// Umumiy CreateTransactionDto'dan farqi: type yo'q (doim EXPENSE),
// paymentMethod ixtiyoriy (default CASH — haydovchi odatda naqd to'laydi).
export class CreateExpenseDto {
  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ example: "Yoqilg'i" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: "Benzin 10 litr" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ["CASH", "CARD"], default: "CASH" })
  @IsOptional()
  @IsEnum(["CASH", "CARD"])
  paymentMethod?: "CASH" | "CARD";
}
