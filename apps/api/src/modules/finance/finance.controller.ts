import {
  Controller, Get, Post, Body, Query, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { FinanceService } from "./finance.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { QueryFinanceDto, SummaryQueryDto } from "./dto/query-finance.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "@aqua/shared";

@ApiTags("Finance")
@ApiBearerAuth()
@Controller({ path: "finance", version: "1" })
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Post("transactions")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Yangi tranzaksiya (kirim/chiqim/ish haqi)" })
  create(@Body() dto: CreateTransactionDto, @CurrentUser("sub") userId: string) {
    return this.financeService.create(dto, userId);
  }

  @Get("transactions")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Tranzaksiyalar ro'yxati" })
  findAll(@Query() query: QueryFinanceDto) {
    return this.financeService.findAll(query);
  }

  @Get("summary")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Moliyaviy xulosa (kunlik/oylik/yillik)" })
  getSummary(@Query() query: SummaryQueryDto) {
    return this.financeService.getSummary(query);
  }

  @Get("categories")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Kategoriyalar bo'yicha xulosa" })
  getCategories() {
    return this.financeService.getCategories();
  }

  @Get("debts")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Qarzdor mijozlar" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "search", required: false })
  getDebts(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("search") search?: string,
  ) {
    return this.financeService.getDebts(page, 20, search);
  }
}
