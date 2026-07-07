import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Role } from "@aqua/shared";

// Menejer = FAQAT KO'RISH. Barcha o'zgartiruvchi so'rovlar (POST/PATCH/PUT/DELETE)
// bloklanadi — hech narsa yarata/tahrirlab/o'chira olmaydi.
// Istisno: /auth/* (tizimdan chiqish/logout kabi) doim ruxsat.
const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

@Injectable()
export class ManagerReadOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    // Faqat menejerga taalluqli
    if (!user || user.role !== Role.MANAGER) return true;
    // Ko'rish (GET/HEAD/OPTIONS) — ruxsat
    if (!MUTATING.has(req.method)) return true;
    // Auth (logout) — ruxsat
    const url: string = req.originalUrl || req.url || "";
    if (url.includes("/auth/")) return true;
    throw new ForbiddenException("Menejer faqat ko'rish huquqiga ega — o'zgartirish mumkin emas");
  }
}
