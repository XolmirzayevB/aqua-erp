import { IsNumber, IsEnum, IsOptional, IsString, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class AddPaymentDto {
  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: ["CASH", "CARD"] })
  @IsEnum(["CASH", "CARD"])
  method: "CASH" | "CARD";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
