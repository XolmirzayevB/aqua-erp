import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { BalancesService } from "./balances.service";
import { CreateTransferDto } from "./dto/create-transfer.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role, JwtPayload } from "@aqua/shared";

@ApiTags("Balances")
@ApiBearerAuth()
@Controller({ path: "balances", version: "1" })
export class BalancesController {
  constructor(private balancesService: BalancesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "Ishchilar pul balansi (rolga qarab ko'rinadi)" })
  getBalances(@CurrentUser() user: JwtPayload) {
    return this.balancesService.getBalances(user);
  }

  @Get("transfers")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "Pul o'tkazmalari (kutilayotgan + tarix)" })
  getTransfers(@CurrentUser() user: JwtPayload) {
    return this.balancesService.getTransfers(user);
  }

  // Menejer pul o'tkaza olmaydi (read-only) — rollarga kirmagan
  @Post("transfers")
  @Roles(Role.ADMIN, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "Boshqa ishchiga pul o'tkazish (qabul kutiladi)" })
  createTransfer(@Body() dto: CreateTransferDto, @CurrentUser() user: JwtPayload) {
    return this.balancesService.createTransfer(dto, user);
  }

  @Patch("transfers/:id/accept")
  @Roles(Role.ADMIN, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "O'tkazmani qabul qilish (faqat qabul qiluvchi)" })
  accept(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.balancesService.acceptTransfer(id, user);
  }

  @Patch("transfers/:id/reject")
  @Roles(Role.ADMIN, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "O'tkazmani rad etish — pul yuboruvchiga qaytadi" })
  reject(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.balancesService.rejectTransfer(id, user);
  }

  @Patch("transfers/:id/cancel")
  @Roles(Role.ADMIN, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "O'tkazmani bekor qilish (faqat yuboruvchi)" })
  cancel(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.balancesService.cancelTransfer(id, user);
  }
}
