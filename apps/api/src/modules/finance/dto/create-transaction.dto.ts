import {
  IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateTransactionDto {
  @ApiProperty({ enum: ["INCOME", "EXPENSE", "SALARY", "SUPPLIER_PAYMENT"] })
  @IsEnum(["INCOME", "EXPENSE", "SALARY", "SUPPLIER_PAYMENT"])
  type: "INCOME" | "EXPENSE" | "SALARY" | "SUPPLIER_PAYMENT";

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: ["CASH", "CARD"] })
  @IsEnum(["CASH", "CARD"])
  paymentMethod: "CASH" | "CARD";

  @ApiPropertyOptional({ example: "Yoqilg'i", description: "Kategoriya" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Ish haqi uchun — xodim ID" })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
