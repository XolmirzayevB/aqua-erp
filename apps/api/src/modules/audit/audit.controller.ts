import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { AuditService } from "./audit.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@aqua/shared";

@ApiTags("Audit")
@ApiBearerAuth()
@Controller({ path: "audit", version: "1" })
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Audit log (faqat admin)" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "entity", required: false })
  @ApiQuery({ name: "action", required: false })
  @ApiQuery({ name: "limit", required: false })
  findAll(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query("entity") entity?: string,
    @Query("action") action?: string,
    @Query("userId") userId?: string,
  ) {
    return this.auditService.findAll({
      page, limit: Math.min(Math.max(limit, 1), 500), entity, action, userId,
    });
  }

  @Get("entities")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Audit qilingan obyektlar ro'yxati" })
  getEntities() {
    return this.auditService.getEntities();
  }
}
