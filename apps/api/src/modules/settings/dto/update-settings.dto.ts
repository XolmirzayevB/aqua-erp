import { IsOptional, IsNumber, IsArray, IsString, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 45000, description: "Yangi tara narxi" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  newBottlePrice?: number;

  @ApiPropertyOptional({ example: 12000, description: "Tara to'ldirish (almashtirish) narxi" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  refillPrice?: number;

  @ApiPropertyOptional({ example: ["A", "B", "C", "D", "G"], description: "Hudud nomlari" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  zones?: string[];
}
