# 🤝 AquaERP — HANDOFF (yangi Claude Code sessiyasi uchun to'liq qo'llanma)

> Bu hujjat butun loyihaning holatini, kirish ma'lumotlarini, arxitekturani va
> davom ettirish yo'llarini o'z ichiga oladi. Yangi sessiya shu fayldan boshlansa
> — hech narsa qidirmasdan aynan qolgan joydan davom eta oladi.
>
> **Til:** foydalanuvchi (biznes egasi) — o'zbekcha gapiradi, texnik emas.
> Javoblar o'zbek tilida, sodda bo'lsin. Kod izohlar o'zbekcha/inglizcha aralash.

---

## 1. Loyiha nima?

**AquaERP** — 19 litrlik suv yetkazib berish biznesi uchun to'liq ERP/CRM tizimi.
Biznesni foydalanuvchining dadasi va do'stlari yuritadi. Kichik shahar, suv yetkazib berish.

Tizim JONLI ishlab turibdi va real ishlatilmoqda.

**Asosiy biznes qoidasi (ENG MUHIM — buni yaxshi tushun):**
- Mijoz tarani (bo'sh idish) **sotib oladi**: yangi tara narxi (default **45 000**, sozlamada o'zgaradi).
- Keyingi safar bo'sh tarasini beradi, to'lasini oladi — **almashtirish/to'ldirish** (default **12 000**).
- Mijoz o'zidagidan **ko'p** tara olmoqchi bo'lsa — qo'shimchasini yangi tara sifatida sotib oladi.
- Har mijozning `bottlesOwned` (nechta tarasi bor) hisoblanadi.
- **Buyurtma formasi avtomatik ajratadi:** operator faqat "nechta tara" deб kiritadi →
  `refillCount = min(deliverCount, owned)`, `newBottles = max(0, deliverCount - owned)`.

**Hududlar:** A, B, C, D, G (Sozlamalarda o'zgartiriladi). Mijoz hududga biriktiriladi.

**Rollar (RBAC):**
- `ADMIN` — hammasi
- `MANAGER` — deyarli hammasi
- `OPERATOR` — faqat Mijozlar, Buyurtmalar, Qarzdorlik (Dashboard/Ombor menyuda YO'Q). Login → `/customers`
- `DRIVER` — faqat Buyurtmalar (o'ziga biriktirilganlar), zakaz yoza OLMAYDI. Login → `/orders`

---

## 2. KIRISH MA'LUMOTLARI (Access)

### Server (Hetzner)
- **IP:** `116.203.220.83`
- **Provayder:** Hetzner Cloud CX23 (2 vCPU, 4GB RAM), Ubuntu 24.04
- **SSH:** `ssh root@116.203.220.83` — kalit: `~/.ssh/id_ed25519` (parolsiz, tayyor)
- **Deploy papkasi:** `/opt/aqua-erp`

### Jonli sayt
- **URL:** https://116-203-220-83.nip.io  (bepul HTTPS, Caddy avtomatik SSL, nip.io subdomen)
- HTTP → HTTPS avtomatik. Sertifikat avtomatik yangilanadi.

### GitHub
- **Repo:** https://github.com/XolmirzayevB/aqua-erp  (private, branch: `main`)
- Push uchun: username `XolmirzayevB` + **Personal Access Token** (`workflow` scope YO'Q edi — shuning uchun `.github/workflows/` gitignore qilingan)
- ⚠️ **Diqqat:** lokalда commit qilinmagan o'zgarishlar bor (GitHub ORTDA). Server Eng yangi (tar orqali). Kerak bo'lsa commit + push qiling.

### Parollar / maxfiy kalitlar
- **Prod DB paroli:** `bb936e75d7206e2c8e94d8ce70b1d40b` (server `.env.production` da)
- JWT secretlar — serverда `/opt/aqua-erp/.env.production` da (openssl rand -hex 32 bilan generatsiya qilingan). Lokalда `.env.production` YO'Q (gitignore).
- ⚠️ `.env` va `.env.production` HECH QACHON serverga ko'chirilmaydi (deploy tar'dan chiqarilgan). Server o'z nusxasini saqlaydi.

### Test hisoblar (login)
| Rol | Telefon | Parol |
|-----|---------|-------|
| Admin | +998901234567 | Admin@123 |
| Manager | +998901234568 | Manager@123 |
| Operator | +998901234569 | Operator@123 |
| Haydovchi | +998901234570 | Driver@123 |

> Foydalanuvchi hali test parollarni o'zgartirmagan. Test ma'lumotlar (soxta mijozlar) bazada bor.
> Foydalanuvchi "keyinroq toza reset qilamiz" degan (real ma'lumot dadasidagi daftarda, hozir yo'q).

---

## 3. Arxitektura

**Monorepo:** pnpm + Turborepo. Joylashuvi: `/Users/behruz/aqua-erp`

```
aqua-erp/
├── apps/
│   ├── api/           NestJS 10 (Clean Architecture, modular)
│   │   └── src/modules/  auth, users, customers, orders, drivers,
│   │                     inventory, finance, reports, notifications,
│   │                     dashboard, audit, settings, backup
│   └── web/           Next.js 15 (App Router), React 19, Tailwind, TanStack Query, Zustand
│       └── src/
│           ├── app/(auth)/login, app/(dashboard)/*   sahifalar
│           ├── components/   modul komponentlari
│           ├── hooks/         React Query hooklar (use-*.ts)
│           ├── lib/api.ts     axios + refresh-token interceptor
│           └── store/auth.store.ts  Zustand + persist
├── packages/
│   ├── database/      Prisma schema + migrations + seed
│   └── shared/        umumiy TS tiplar/enumlar
├── caddy/Caddyfile             prod reverse-proxy (auto HTTPS)
├── docker-compose.yml          DEV (postgres:5433, redis:6380, pgadmin:5050)
├── docker-compose.prod.yml     PROD (postgres, redis, api, web, caddy)
└── apps/{api,web}/Dockerfile   multi-stage build
```

**Tech:** NestJS · Next.js 15 · PostgreSQL 16 + Prisma 6 · Redis · Socket.io (real-time) ·
JWT+RBAC · Caddy (HTTPS) · Docker · PWA (o'rnatiladigan ilova).

---

## 4. LOKAL ishga tushirish (dev)

```bash
cd /Users/behruz/aqua-erp
corepack enable && corepack prepare pnpm@9.15.0 --activate   # pnpm kerak bo'lsa
pnpm install
docker compose up -d                                          # postgres :5433, redis :6380

# Prisma (DATABASE_URL kerak — dev):
export DATABASE_URL="postgresql://aqua_user:aqua_pass@localhost:5433/aqua_erp?schema=public"
cd packages/database && npx prisma migrate deploy && npx tsx src/seed.ts && cd ../..

# API (:3001) va Web (:3000) — alohida terminalда yoki background:
cd apps/api && pnpm dev    # NestJS watch
cd apps/web && pnpm dev    # Next.js :3000
```

- Dev `.env` (root) allaqachon bor: DATABASE_URL(5433), REDIS_URL(6380), JWT, portlar.
- **Preview/verifikatsiya:** `mcp__Claude_Preview__preview_start` (name: `web`, .claude/launch.json bor) → login → screenshot. Mobil test uchun `preview_resize` (preset: mobile).
- Lokal build tekshiruvi (deploy'dan oldin SHART): `pnpm --filter @aqua/web build`

---

## 5. DEPLOY jarayoni (aniq qadamlar)

Deploy = kodni tar bilan serverga ko'chirish + Docker rebuild. Migration avtomatik (api CMD `prisma migrate deploy`).

```bash
cd /Users/behruz/aqua-erp

# 1. Kodni serverga ko'chirish (.env fayllarSIZ — server o'znikini saqlaydi!)
tar czf - \
  --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='.turbo' \
  --exclude='.git' --exclude='backups' --exclude='.DS_Store' \
  --exclude='packages/database/src/generated' \
  --exclude='.env' --exclude='.env.production' \
  . | ssh -o ConnectTimeout=25 root@116.203.220.83 "tar xzf - -C /opt/aqua-erp && echo OK"

# 2. Rebuild + restart (fonda — build ~5-8 daqiqa, 2 CPU)
ssh root@116.203.220.83 'cd /opt/aqua-erp && nohup docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build > deploy.log 2>&1 & echo PID:$!'

# 3. ~5 daqiqadan keyin tekshirish:
ssh root@116.203.220.83 'cd /opt/aqua-erp && docker compose -f docker-compose.prod.yml ps'
curl -s -o /dev/null -w "%{http_code}\n" https://116-203-220-83.nip.io/login
```

> Build uzoq — `ScheduleWakeup` (delaySeconds ~270) bilan kutib, keyin tekshirish tavsiya.
> Faqat frontend o'zgarsa ham `--build` ikkalasini qayta quradi (api cache'dan tez).

---

## 6. MUHIM texnik nozikliklar (gotchas — bularni bilmasang vaqt ketadi)

1. **Prisma (pnpm monorepo):** `@prisma/client` — `apps/api` da to'g'ridan-to'g'ri dependency (portable tip yo'li uchun). `packages/database` va `packages/shared` `dist`ga build qilinadi (main → dist/index.js). Enum runtime'da ishlashi uchun paketlar build bo'lishi shart.
2. **AuditInterceptor** — modul-load paytida enum ishlatmaydi (string literal "CREATE" va h.k.). Sabab: Prisma enum modul-load'da undefined bo'lishi mumkin.
3. **Next.js:** `next.config.ts` da `typescript.ignoreBuildErrors: true` + `eslint.ignoreDuringBuilds: true` (build artefakt uchun; tiplar alohida CI'da). `output: standalone`.
4. **next/font/google Docker'da ishlamaydi** (internet yo'q) — Inter fonti `globals.css` da `@import` orqali (runtime). next/font ISHLATMANG.
5. **Next 15:** `[id]` sahifalarда `params` — bu `Promise`. `async function Page({ params }: { params: Promise<{id:string}> }) { const {id} = await params; }`.
6. **Web build NEXT_PUBLIC_API_URL'ni build paytida "pishiradi"** — `.env.production` da `PUBLIC_URL=https://116-203-220-83.nip.io`. Domen o'zgarsa web QAYTA build bo'lishi kerak.
7. **DB parolini yo'qotmang:** agar server `.env.production` ni qayta yozsang, `POSTGRES_PASSWORD` ni ESKI qiymatda saqla (volume o'sha parol bilan init bo'lgan). Joriy parolni olish: `ssh root@... "docker exec aqua_postgres_prod env | grep POSTGRES_PASSWORD"`.
8. **Dev/prod volume nomi:** prod compose'da `name: aqua-erp-prod` bor (dev bilan to'qnashmaslik uchun). Dev `down -v` prod bazani buzMASLIGI uchun.
9. **Buyurtma bekor qilinsa** — tara/ombor/pul QAYTARILADI (`reverseEffects`). ASSIGNED ham bekor qilinadi, DELIVERED bekor qilinmaydi.
10. **Ombor:** `FULL_BOTTLE` inventar yozuvi = "ombordagi tara". Yangi tara sotilsa kamayadi. `intake` bitta son qo'shadi. "Omborda / Mijozlarda / Jami aylanma" ko'rsatiladi.

---

## 7. HOZIRGI HOLAT (2026-yil iyun/iyul holatiga)

✅ **Tugallangan va JONLI (deploy qilingan):**
- Barcha 14 modul (dashboard, mijozlar, buyurtmalar, haydovchilar, ombor, moliya, qarzdorlik, hisobotlar, analytics, foydalanuvchilar/RBAC, audit log, backup, settings, notifications)
- Tara qoidasi (sotib olish/almashtirish, avtomatik ajratish)
- Hududlar (A,B,C,D,G) + mijozga biriktirish + filtr + lokatsiya (Google Maps) linki
- Sozlanadigan narxlar/hududlar (Sozlamalar → Narx va Hududlar)
- Telefon auto-format (+998 90 123 45 67) hamma joyda
- Buyurtma formasi: yangi mijozni bitta formada qo'shib zakaz berish + avtomatik tara ajratish
- Mobil responsive (sidebar → hamburger drawer, to'liq ekran)
- PWA — telefonga o'rnatiladi (iOS Safari "Add to Home Screen", Android Chrome install)
- Bepul HTTPS (Caddy + nip.io + Let's Encrypt)
- Avtomatik backup (har kuni 02:00, pg_dump)
- Real-time (Socket.io) — haydovchiga yangi buyurtma xabari

✅ **So'nggi tuzatishlar (oxirgi sessiya):**
1. Operator menyusidan Dashboard+Ombor olib tashlandi
2. Qo'shimcha telefon ixtiyoriy (bloklamaydi)
3. Butun dastur listlari chiziqlari aniqlashtirildi (`border-gray-100 dark:border-gray-800`)
4. Mijoz "Taralar (uyida)" = `bottlesOwned` (tahrirlanadi); berildi/qaytdi olib tashlandi
5. Mijoz buyurtma tarixida qisqa raqam (1,2,3) uzun ID o'rniga
6. Haydovchilar bo'limi bug'i tuzatildi (DriverCard'da vergul operatori → fragment)

⏳ **Qolgan/ixtiyoriy ishlar (foydalanuvchi keyin so'rashi mumkin):**
- **Toza DB reset** — foydalanuvchi tayyor bo'lganda test ma'lumotni tozalab, 0 dan boshlash.
  Buyruq: `ssh root@... "cd /opt/aqua-erp && docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -c 'cd packages/database && npx prisma migrate reset --force'"` (keyin seed).
- **Test parollarni o'zgartirish** (foydalanuvchiga eslatish — xavfsizlik).
- **Haydovchi o'z kuni (self-service)** — session open/close hozir faqat admin/haydovchilar sahifasida bor; haydovchining o'ziga alohida "kun boshlash/yopish" ekrani QILINMAGAN (backend session logikasi tayyor: `drivers.service` openSession/closeSession).
- **Telegram bot** — yangi buyurtma haydovchiga Telegramga xabar (hali yo'q).
- **GitHub'ni yangilash** — lokalда commit qilinmagan o'zgarishlar bor, push qilinsa yaxshi.

---

## 8. Foydali buyruqlar (server boshqaruvi)

```bash
# Loglar
ssh root@116.203.220.83 "docker logs -f aqua_api_prod"
ssh root@116.203.220.83 "docker logs -f aqua_web_prod"
ssh root@116.203.220.83 "docker logs aqua_caddy_prod | tail -20"   # SSL muammolari

# Holat
ssh root@116.203.220.83 "cd /opt/aqua-erp && docker compose -f docker-compose.prod.yml ps"

# Seed (test hisoblar)
ssh root@116.203.220.83 "docker exec aqua_api_prod sh -c 'cd packages/database && pnpm exec tsx src/seed.ts'"

# Backup UI: Sozlamalar → Backup (yoki avtomatik 02:00)

# API smoke test (token olish):
TOKEN=$(curl -s -X POST https://116-203-220-83.nip.io/api/v1/auth/login -H "Content-Type: application/json" -d '{"phone":"+998901234567","password":"Admin@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
curl -s https://116-203-220-83.nip.io/api/v1/dashboard/stats -H "Authorization: Bearer $TOKEN"
```

## 9. Ishlash uslubi (foydalanuvchi bilan)

- Foydalanuvchi texnik emas — sodda o'zbekcha, qadamma-qadam. Screenshot bilan feedback beradi.
- U ko'pincha telefondан (iPhone) test qiladi — mobil ko'rinishga e'tibor ber.
- Har o'zgarishdан keyin: lokal build → tar deploy → ~5 daq kutib → tekshir → o'zbekcha xulosa.
- "Davom et" desa — qolgan ishni davom ettir.
