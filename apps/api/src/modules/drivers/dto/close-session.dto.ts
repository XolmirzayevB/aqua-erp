import { IsInt, IsNumber, Min, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CloseSessionDto {
  @ApiProperty({ example: 45, description: "Kunning oxirida nechta suv sotildi" })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  bottlesSold: number;

  @ApiProperty({ example: 18, description: "Nechta bo'sh tara qaytarildi" })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  emptyReturned: number;

  @ApiProperty({ example: 450000, description: "Naqd topshirilgan pul" })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cashCollected: number;

  @ApiProperty({ example: 225000, description: "Karta orqali topshirilgan pul" })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cardCollected: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
