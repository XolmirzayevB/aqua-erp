import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: "Izoh (faqat shu tahrirlanadi)" })
  @IsOptional()
  @IsString()
  notes?: string;
}
