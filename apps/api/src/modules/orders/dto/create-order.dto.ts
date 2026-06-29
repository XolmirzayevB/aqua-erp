import {
  IsString, IsInt, IsEnum, IsOptional, IsBoolean,
  IsNumber, Min, IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateOrderDto {
  @ApiProperty({ description: "Mavjud mijoz ID" })
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerUnit: number;

  @ApiProperty({ enum: ["CASH", "CARD", "DEBT"] })
  @IsEnum(["CASH", "CARD", "DEBT"])
  paymentType: "CASH" | "CARD" | "DEBT";

  @ApiPropertyOptional({ example: 2, description: "Qaytarilgan bo'sh taralar soni" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  bottlesReturned?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Haydovchi ID (biriktirish)" })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}
