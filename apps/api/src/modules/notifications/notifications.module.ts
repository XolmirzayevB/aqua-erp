import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { NotificationsGateway } from "./notifications.gateway";
import { NotificationsController } from "./notifications.controller";
import { PushService } from "./push.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [NotificationsController],
  providers: [NotificationsGateway, PushService],
  exports: [NotificationsGateway, PushService],
})
export class NotificationsModule {}
