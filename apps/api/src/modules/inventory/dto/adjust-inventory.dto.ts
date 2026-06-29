import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class AdjustInventoryDto {
  @ApiProperty({ enum: ["FULL_BOTTLE", "EMPTY_BOTTLE", "BROKEN_BOTTLE", "LOST_BOTTLE"] })
  @IsEnum(["FULL_BOTTLE", "EMPTY_BOTTLE", "BROKEN_BOTTLE", "LOST_BOTTLE"])
  type: "FULL_BOTTLE" | "EMPTY_BOTTLE" | "BROKEN_BOTTLE" | "LOST_BOTTLE";

  @ApiProperty({ enum: ["INTAKE", "ADJUSTMENT", "BROKEN", "LOST", "RETURN"], description: "Amal turi" })
  @IsEnum(["INTAKE", "ADJUSTMENT", "BROKEN", "LOST", "RETURN", "DELIVERY"])
  actionType: "INTAKE" | "ADJUSTMENT" | "BROKEN" | "LOST" | "RETURN" | "DELIVERY";

  @ApiProperty({ example: 10, description: "Musbat = qo'shish, manfiy = ayirish" })
  @IsInt()
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
