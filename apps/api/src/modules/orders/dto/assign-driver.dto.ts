import { IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AssignDriverDto {
  @ApiProperty()
  @IsUUID()
  driverId: string;
}
