import { IsInt, Min, IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

// Empty → Broken or Empty → Lost
export class MoveStockDto {
  @ApiProperty({ enum: ["BROKEN", "LOST"], description: "Bo'sh tarani nima qilish" })
  @IsEnum(["BROKEN", "LOST"])
  destination: "BROKEN" | "LOST";

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
