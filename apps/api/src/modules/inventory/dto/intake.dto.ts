import { IsInt, Min, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class IntakeDto {
  @ApiProperty({ example: 100, description: "Yetkazib beruvchidan kelgan to'la butilkalar" })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  fullBottles: number;

  @ApiPropertyOptional({ example: 50, description: "Yangi bo'sh taralar (sotib olingan)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  emptyBottles?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
