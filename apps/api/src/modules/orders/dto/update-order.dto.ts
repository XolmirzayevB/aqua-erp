import { IsOptional, IsString, IsInt, IsNumber, IsEnum, Min, IsUUID } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class UpdateOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerUnit?: number;

  @ApiPropertyOptional({ enum: ["CASH", "CARD", "DEBT"] })
  @IsOptional()
  @IsEnum(["CASH", "CARD", "DEBT"])
  paymentType?: "CASH" | "CARD" | "DEBT";

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  bottlesReturned?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
