import { IsString, IsEnum, Matches, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ example: "Dilshod Karimov" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: "+998901234571" })
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: "Telefon noto'g'ri formatda" })
  phone: string;

  @ApiProperty({ example: "Pass@123" })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: ["ADMIN", "MANAGER", "OPERATOR", "DRIVER"] })
  @IsEnum(["ADMIN", "MANAGER", "OPERATOR", "DRIVER"])
  role: "ADMIN" | "MANAGER" | "OPERATOR" | "DRIVER";
}
