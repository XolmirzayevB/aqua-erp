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

  // "Yetkazildi" bosilganda haydovchi to'lov turini tanlaydi (naqd/karta/nasiya).
  // Buyurtmada to'lov turi hali belgilanmagan bo'lsa MAJBURIY.
  @ApiPropertyOptional({ enum: ["CASH", "CARD", "DEBT"] })
  @IsOptional()
  @IsEnum(["CASH", "CARD", "DEBT"])
  paymentType?: "CASH" | "CARD" | "DEBT";
}
