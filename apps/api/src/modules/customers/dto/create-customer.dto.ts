import {
  IsString, IsOptional, IsNumber, Matches, MaxLength, MinLength,
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
  @Matches(/^\+998\d{9}$/, { message: "Qo'shimcha telefon noto'g'ri formatda" })
  phone2?: string;

  @ApiProperty({ example: "Yunusobod 5-kv, 23-uy" })
  @IsString()
  @MinLength(5)
  address: string;

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
