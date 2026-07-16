import {
  IsString, IsOptional, IsNumber, MaxLength, MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";

// Mijozning QO'SHIMCHA manzili (Uy, Apteka, Do'kon...).
// Zakaz yozilganda operator shulardan birini tanlaydi.
export class CreateLocationDto {
  @ApiProperty({ example: "Apteka", description: "Joy nomi (qisqa)" })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label: string;

  @ApiPropertyOptional({ example: "Markaziy ko'cha, 12-do'kon" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ example: "https://maps.google.com/...", description: "Lokatsiya havolasi" })
  @IsOptional()
  @IsString()
  locationLink?: string;

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
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}
