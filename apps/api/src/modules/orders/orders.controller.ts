import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { AssignDriverDto } from "./dto/assign-driver.dto";
import { QueryOrdersDto } from "./dto/query-orders.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "@aqua/shared";
import { JwtPayload } from "@aqua/shared";

@ApiTags("Orders")
@ApiBearerAuth()
@Controller({ path: "orders", version: "1" })
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Yangi buyurtma yaratish (faqat operator/menejer/admin)" })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser("sub") userId: string,
  ) {
    return this.ordersService.create(dto, userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "Buyurtmalar ro'yxati (filter + pagination)" })
  findAll(@Query() query: QueryOrdersDto, @CurrentUser() user: JwtPayload) {
    // Haydovchi faqat o'ziga biriktirilgan buyurtmalarni ko'radi
    if (user.role === Role.DRIVER) {
      query.driverId = user.sub;
    }
    return this.ordersService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Buyurtma tafsilotlari" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Buyurtma statusini o'zgartirish" })
  updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.updateStatus(id, dto, user.sub, user.role);
  }

  @Patch(":id/assign")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Buyurtmaga haydovchi biriktirish" })
  assignDriver(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignDriverDto,
  ) {
    return this.ordersService.assignDriver(id, dto);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Buyurtmani tahrirlash" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Buyurtmani bekor qilish" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.ordersService.remove(id);
  }

  @Get("driver/:driverId")
  @ApiOperation({ summary: "Haydovchi buyurtmalari (sanaga ko'ra)" })
  @ApiQuery({ name: "date", required: false, example: "2025-01-15" })
  getDriverOrders(
    @Param("driverId", ParseUUIDPipe) driverId: string,
    @Query("date") date?: string,
  ) {
    return this.ordersService.getDriverOrders(driverId, date);
  }
}
