import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as webpush from "web-push";
import { PrismaService } from "../../prisma/prisma.service";

export interface PushPayload {
  title: string;
  body: string;
  url?: string; // bosilganda ochiladigan sahifa
  tag?: string; // bir xil tag — eski xabarni almashtiradi
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = this.config.get<string>("VAPID_PRIVATE_KEY");
    if (publicKey && privateKey) {
      webpush.setVapidDetails("mailto:behruzxolmirzayev7@gmail.com", publicKey, privateKey);
      this.enabled = true;
    } else {
      this.logger.warn("VAPID kalitlari yo'q — push xabarnoma o'chirilgan");
    }
  }

  getPublicKey(): string | null {
    return this.config.get<string>("VAPID_PUBLIC_KEY") ?? null;
  }

  async subscribe(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string) {
    // endpoint unique — qayta obuna bo'lsa egasini yangilaymiz
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: userAgent?.slice(0, 255),
      },
      update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    return { subscribed: true };
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { unsubscribed: true };
  }

  /** Foydalanuvchining barcha qurilmalariga push yuboradi. Xato bo'lsa jim davom etadi. */
  async sendToUser(userId: string, payload: PushPayload) {
    if (!this.enabled) return;
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
          );
        } catch (err: any) {
          // 404/410 — obuna eskirgan (ilova o'chirilgan) — bazadan tozalaymiz
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await this.prisma.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
          } else {
            this.logger.warn(`Push yuborilmadi (${userId}): ${err?.message ?? err}`);
          }
        }
      }),
    );
  }
}
