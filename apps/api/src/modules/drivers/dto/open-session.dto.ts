import { IsInt, Min, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class OpenSessionDto {
  @ApiProperty({ example: 50, description: "Kunning boshida nechta to'la butilka oldi" })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  bottlesTaken: number;

  @ApiProperty({ example: 20, description: "Kunning boshida nechta bo'sh tara oldi" })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  emptyTaken: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
