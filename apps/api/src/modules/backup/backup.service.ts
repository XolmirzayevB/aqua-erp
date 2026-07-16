import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

// pg_dump/psql ulanish URI'sida Prisma'ning `?schema=public` (va boshqa)
// query paramlarini QABUL QILMAYDI ("invalid URI query parameter: schema").
// Ular olib tashlanadi — to'liq baza (public sxema ichida) baribir olinadi.
function stripQuery(dbUrl: string): string {
  const q = dbUrl.indexOf("?");
  return q === -1 ? dbUrl : dbUrl.slice(0, q);
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.resolve(process.cwd(), "backups");

  constructor(private config: ConfigService) {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Auto backup every day at 02:00
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledBackup() {
    this.logger.log("Avtomatik backup boshlandi...");
    try {
      const file = await this.createBackup();
      this.logger.log(`Backup yaratildi: ${file}`);
      await this.cleanOldBackups(14); // keep 14 days
    } catch (e) {
      this.logger.error("Backup xatosi", e);
    }
  }

  async createBackup(): Promise<string> {
    const dbUrl = this.config.get<string>("DATABASE_URL");
    if (!dbUrl) throw new BadRequestException("DATABASE_URL topilmadi");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    await execAsync(`pg_dump "${stripQuery(dbUrl)}" -f "${filepath}" --no-owner --no-acl`);
    return filename;
  }

  async listBackups() {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs
      .readdirSync(this.backupDir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => {
        const stat = fs.statSync(path.join(this.backupDir, f));
        return {
          filename: f,
          size: stat.size,
          sizeFormatted: this.formatSize(stat.size),
          createdAt: stat.mtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async restoreBackup(filename: string) {
    // Prevent path traversal
    if (filename.includes("/") || filename.includes("..")) {
      throw new BadRequestException("Noto'g'ri fayl nomi");
    }
    const filepath = path.join(this.backupDir, filename);
    if (!fs.existsSync(filepath)) throw new NotFoundException("Backup fayli topilmadi");

    const dbUrl = this.config.get<string>("DATABASE_URL");
    await execAsync(`psql "${stripQuery(dbUrl!)}" -f "${filepath}"`);
    return { message: "Backup tiklandi" };
  }

  async deleteBackup(filename: string) {
    if (filename.includes("/") || filename.includes("..")) {
      throw new BadRequestException("Noto'g'ri fayl nomi");
    }
    const filepath = path.join(this.backupDir, filename);
    if (!fs.existsSync(filepath)) throw new NotFoundException("Backup fayli topilmadi");
    fs.unlinkSync(filepath);
    return { message: "Backup o'chirildi" };
  }

  getBackupPath(filename: string): string {
    if (filename.includes("/") || filename.includes("..")) {
      throw new BadRequestException("Noto'g'ri fayl nomi");
    }
    const filepath = path.join(this.backupDir, filename);
    if (!fs.existsSync(filepath)) throw new NotFoundException("Backup fayli topilmadi");
    return filepath;
  }

  private async cleanOldBackups(keepDays: number) {
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
    const backups = await this.listBackups();
    for (const b of backups) {
      if (b.createdAt.getTime() < cutoff) {
        fs.unlinkSync(path.join(this.backupDir, b.filename));
        this.logger.log(`Eski backup o'chirildi: ${b.filename}`);
      }
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
