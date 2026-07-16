import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import * as bcrypt from "bcrypt";
import { createHash, randomUUID } from "crypto";

// SESSIYA SIYOSATI (2026-07-16, egasi so'rovi):
// - Foydalanuvchi logout qilmaguncha (yoki ilovani o'chirmaguncha) TIZIMDAN
//   CHIQIB KETMASLIGI kerak. Refresh token muddati uzun (365d, env'da).
// - HAR QURILMA alohida: refresh tokenlar refresh_tokens jadvalida (bir hisob
//   telefon + kompyuterda bir vaqtda ishlayveradi, biri ikkinchisini chiqarmaydi).
// - Refresh'da token AYLANTIRILMAYDI (rotation yo'q) — parallel so'rovlar
//   (ikki tab, PWA) bir-birini bekor qilib foydalanuvchini chiqarib yubormasin.
// - Logout faqat SHU qurilmaning tokenini o'chiradi.
const MAX_SESSIONS_PER_USER = 10; // bir hisobga eng ko'p qurilma

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService
  ) {}

  // Refresh token SHA-256 bilan saqlanadi (bcrypt EMAS!).
  // Sabab: bcrypt faqat birinchi 72 baytni ko'radi — bir foydalanuvchining
  // barcha JWT'lari bir xil boshlanadi, hammasi hammasiga "mos" chiqib qolardi.
  // SHA-256 to'liq tokenni oladi + indeksli aniq qidiruvga yo'l ochadi.
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async login(dto: LoginDto, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri");
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    // Yangi qurilma sessiyasi — o'z qatori bilan
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(tokens.refreshToken),
        userAgent: userAgent?.slice(0, 255),
      },
    });
    // Juda eski/ortiqcha sessiyalarni tozalash (oxirgi 10 tasi qoladi)
    const extras = await this.prisma.refreshToken.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      skip: MAX_SESSIONS_PER_USER,
      select: { id: true },
    });
    if (extras.length > 0) {
      await this.prisma.refreshToken.deleteMany({
        where: { id: { in: extras.map((e) => e.id) } },
      });
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get("JWT_REFRESH_SECRET"),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || !user.isActive) {
        throw new UnauthorizedException("Yaroqsiz token");
      }

      // Shu qurilmaning sessiyasini topamiz (SHA-256 — aniq, indeksli qidiruv)
      let matched = await this.prisma.refreshToken.findFirst({
        where: { userId: user.id, tokenHash: this.hashToken(refreshToken) },
        select: { id: true },
      });

      // O'TISH DAVRI: eski tizimda token users.refresh_token da (bcrypt) yagona edi.
      // Shunday qurilma kelsa — chiqarmasdan yangi jadvalga ko'chirib olamiz.
      if (!matched && user.refreshToken) {
        const legacyOk = await bcrypt.compare(refreshToken, user.refreshToken);
        if (legacyOk) {
          matched = await this.prisma.refreshToken.create({
            data: {
              userId: user.id,
              tokenHash: this.hashToken(refreshToken),
              userAgent: "legacy-migrated",
            },
            select: { id: true },
          });
          await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: null },
          });
        }
      }

      if (!matched) throw new UnauthorizedException("Yaroqsiz token");

      // Sessiya tirikligini belgilaymiz (updatedAt yangilanadi) — tozalashda
      // faol qurilmalar o'chib ketmasligi uchun. Token O'ZGARMAYDI (rotation yo'q).
      await this.prisma.refreshToken.update({
        where: { id: matched.id },
        data: { updatedAt: new Date() },
      });

      // Faqat yangi ACCESS token beriladi; refresh token o'sha-o'sha qoladi
      const accessToken = await this.jwtService.signAsync(
        { sub: user.id, phone: user.phone, role: user.role },
        {
          secret: this.config.get("JWT_SECRET"),
          expiresIn: this.config.get("JWT_EXPIRES_IN", "15m"),
        }
      );

      return { accessToken, refreshToken };
    } catch {
      throw new UnauthorizedException("Token muddati o'tgan yoki yaroqsiz");
    }
  }

  // Logout — FAQAT shu qurilmaning sessiyasi o'chadi (refreshToken berilsa).
  // Berilmasa (eski klient) — xavfsizlik uchun barcha sessiyalar o'chadi.
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, tokenHash: this.hashToken(refreshToken) },
      });
      return { message: "Muvaffaqiyatli chiqildi" };
    }
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.user.update({ where: { id: userId }, data: { refreshToken: null } }),
    ]);
    return { message: "Muvaffaqiyatli chiqildi" };
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, role: true, isActive: true, createdAt: true },
    });
  }

  private async generateTokens(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get("JWT_SECRET"),
        expiresIn: this.config.get("JWT_EXPIRES_IN", "15m"),
      }),
      // jti — har token UNIKAL bo'lsin (bir soniyada ikki login ham farqlansin)
      this.jwtService.signAsync({ ...payload, jti: randomUUID() }, {
        // Uzun muddat: qurilma logout qilmaguncha chiqib ketmasin (default 365 kun)
        secret: this.config.get("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get("JWT_REFRESH_EXPIRES_IN", "365d"),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
