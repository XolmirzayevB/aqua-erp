import { IsEnum, IsOptional, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryReportDto {
  @ApiPropertyOptional({ enum: ["daily", "weekly", "monthly"] })
  @IsOptional()
  @IsEnum(["daily", "weekly", "monthly"])
  period?: "daily" | "weekly" | "monthly";

  @ApiPropertyOptional({ example: "2025-01-01" })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: "2025-12-31" })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
