import { Controller, Get, Patch, Body } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@aqua/shared";

@ApiTags("Settings")
@ApiBearerAuth()
@Controller({ path: "settings", version: "1" })
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.DRIVER)
  @ApiOperation({ summary: "Sozlamalar (narxlar, hududlar)" })
  getAll() {
    return this.settingsService.getAll();
  }

  @Patch()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Sozlamalarni yangilash" })
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}
