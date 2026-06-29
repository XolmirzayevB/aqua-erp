import { Controller, Get, Post, Delete, Param, Res } from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { BackupService } from "./backup.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@aqua/shared";

@ApiTags("Backup")
@ApiBearerAuth()
@Controller({ path: "backup", version: "1" })
export class BackupController {
  constructor(private backupService: BackupService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Backuplar ro'yxati" })
  list() {
    return this.backupService.listBackups();
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Yangi backup yaratish (qo'lda)" })
  async create() {
    const filename = await this.backupService.createBackup();
    return { message: "Backup yaratildi", filename };
  }

  @Get("download/:filename")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Backupni yuklab olish" })
  download(@Param("filename") filename: string, @Res() res: Response) {
    const filepath = this.backupService.getBackupPath(filename);
    res.download(filepath);
  }

  @Post("restore/:filename")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Backupdan tiklash" })
  restore(@Param("filename") filename: string) {
    return this.backupService.restoreBackup(filename);
  }

  @Delete(":filename")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Backupni o'chirish" })
  remove(@Param("filename") filename: string) {
    return this.backupService.deleteBackup(filename);
  }
}
