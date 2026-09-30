import { IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

// Yozib bo'lingan chiqimni qayta belgilash (2026-10-01): admin xato
// belgilangan yozuvni "xarajat" ↔ "berilgan pul" ga o'tkaza oladi.
export class UpdateExpenseKindDto {
  @ApiProperty({ enum: ["EXPENSE", "PAYOUT"] })
  @IsEnum(["EXPENSE", "PAYOUT"])
  kind: "EXPENSE" | "PAYOUT";
}
