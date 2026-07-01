import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";

export enum CustomerSortBy {
  NAME = "name",
  CREATED_AT = "createdAt",
  BALANCE = "balance",
  BOTTLES_GIVEN = "bottlesGiven",
}

export class QueryCustomersDto {
  @ApiPropertyOptional({ description: "Ism, telefon yoki manzil bo'yicha qidirish" })
  @IsOptional()
  @IsString()
  search?: string;

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

  @ApiPropertyOptional({ enum: CustomerSortBy, default: CustomerSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(CustomerSortBy)
  sortBy?: CustomerSortBy = CustomerSortBy.CREATED_AT;

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

  @ApiPropertyOptional({ description: "Faqat qarzdorlarni ko'rsatish" })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  debtorsOnly?: boolean;

  @ApiPropertyOptional({ description: "Hudud bo'yicha filtr" })
  @IsOptional()
  @IsString()
  zone?: string;
}
