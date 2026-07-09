import {
  IsString, IsOptional, IsNumber, IsInt, Min, Matches, MaxLength, MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateCustomerDto {
  @ApiProperty({ example: "Alisher Nazarov" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: "+998901234567" })
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: "Telefon raqam noto'g'ri formatda (+998XXXXXXXXX)" })
  phone: string;

  @ApiPropertyOptional({ example: "+998901234568" })
  @IsOptional()
  @IsString()
  // Ixtiyoriy: bo'sh satr ("") ham qabul qilinadi; to'ldirilsa to'liq format bo'lsin
  @Matches(/^(\+998\d{9})?$/, { message: "Qo'shimcha telefon noto'g'ri formatda" })
  phone2?: string;

  @ApiProperty({ example: "Yunusobod 5-kv, 23-uy" })
  @IsString()
  @MinLength(3)
  address: string;

  @ApiPropertyOptional({ example: "A", description: "Hudud" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  zone?: string;

  @ApiPropertyOptional({ example: "https://maps.google.com/...", description: "Lokatsiya havolasi" })
  @IsOptional()
  @IsString()
  locationLink?: string;

  @ApiPropertyOptional({ example: 5, description: "Mijozda allaqachon bor tara soni (daftar ko'chirish uchun)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  bottlesOwned?: number;

  @ApiPropertyOptional({ example: 41.2995 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional({ example: 69.2401 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;

  @ApiPropertyOptional({ example: "Doim tez yetkazib berish kerak" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
