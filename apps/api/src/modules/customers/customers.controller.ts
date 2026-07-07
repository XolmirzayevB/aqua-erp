import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { QueryCustomersDto } from "./dto/query-customers.dto";
import { AddPaymentDto } from "./dto/add-payment.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "@aqua/shared";

@ApiTags("Customers")
@ApiBearerAuth()
@Controller({ path: "customers", version: "1" })
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Yangi mijoz qo'shish" })
  create(@Body() dto: CreateCustomerDto, @CurrentUser("sub") userId: string) {
    return this.customersService.create(dto, userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "Barcha mijozlar (qidiruv + pagination)" })
  findAll(@Query() query: QueryCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Post("resolve-locations")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Barcha mijozlar lokatsiya havolasidan koordinata ajratish (backfill)" })
  resolveLocations() {
    return this.customersService.resolveAllLocations();
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Mijoz ma'lumotlari" })
  @ApiParam({ name: "id", type: "string" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Get(":id/stats")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Mijoz statistikasi" })
  getStats(@Param("id", ParseUUIDPipe) id: string) {
    return this.customersService.getStats(id);
  }

  @Get(":id/orders")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Mijoz buyurtmalari tarixi" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  getOrders(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.customersService.getOrders(id, page, limit);
  }

  @Get(":id/payments")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Mijoz to'lovlar tarixi" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  getPayments(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.customersService.getPayments(id, page, limit);
  }

  @Post(":id/payments")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Mijozdan to'lov qabul qilish" })
  addPayment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddPaymentDto,
    @CurrentUser("sub") userId: string,
  ) {
    return this.customersService.addPayment(id, dto, userId);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Mijozni tahrirlash" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Mijozni o'chirish (soft delete)" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.customersService.remove(id);
  }
}
