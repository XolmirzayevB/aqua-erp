import { Module } from "@nestjs/common";
import { BalancesController } from "./balances.controller";
import { BalancesService } from "./balances.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [BalancesController],
  providers: [BalancesService],
  exports: [BalancesService],
})
export class BalancesModule {}
