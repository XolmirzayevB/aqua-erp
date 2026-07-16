import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

// Logout'da qurilma o'z refresh tokenini yuboradi — FAQAT shu qurilma
// sessiyasi o'chadi (boshqa qurilmalar kirganicha qolaveradi).
export class LogoutDto {
  @ApiPropertyOptional({ description: "Shu qurilmaning refresh tokeni" })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
