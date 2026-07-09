import { IsInt, Min, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

// Ombordagi bo'sh tara sonini aniq belgilash (boshlang'ich zaxira / inventarizatsiya)
export class SetWarehouseDto {
  @ApiProperty({ example: 100, description: "Omborda hozir nechta bo'sh tara bor" })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
