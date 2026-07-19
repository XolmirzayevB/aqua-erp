import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

// Ishchidan ishchiga pul o'tkazish (masalan haydovchi naqdini operatorga beradi).
// Pul yuborilganda yuboruvchidan DARROV ayiriladi; qabul qiluvchi
// "Qabul qilish"ni bosgandagina unga qo'shiladi.
export class CreateTransferDto {
  @ApiProperty({ description: "Qabul qiluvchi ishchi (user id)" })
  @IsUUID()
  toUserId: string;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: ["CASH", "CARD"], description: "Naqd yoki Klik pul" })
  @IsEnum(["CASH", "CARD"])
  method: "CASH" | "CARD";

  @ApiPropertyOptional({ example: "Kunlik topshirish" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
