import {
  Controller, Get, Post, Body, Query, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { InventoryService } from "./inventory.service";
import { AdjustInventoryDto } from "./dto/adjust-inventory.dto";
import { IntakeDto } from "./dto/intake.dto";
import { MoveStockDto } from "./dto/move-stock.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@aqua/shared";

@ApiTags("Inventory")
@ApiBearerAuth()
@Controller({ path: "inventory", version: "1" })
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Ombor holati (umumiy)" })
  getOverview() {
    return this.inventoryService.getOverview();
  }

  @Get("history")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Ombor harakatlari tarixi" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "type", required: false })
  getHistory(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query("type") type?: string,
  ) {
    return this.inventoryService.getHistory(page, limit, type);
  }

  @Post("intake")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Yetkazib beruvchidan qabul qilish" })
  intake(@Body() dto: IntakeDto) {
    return this.inventoryService.intake(dto);
  }

  @Post("adjust")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Qo'lda tuzatish" })
  adjust(@Body() dto: AdjustInventoryDto) {
    return this.inventoryService.adjust(dto);
  }

  @Post("move")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Bo'sh tarani singan/yo'qolganga o'tkazish" })
  moveStock(@Body() dto: MoveStockDto) {
    return this.inventoryService.moveStock(dto);
  }
}
