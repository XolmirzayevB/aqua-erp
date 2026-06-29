import { IsEnum, IsOptional, IsDateString, IsInt, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class ReportQueryDto {
  @ApiPropertyOptional({ enum: ["daily", "weekly", "monthly", "yearly"], default: "monthly" })
  @IsOptional()
  @IsEnum(["daily", "weekly", "monthly", "yearly"])
  period?: "daily" | "weekly" | "monthly" | "yearly" = "monthly";

  @ApiPropertyOptional({ example: "2025-01-01" })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: "2025-12-31" })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class TopQueryDto {
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ["daily", "weekly", "monthly", "yearly"], default: "monthly" })
  @IsOptional()
  @IsEnum(["daily", "weekly", "monthly", "yearly"])
  period?: "daily" | "weekly" | "monthly" | "yearly" = "monthly";
}
