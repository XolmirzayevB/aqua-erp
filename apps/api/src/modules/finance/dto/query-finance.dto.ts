import { IsOptional, IsEnum, IsInt, Min, Max, IsDateString, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class QueryFinanceDto {
  @ApiPropertyOptional({ enum: ["INCOME", "EXPENSE", "SALARY", "SUPPLIER_PAYMENT"] })
  @IsOptional()
  @IsEnum(["INCOME", "EXPENSE", "SALARY", "SUPPLIER_PAYMENT"])
  type?: string;

  @ApiPropertyOptional({ enum: ["CASH", "CARD"] })
  @IsOptional()
  @IsEnum(["CASH", "CARD"])
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: "2025-01-01" })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: "2025-12-31" })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class SummaryQueryDto {
  @ApiPropertyOptional({ enum: ["daily", "weekly", "monthly", "yearly"], default: "monthly" })
  @IsOptional()
  @IsEnum(["daily", "weekly", "monthly", "yearly"])
  period?: "daily" | "weekly" | "monthly" | "yearly";

  // Sana oralig'i (2026-09-03): berilsa period o'rniga aynan shu oraliq
  @ApiPropertyOptional({ example: "2026-08-01" })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: "2026-08-31" })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

// Xarajatlar bo'limi (2026-09-03): davr yoki aniq sana oralig'i
export class ExpenseReportQueryDto {
  @ApiPropertyOptional({ enum: ["daily", "weekly", "monthly", "yearly"], default: "monthly" })
  @IsOptional()
  @IsEnum(["daily", "weekly", "monthly", "yearly"])
  period?: "daily" | "weekly" | "monthly" | "yearly";

  @ApiPropertyOptional({ example: "2026-08-01" })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: "2026-08-31" })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
