import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@aqua/shared";

@ApiTags("Dashboard")
@ApiBearerAuth()
@Controller({ path: "dashboard", version: "1" })
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get("stats")
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: "Dashboard statistikasi" })
  getStats() {
    return this.dashboardService.getStats();
  }
}
