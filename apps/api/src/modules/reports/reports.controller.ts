import {
  Controller, Get, Query, Res, Header,
} from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { ExportService } from "./export.service";
import { ReportQueryDto, TopQueryDto } from "./dto/query-report.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@aqua/shared";
import { format } from "date-fns";

@ApiTags("Reports")
@ApiBearerAuth()
@Controller({ path: "reports", version: "1" })
export class ReportsController {
  constructor(
    private reportsService: ReportsService,
    private exportService: ExportService,
  ) {}

  @Get("overview")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Umumiy hisobot (davr bo'yicha)" })
  getOverview(@Query() query: ReportQueryDto) {
    return this.reportsService.getOverview(query);
  }

  @Get("top-customers")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Eng ko'p xarid qilgan mijozlar" })
  getTopCustomers(@Query() query: TopQueryDto) {
    return this.reportsService.getTopCustomers(query);
  }

  @Get("top-drivers")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Eng yaxshi haydovchilar" })
  getTopDrivers(@Query() query: TopQueryDto) {
    return this.reportsService.getTopDrivers(query);
  }

  @Get("top-regions")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Eng faol hududlar" })
  getTopRegions(@Query() query: TopQueryDto) {
    return this.reportsService.getTopRegions(query);
  }

  @Get("debt-payments")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Qarz to'lovlari — kim qancha to'lagani" })
  getDebtPayments(@Query() query: ReportQueryDto) {
    return this.reportsService.getDebtPayments(query);
  }

  @Get("export/excel")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Excel eksport" })
  async exportExcel(@Query() query: ReportQueryDto, @Res() res: Response) {
    const buffer = await this.exportService.toExcel(query);
    const filename = `aquaerp-hisobot-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Get("export/pdf")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "PDF eksport" })
  async exportPdf(@Query() query: ReportQueryDto, @Res() res: Response) {
    const buffer = await this.exportService.toPdf(query);
    const filename = `aquaerp-hisobot-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
