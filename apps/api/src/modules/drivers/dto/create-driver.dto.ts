import { IsString, Matches, MinLength, MaxLength, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDriverDto {
  @ApiProperty({ example: "Jasur Toshmatov" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: "+998901234570" })
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: "Telefon noto'g'ri formatda (+998XXXXXXXXX)" })
  phone: string;

  @ApiProperty({ example: "Admin@123", description: "Kirish paroli" })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: "Nexia 3 — 01A123BC" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vehicle?: string;
}
