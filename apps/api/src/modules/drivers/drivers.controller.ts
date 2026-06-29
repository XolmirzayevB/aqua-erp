import {
  Controller, Get, Post, Patch, Body, Param, Query, ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { DriversService } from "./drivers.service";
import { CreateDriverDto } from "./dto/create-driver.dto";
import { OpenSessionDto } from "./dto/open-session.dto";
import { CloseSessionDto } from "./dto/close-session.dto";
import { QueryReportDto } from "./dto/query-report.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "@aqua/shared";

@ApiTags("Drivers")
@ApiBearerAuth()
@Controller({ path: "drivers", version: "1" })
export class DriversController {
  constructor(private driversService: DriversService) {}

  // ─── Driver management ────────────────────────────────────────────────────

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Yangi haydovchi qo'shish" })
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Barcha haydovchilar" })
  findAll() {
    return this.driversService.findAll();
  }

  @Get("report/all")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Barcha haydovchilar umumiy hisobot" })
  getAllReport(@Query() query: QueryReportDto) {
    return this.driversService.getAllDriversReport(query);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Haydovchi ma'lumotlari" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(":id/toggle-active")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Haydovchini faol/nofaol qilish" })
  toggleActive(@Param("id", ParseUUIDPipe) id: string) {
    return this.driversService.toggleActive(id);
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  @Post(":id/session/open")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "Kun boshida sessiya ochish" })
  openSession(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: OpenSessionDto,
  ) {
    return this.driversService.openSession(id, dto);
  }

  @Post(":id/session/close")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "Kun oxirida sessiyani yopish" })
  closeSession(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CloseSessionDto,
  ) {
    return this.driversService.closeSession(id, dto);
  }

  @Get(":id/session/today")
  @ApiOperation({ summary: "Bugungi sessiya holati" })
  getTodaySession(@Param("id", ParseUUIDPipe) id: string) {
    return this.driversService.getTodaySession(id);
  }

  @Get(":id/sessions")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Haydovchi sessiyalar tarixi" })
  getSessions(@Param("id", ParseUUIDPipe) id: string) {
    return this.driversService.getSessions(id);
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  @Get(":id/report")
  @Roles(Role.ADMIN, Role.MANAGER, Role.DRIVER)
  @ApiOperation({ summary: "Haydovchi hisoboti (kunlik/haftalik/oylik)" })
  getReport(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: QueryReportDto,
  ) {
    return this.driversService.getReport(id, query);
  }

  // Driver can access their own data
  @Get("me/session/today")
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: "Haydovchining o'z bugungi sessiyasi" })
  myTodaySession(@CurrentUser("sub") userId: string) {
    return this.driversService.getTodaySession(userId);
  }

  @Post("me/session/open")
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: "Haydovchi o'zi sessiya ochadi" })
  myOpenSession(@CurrentUser("sub") userId: string, @Body() dto: OpenSessionDto) {
    return this.driversService.openSession(userId, dto);
  }

  @Post("me/session/close")
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: "Haydovchi o'zi sessiyani yopadi" })
  myCloseSession(@CurrentUser("sub") userId: string, @Body() dto: CloseSessionDto) {
    return this.driversService.closeSession(userId, dto);
  }

  @Get("me/report")
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: "Haydovchi o'z hisobotini ko'radi" })
  myReport(@CurrentUser("sub") userId: string, @Query() query: QueryReportDto) {
    return this.driversService.getReport(userId, query);
  }
}
