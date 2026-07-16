import {
  IsString, IsInt, IsEnum, IsOptional, Min, IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateOrderDto {
  @ApiProperty({ description: "Mavjud mijoz ID" })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ example: 3, description: "Almashtiriladigan (to'ldiriladigan) tara soni — 12 mingdan" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  refillCount?: number;

  @ApiPropertyOptional({ example: 2, description: "Yangi sotib olinadigan tara soni — 45 mingdan" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  newBottles?: number;

  // To'lov turi endi YETKAZILGANDA haydovchi tomonidan tanlanadi —
  // yaratishda yuborilmaydi (eski klientlar uchun ixtiyoriy qoldirildi).
  @ApiPropertyOptional({ enum: ["CASH", "CARD", "DEBT"] })
  @IsOptional()
  @IsEnum(["CASH", "CARD", "DEBT"])
  paymentType?: "CASH" | "CARD" | "DEBT";

  @ApiPropertyOptional({ description: "Mijozning qo'shimcha manzili (CustomerLocation ID). Bo'sh = asosiy manzil" })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ example: 3, description: "Qaytarilgan bo'sh tara soni (odatda = almashtirilgan)" })
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
