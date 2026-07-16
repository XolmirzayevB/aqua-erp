import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsUUID, IsDateString, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";

export class QueryOrdersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ["NEW", "PROCESSING", "ASSIGNED", "DELIVERED", "CANCELLED"] })
  @IsOptional()
  @IsEnum(["NEW", "PROCESSING", "ASSIGNED", "DELIVERED", "CANCELLED"])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: ["CASH", "CARD", "DEBT"] })
  @IsOptional()
  @IsEnum(["CASH", "CARD", "DEBT"])
  paymentType?: string;

  @ApiPropertyOptional({ example: "A", description: "Mijoz hududi bo'yicha filtr" })
  @IsOptional()
  @IsString()
  zone?: string;

  // Qolib ketgan zakazlar: avvalgi kunlardan beri ochiq (yetkazilmagan) turganlar.
  // true bo'lsa status/sort e'tiborga olinmaydi — eng eskisi birinchi qaytadi.
  @ApiPropertyOptional({ description: "Faqat qolib ketgan (kechikkan) ochiq zakazlar" })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  overdue?: boolean;

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

  @ApiPropertyOptional({ enum: ["createdAt", "totalAmount", "status"], default: "createdAt" })
  @IsOptional()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";
}
