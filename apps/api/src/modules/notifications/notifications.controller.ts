import { Body, Controller, Delete, Get, Headers, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "@aqua/shared";
import { PushService } from "./push.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller({ path: "notifications", version: "1" })
export class NotificationsController {
  constructor(private push: PushService) {}

  @Get("push/public-key")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "Web Push VAPID public key" })
  getPublicKey() {
    return { publicKey: this.push.getPublicKey() };
  }

  @Post("push/subscribe")
  @Roles(Role.ADMIN, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "Push obuna bo'lish (qurilma ro'yxatdan o'tadi)" })
  subscribe(
    @CurrentUser("sub") userId: string,
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
    @Headers("user-agent") userAgent?: string,
  ) {
    return this.push.subscribe(userId, body, userAgent);
  }

  @Delete("push/subscribe")
  @Roles(Role.ADMIN, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "Push obunani bekor qilish" })
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.push.unsubscribe(body.endpoint);
  }
}
