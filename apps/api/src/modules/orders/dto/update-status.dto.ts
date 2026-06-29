import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateStatusDto {
  @ApiProperty({ enum: ["NEW", "PROCESSING", "ASSIGNED", "DELIVERED", "CANCELLED"] })
  @IsEnum(["NEW", "PROCESSING", "ASSIGNED", "DELIVERED", "CANCELLED"])
  status: "NEW" | "PROCESSING" | "ASSIGNED" | "DELIVERED" | "CANCELLED";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
