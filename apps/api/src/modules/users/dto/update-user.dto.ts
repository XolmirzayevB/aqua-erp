import { IsString, IsEnum, IsOptional, IsBoolean, MinLength, Matches } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+998\d{9}$/, { message: "Telefon noto'g'ri formatda" })
  phone?: string;

  @ApiPropertyOptional({ enum: ["ADMIN", "MANAGER", "OPERATOR", "DRIVER"] })
  @IsOptional()
  @IsEnum(["ADMIN", "MANAGER", "OPERATOR", "DRIVER"])
  role?: "ADMIN" | "MANAGER" | "OPERATOR" | "DRIVER";

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Yangi parol (ixtiyoriy)" })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
