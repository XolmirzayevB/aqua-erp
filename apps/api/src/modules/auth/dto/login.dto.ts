import { IsString, Matches, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "+998901234567" })
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: "Telefon raqam noto'g'ri formatda" })
  phone: string;

  @ApiProperty({ example: "Admin@123" })
  @IsString()
  @MinLength(6, { message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" })
  password: string;
}
