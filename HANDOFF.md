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

**Rollar (RBAC) — 2026-07-04 da qayta belgilangan:**
- `ADMIN` — hammasi (egasi/superuser).
- `MANAGER` — **FAQAT KO'RISH** (hech narsa yarata/tahrirlab/o'chira olmaydi). Ko'radigan panellar: Boshqaruv paneli, Mijozlar, Ombor, Moliya, Qarzdorlik, Hisobotlar, Tahlil. Buyurtmalar/Haydovchilar/Tizim menyuda YO'Q. Enforcement: global `ManagerReadOnlyGuard` (apps/api/.../common/guards) barcha POST/PATCH/PUT/DELETE ni bloklaydi (istisno /auth logout); frontend `usePermissions().readOnly` tugmalarni yashiradi.
- `OPERATOR` — Mijozlar, Buyurtmalar, Qarzdorlik. **Zakazni FAQAT operator (+admin) yozadi.** "Yetkazildi"ni bosa OLMAYDI. Login → `/customers`.
- `DRIVER` — faqat Buyurtmalar (o'ziga biriktirilganlar). Zakaz yoza OLMAYDI. **"Yetkazildi"ni FAQAT haydovchi (o'z buyurtmasi) + admin bosadi.** Login → `/orders`. Mijoz ustiga bossa → buyurtma tafsilotiga o'tadi (u yerda mijoz tel/manzil/lokatsiya bor; haydovchi /customers ga kira olmaydi).
- Frontend ruxsatlar bitta joyda: `apps/web/src/hooks/use-permissions.ts` (readOnly, canCreateOrder, canManageOrders, canDeliver).

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
- ✅ **2026-07-13 holati:** lokal = GitHub = server, hammasi sinxron. Har o'zgarishdan keyin commit + push qiling.

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
| Haydovchi (Aziz aka) | +998908585858 | *(egasi o'zi belgilagan)* |

> Prod'da 5 ta foydalanuvchi bor (yuqoridagilar). "Aziz aka" — egasi o'zi qo'shgan real haydovchi, parolini biz bilmaymiz.
> Test parollar hali almashtirilmagan — real ishga o'tganda har kishiga alohida hisob + yangi parol yaratiladi (egasi shunday reja qilgan).

### ⚠️ BAZA TOZALANDI (2026-07-10) — toza sinov boshlandi
> Egasi so'rovi bilan prod baza 0 dan boshlandi: mijozlar/buyurtmalar/tranzaksiyalar/to'lovlar = 0, ombor = 0.
> **Saqlangan:** users (5 login), settings (narx/hudud). **Zaxira nusxa:** `/opt/aqua-erp/backups/before_reset_20260710_000053.sql` (kerak bo'lsa qaytarish uchun).
> Egasi 10 ta mijoz + ombor soni bilan qo'lda test qiladi. Tozalash buyrug'i (kelajakda kerak bo'lsa):
> `printf 'BEGIN;\nTRUNCATE TABLE audit_logs, customers, driver_sessions, inventory_actions, notifications, orders, payments, push_subscriptions, transactions RESTART IDENTITY CASCADE;\nUPDATE inventory SET quantity = 0;\nCOMMIT;\n' | ssh root@116.203.220.83 'docker exec -i aqua_postgres_prod psql -U aqua_user -d aqua_erp'`

### Boshlash yo'llanmasi (egaga berilgan)
> To'liq onboarding qo'llanma Artifact sifatida chop etilgan (login/parol, Android o'rnatish, birinchi qadamlar, ombor/qarz mantiqi):
> https://claude.ai/code/artifact/ea18fed7-a8ea-428c-a48f-ef7211cc780a
> Yangilash kerak bo'lsa: `scratchpad/aquaerp-guide.html` ni tahrirlab, xuddi shu URL bilan qayta Artifact qiling.

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

# ⚠️⚠️ MUHIM — DEPLOY XATOSI (2026-07-04 da yuz bergan, takrorlamang!):
# Bash CWD ko'pincha /Users/behruz (UY papkasi), aqua-erp EMAS!
# `tar ... .` ni oddiy ishlatsangiz — BUTUN UY PAPKASI (20G Android SDK,
# Documents, .ssh kalitlari!) serverga tushib, DISKNI TO'LDIRADI.
# Yechim: HAR DOIM `tar -C /Users/behruz/aqua-erp` (CWD'ga bog'liq bo'lmaydi)
# + `COPYFILE_DISABLE=1 --no-mac-metadata` (macOS ._* junk'siz).
```bash
# 1. Kodni serverga ko'chirish (.env fayllarSIZ — server o'znikini saqlaydi!)
COPYFILE_DISABLE=1 tar --no-mac-metadata -C /Users/behruz/aqua-erp -czf - \
  --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='.turbo' \
  --exclude='.git' --exclude='backups' --exclude='.DS_Store' \
  --exclude='packages/database/src/generated' \
  --exclude='.env' --exclude='.env.production' \
  . | ssh -o ConnectTimeout=30 -o ServerAliveInterval=15 root@116.203.220.83 "tar xzf - -C /opt/aqua-erp && echo OK && du -sh /opt/aqua-erp"
# du ~3-4M chiqishi kerak. Agar yuzlab MB/GB bo'lsa — uy papkasi ketgan, TO'XTATING.

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

✅ **DEPLOY QILINDI (2026-07-14):** Barcha to'plamlar (`d1da058` gacha — haydovchi UX2, brend qizil+formalar, moliya/timezone/logistika) JONLI serverga chiqarildi va tasdiqlandi: konteynerlar qayta qurildi, sayt 200/201, dashboard `pendingCount`/`pendingAmount` maydonlari jonli, CSS'da `#B93B3B` bor. Egasi qizil rangni ko'rib, yoqmasa boshqasiga o'zgartirish mumkin (`tailwind.config.ts` → `brandRed`, bitta joy).

✅ **MOLIYA MANTIG'I + timezone + logistika (2026-07-14, DEPLOY QILINDI) — MUHIM:**
- **TUSHUM ENDI YETKAZILGANDA YOZILADI** (egasi so'rovi): INCOME tranzaksiya buyurtma YARATILGANDA emas, `updateStatus(DELIVERED)`da yoziladi (orders.service; naqd/karta; DEBT avvalgidek faqat to'lovda). **Idempotent** — orderId bo'yicha mavjud INCOME tekshiriladi (eski ochiq buyurtmalar yetkazilganda ikki marta yozilmaydi). Bekor qilishda `transaction.deleteMany({orderId})` avvalgidek. DEBT balans mexanikasi O'ZGARMAGAN (yaratishda kamayadi) — faqat INCOME ko'chirildi.
- **"Kutilayotgan pul" ko'rsatkichi:** dashboard stats + finance summary'da `pendingCount`/`pendingAmount` (NEW/PROCESSING/ASSIGNED zakazlar soni+summasi, sanasidan qat'i nazar). Dashboard xulosa qayta qurildi: 4 chip (Bugun yozildi/Bugun yetkazildi/Yo'lda/Bekor) + 2 pul bloki (yashil "Bugungi tushum (kelgan pul)" + sariq "Kutilmoqda (N ta yo'lda)"). Moliya sahifasida 5-karta "Yo'lda (kutilmoqda)".
- **TIMEZONE tuzatildi (butun backend):** yangi `apps/api/src/common/utils/date.util.ts` (localDayRange/toLocal/fromLocal, UTC+5). Qo'llangan: dashboard.service (bugun 05:00 gacha kechagi sonlar chiqish XATOSI — egasi 14-iyulda "1 buyurtma/6 yetkazildi" ko'rgan), reports getRange (barcha davrlar), finance getSummary + chart bucketlari, orders.getDriverOrders, getMyTodayExpenses. Dashboard todayOrders endi CANCELLED'ni sanamaydi.
- **HISOBOT KUN TANLASH:** reports sahifasida date-picker (tanlansa davr tablari yashirinadi, × bilan qaytadi) → dateFrom=dateTo. **Semantika:** suv/tara/revenue endi deliveredAt bo'yicha (12-da yozilib 13-da yetkazilgan — 13-ning hisobotida); "Yozilgan buyurtmalar" createdAt bo'yicha (bekorsiz). useReportOverview/useDebtPayments hook'lari `day` param oladi. TopRegions ham deliveredAt.
- **HAYDOVCHI ALMASHTIRISH:** assignDriver endi ASSIGNED'ni ham qabul qiladi (cheksiz almashtirish; DELIVERED/CANCELLED'da yo'q; o'sha haydovchiga qayta biriktirishga 400). Eski haydovchiga push+socket "zakaz sizdan olindi". UI: orders-table karta "Almashtirish" tugmasi, desktop jadvalda haydovchi ismini bosish ham modal ochadi, order-detail avvaldan tayyor edi.
- **Mijozlar jadvalida ism yonidagi hudud chipi olib tashlandi** (hudud ustuni bor).
- Sinov (lokal curl+UI): dashboard 14-iyulda 0/0 to'g'ri; zakaz yaratildi→tushum 0/yo'lda +1; yetkazildi→tushum +13000/INCOME orderId bilan; almashtirish Jasur→Karim→Jasur OK; 13-iyul kun hisoboti yetkazilgan=1 to'g'ri. Prod buildlar o'tdi. ⚠️ Dev'da `next build`ni dev server ishlab turganda ishlatmang — .next buziladi (qora ekran), server restart kerak bo'ladi.

✅ **BREND QIZIL + forma redizaynlari (2026-07-14, DEPLOY QILINDI):**
- **Butun dastur KO'K → G'ISHT-QIZIL (#B93B3B)** — egasi mockup berib so'ragan. Yechim: `tailwind.config.ts`da `blue` shkalasi `brandRed` bilan almashtirilgan (komponentlarda klass nomlari `blue-*` bo'lib QOLGAN — ataylab, rang bitta joydan boshqariladi; YANGI komponentda ham `blue-*` yozng — qizil chiqadi). globals.css --primary/--ring/--accent/selection qizil HSL. shadow-glow qizil.
- **Semantik tuzatishlar:** StatusBadge ASSIGNED endi `sky` (CANCELLED qizil bilan adashmasin); moliya/tahlil chartlarida TUSHUM endi YASHIL #16A34A (xarajat qizil bilan adashmasin); donut Karta=#B93B3B; inventory customers=#B93B3B; avatar palitra 1-rang=#B93B3B; route-map pin/chiziq/geo-nuqta #B93B3B; logo gradient from-blue-600 to-rose-400 (3 joy: login/header/sidebar).
- **Yangi buyurtma modali (order-form.tsx) TO'LIQ qayta yozildi** — egasi mockup'i: katta maydonlar (h-52px), yozib qidiriladigan mijoz combobox (tanlangach karta ko'rinishi + X), KATTA − / + stepper (56px, funksional setState — tez bosishda ham sanaydi), To'lov segment (aktiv=oq pill), "Jami to'lov" panel (taqsimot + katta summa), tugmalar o'ngda. Mahsulot/sana/vaqt/manzil maydonlari YO'Q. Yangi mijoz rejimida: ism/telefon/Hudud dropdown (manzil YO'Q — avtomatik "—", keyin mijoz sahifasida qo'shiladi); combobox pastida "Yangi mijoz qo'shish" tez tugmasi.
- **Mijoz formasi (customer-form.tsx) redizayn** — xuddi shu katta uslub; **Hudud endi dropdown** ("Tanlanmagan" + faqat hudud nomi: A, B...); "Mijozdagi tara (daftardan)" alohida amber panel stepper bilan; lokatsiya/izoh katta maydonlar; Saqlash qizil.
- Sinov: admin bilan UI'da buyurtma yaratildi (#23: 6 almashtirish + 2 yangi = 168,000 to'g'ri taqsimot) va bekor qilindi; hudud dropdown variantlari tekshirildi; prod build o'tdi. Konsol toza.

✅ **Haydovchi UX 2: Maps ilova navigatsiya + xarajat + orqaga tugma (2026-07-13, DEPLOY KUTILMOQDA):**
- **Google Maps ILOVADA ochiladi (web emas):** `apps/web/src/lib/nav.ts` — `directionsUrl(lat, lng, fallbackLink)`. Android (APK/TWA): `google.navigation:q=lat,lng` → Maps app navigatsiya rejimida. iOS/desktop: `https://www.google.com/maps/dir/?api=1&destination=...` universal havola. Koordinata bo'lmasa locationLink'ka qaytadi. Ulangan joylar: route-map (popup + ro'yxat "Borish"), driver-orders karta, order-detail ("Yo'l ko'rsatish"). findOne endi customer.lat/lng ham qaytaradi.
- **getDriverOrders "bugun" = O'zbekiston kuni (UTC+5):** avval UTC kuni edi (lokal 05:00–04:59) — kechagi yetkazilganlar ertalab 5 gacha ko'rinib qolardi. Endi aniq lokal 00:00–23:59. (Yetkazilganlar faqat bugungi — deliveredAt bo'yicha; ochiq zakazlar sanasidan qat'i nazar turadi — bu avvaldan shunday.)
- **Orqaga tugma logikasi:** login submit + logout `router.replace` (orqaga bosilganda login QAYTMAYDI); login sahifasi autentifikatsiyalangan foydalanuvchini avtomatik uyiga replace qiladi; sidebar Linklari `replace` (bo'limlar history'da TO'PLANMAYDI — orqaga har sahifani aylanib yurmaydi); tafsilot sahifalari push bo'lib qoladi (orqaga = ro'yxatga); order-detail orqaga tugmasi history bo'lsa `router.back()` (yangi yozuv qo'shmaydi), to'g'ridan kirilganda backHref.
- **Haydovchi xarajati (moliyaga ulangan):** Backend: `POST /finance/expenses` (ADMIN+DRIVER; CreateExpenseDto: amount/category?/description?/paymentMethod?=CASH) — EXPENSE tranzaksiya, haydovchida izohga " (haydovchi)" qo'shiladi, default kategoriya "Haydovchi xarajati"; `GET /finance/expenses/my` — bugungi (UTC+5) o'z xarajatlari {data,total}. Moliya xulosasi/foyda/hisobotlarga avtomatik ta'sir (type=EXPENSE bo'lgani uchun). Frontend: use-finance.ts `useAddExpense`/`useMyTodayExpenses`; `components/finance/driver-expense-modal.tsx` (kategoriya chiplari: Yoqilg'i/Ovqat/Ta'mirlash/Boshqa, formatlangan summa, bugungi ro'yxat); driver-orders header'da "Xarajat −N" tugmasi. Operator/manager kirita OLMAYDI (403 test qilingan).
- Lokal to'liq sinovdan o'tgan (backend curl + UI browser): xarajat CRUD, RBAC 403lar, navigatsiya replace/push/back, dir havolalari.

✅ **Haydovchi: hudud filtri + jami tara + GPS opt-in (2026-07-13):**
- **Haydovchi buyurtmalar sahifasi alohida:** `apps/web/src/components/orders/driver-orders.tsx` (DriverOrders). `orders-view.tsx` (OrdersView) rolga qarab ajratadi: DRIVER → DriverOrders, boshqalar → OrdersTable (admin/operator ko'rinishi O'ZGARMAGAN). `/orders` sahifasi endi OrdersView ni chaqiradi.
- **Ma'lumot manbai:** useDriverDayOrders (getDriverOrders endpointi) — sahifalashsiz bugungi to'liq to'plam (yopilmagan + bugun yetkazilgan), shuning uchun hudud chiplari va tara hisobi ANIQ. useUpdateOrderStatus allaqachon driver-day-orders cache'ni invalidate qiladi — "Yetkazildi" bosilganda hisob darrov yangilanadi.
- **Hudud filtri:** yetkazilmagan zakazlardan hudud chiplari (soni bilan), bosganda ro'yxat + tara hisobi shu hududga tushadi. Hududsiz mijozlar "Hududsiz" chipida (NO_ZONE="__none__").
- **Jami tara:** tepada katta ko'k gradient karta "Bugungi yuk / N ta tara" (+qoldi/yetkazildi/yangi tara). Hudud tanlansa sarlavha "A hudud" bo'ladi.
- **GPS opt-in (iPhone muammosi hal):** route-map.tsx da watchPosition endi geoEnabled=true bo'lgandagina ishlaydi — ilova/PWA ochilganda lokatsiya ruxsati SO'RALMAYDI. "Mening joyim" tugmasi birinchi bosilganda yoqiladi; sessionStorage("aqua-geo-on") sessiya ichida eslab qoladi. Xarita footer'ida "Joyingizni ko'rish uchun tugmani bosing" maslahati chiqadi.

✅ **Yo'qolayotgan mijozlar (2026-07-09):**
- Uzoq (7/14/30 kun) zakaz qilmagan aktiv mijozlar ro'yxati — retention uchun operator qo'ng'iroq qiladi.
- Backend: `GET /customers/inactive?days=14&page=1` (ADMIN/MANAGER/OPERATOR). `getInactive` — order.groupBy(customerId, max createdAt), CANCELLED'siz, cutoffdan eski + aktiv mijozlar, eng uzoq to'xtagani birinchi. `daysSince` va `lastOrderAt` qaytadi. ⚠️ controller'da `@Get("inactive")` `@Get(":id")`dan OLDIN.
- Frontend: `/inactive` sahifa (inactive-customers.tsx) — 7/14/30 kun SegmentTabs, mobil karta + kompyuter jadval, kun-badge (14+=amber, 30+=red), qarz ko'rsatiladi, "Qo'ng'iroq" tugmasi. Mijozlar sahifasi header'ida "Yo'qolayotganlar" tugmasi → /inactive. ROLE_ROUTES: operator/manager'ga /inactive qo'shildi.

✅ **Ombor logikasi qayta qurildi (2026-07-09) — MUHIM:**
- **Yangi soddalashtirilgan model:** ombor FAQAT bo'sh tara saqlaydi (to'la tara zaxira YO'Q — qo'lda to'ldirib moshinaga ortiladi). `FULL_BOTTLE` endi ishlatilmaydi; `EMPTY_BOTTLE` = ombordagi yagona hisob.
- **Order effekti (orders.service create + reverseEffects):** faqat `newBottles` ombordan chiqadi (`EMPTY_BOTTLE -= newBottles`), mijoz `bottlesOwned += newBottles`. Almashtirish (refill) omborга TEGMAYDI (bo'sh chiqib bo'sh qaytadi = net nol). Bekor qilinsa teskarisi. (Avval FULL_BOTTLE -= quantity edi — noto'g'ri.)
- **Hisob (getOverview):** warehouseBottles (omborda/sotilmagan), customerBottles (aylanma = sum bottlesOwned), broken, lost. Jami = warehouse+customers+broken+lost (saqlanish qonuni). usableBottles = warehouse+customers.
- **Boshlang'ich zaxira:** `POST /inventory/set-warehouse {quantity}` — ombordagi bo'sh tara sonini ANIQ belgilaydi (intake = ustiga qo'shadi). Frontend: intake-modal'da "Aniq sonni belgilash / Ustiga qo'shish" rejimi.
- **Daftardagi mijozlar:** create'da bottlesOwned kiritilsa → aylanmaga qo'shiladi, omborга tegmaydi (inventory action yo'q — to'g'ri, ular tizimdan oldin sotilgan).
- Test: `scratchpad/test_warehouse.py` (6 stsenariy, hammasi o'tgan). Dev bazasida eski singan/yo'qolgan (50/50) test ma'lumoti bor — prod'da egasi haqiqiy sonni set-warehouse orqali kiritadi.
✅ **Haydovchi qarzdorlar ro'yxati + phone2 tuzatish (2026-07-09):**
- **Haydovchiga "Qarzdorlik" bo'limi** (faqat KO'RISH): sidebar'da DRIVER uchun ochildi; ROLE_ROUTES DRIVER'ga `/debts` qo'shildi; `GET /finance/debts` DRIVER rolini qabul qiladi. debts-page'da haydovchi uchun: /customers linki YO'Q (kira olmaydi), "To'lov" tugmasi o'rniga "Qo'ng'iroq" (tel:). To'lovni buyurtma sahifasidan qiladi (yuqoridagi feature).
- **Mobil debts kartalari:** debts-page'ga `md:hidden` karta ko'rinishi (ism, tel, qarz, manzil, tugma) + `hidden md:block` jadval — scroll kerak emas.
- **phone2 (qo'shimcha telefon) MAJBURIY xatosi TUZATILDI:** create-customer.dto phone2 regex `/^(\+998\d{9})?$/` — bo'sh satr ("") ham qabul qilinadi. Sabab: `@IsOptional()` faqat null/undefined ni o'tkazadi, frontend esa "" yuboradi → eski `@Matches(/^\+998\d{9}$/)` bo'sh satrda yiqilardi. Test: bo'sh=OK, to'liq=OK, chala=400.

✅ **Haydovchiga qarzdorlik qabul qilish (2026-07-09):**
- Haydovchi (va operator/admin) buyurtma tafsilotida mijoz qarzi bo'lsa "Qarz to'lovi" tugmasini ko'radi → PaymentModal (mavjud komponent qayta ishlatilgan).
- **Qarzdorlar ro'yxatidan ham to'lov:** debts-page'da haydovchiga "To'lov" (yashil) + "Qo'ng'iroq" tugmalari (mobil karta ham, jadval ham). Foydalanuvchi so'rovi bilan haydovchi ISTALGAN qarzdordan to'lov qabul qila oladi (biriktirilgan bo'lishi shart emas) — `addPayment`dagi DRIVER-cheklovi OLIB TASHLANDI. Tranzaksiya izohiga "(haydovchi)" qo'shiladi, kim qabul qilgani createdById'da.
- Backend: `POST /customers/:id/payments` DRIVER rolini qabul qiladi (controller). `GET /finance/debts` DRIVER'ga ochiq.
- Frontend: `usePermissions().canCollectDebt`; useAddPayment `debts`/`finance-summary`/`dashboard-stats`/`orders`/`driver-day-orders` cache'larini yangilaydi (to'lovdan keyin ro'yxat DARROV yangilanadi).
- Test: `scratchpad/test_driver_debt.py` + biriktirilmagan qarzdordan to'lov (201 OK), UI'da 2 ta to'lov ketma-ket, ro'yxat reloadsiz yangilandi.

✅ **Push xabarnoma + Android APK (2026-07-07):**
- **Web Push (VAPID):** yangi buyurtma haydovchiga biriktirilganda telefoniga push tushadi (ilova yopiq bo'lsa ham).
  - Backend: `apps/api/src/modules/notifications/push.service.ts` (web-push paketi) + `notifications.controller.ts` (GET push/public-key, POST/DELETE push/subscribe). Yuborish nuqtalari: orders.service create (driverId bilan) + assignDriver.
  - DB: `push_subscriptions` jadvali (migratsiya `20260707100000_push_subscriptions`), User.pushSubscriptions relation. Eskirgan obuna (404/410) avtomatik o'chiriladi.
  - Frontend: `apps/web/src/hooks/use-push.ts` (dashboard layout'da chaqiriladi; MANAGER'dan tashqari barcha rollar obuna bo'ladi; ruxsat so'raladi, rad etilsa jim). `public/sw.js` da push + notificationclick handlerlar (CACHE v2).
  - **VAPID kalitlari:** lokal `.env` va server `.env.production` da (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY). Yo'qolsa: `web-push generateVAPIDKeys` — lekin eski obunalar bekor bo'ladi!
  - ⚠️ GOTCHA: server env'ga qo'shishning o'zi yetmaydi — `docker-compose.prod.yml` api `environment:` bo'limida ham ro'yxatda bo'lishi SHART (aks holda konteyner ko'rmaydi, "VAPID kalitlari yo'q" warning chiqadi).
- **Android APK (TWA — saytni o'raydi):** `android/` papkasi.
  - Bubblewrap CLI (npx @bubblewrap/cli). Sozlama: `~/.bubblewrap/config.json` (JDK 17: `~/.bubblewrap/jdk-17.0.19+10`, SDK: `~/Library/Android/sdk`, build-tools 34.0.0 o'rnatilgan).
  - **Imzo kaliti:** `android/android.keystore` (alias `aquaerp`), parol `android/keystore-password.txt` da — IKKALASI COMMIT QILINGAN (private repo; kalit yo'qolsa ilova yangilab bo'lmaydi!).
  - **Qayta build:** `cd android && export BUBBLEWRAP_KEYSTORE_PASSWORD=$(cut -d= -f2 keystore-password.txt) && export BUBBLEWRAP_KEY_PASSWORD=$BUBBLEWRAP_KEYSTORE_PASSWORD && npx -y @bubblewrap/cli update --skipVersionUpgrade && npx -y @bubblewrap/cli build --skipVersionUpgrade`. Versiya oshirish: twa-manifest.json'da appVersionCode/appVersionName.
  - **Digital Asset Links:** `apps/web/public/.well-known/assetlinks.json` (packageId `uz.aquaerp.app`, keystore SHA-256). Bu fayl bo'lmasa ilova URL panel bilan ochiladi.
  - **APK tarqatish:** tayyor APK `apps/web/public/aquaerp.apk` ga ko'chiriladi → https://116-203-220-83.nip.io/aquaerp.apk dan yuklab olinadi. Ichi sayt bo'lgani uchun keyingi deploylar APKni qayta qurishni TALAB QILMAYDI (faqat ikonka/nom/domen o'zgarsa kerak).

✅ **Haydovchi tuzatishlari (2026-07-08):**
- **Marshrut endi ESKI yopilmagan zakazlarni ham ko'rsatadi:** getDriverOrders (orders.service) — NEW/PROCESSING/ASSIGNED sanasidan qat'i nazar; DELIVERED faqat shu kuni yetkazilganlar (deliveredAt bo'yicha). Avval createdAt=bugun filtri edi — kechagi ochiq zakazlar yo'qolardi.
- **findOne izolyatsiyasi:** haydovchi boshqa haydovchining buyurtmasini ID bilan ham ocholmaydi (403). findAll (driverId majburlash) va updateStatus (o'z buyurtmasi) avvaldan to'g'ri edi — test qilingan.
- **Haydovchi /orders tablari:** DRIVER_FILTERS = Biriktirilgan (default) / Yetkazildi / Barchasi. Yangi/Jarayonda haydovchiga ko'rinmaydi.
- **RouteMap `sticky` prop:** faqat /route sahifasida sticky (driver-detail'da oddiy — scroll'ga xalaqit bermaydi). driver-detail jadvallariga overflow-x-auto qo'shildi (mobilda scroll ishlaydi).

✅ **Marshrut optimallashtirish (2026-07-07 kech):**
- **Eng qisqa yo'l:** route-map.tsx da `optimizeRoute` (nearest-neighbor + 2-opt, haversine). Boshlang'ich nuqta — haydovchining GPS joyi (`geoPos` state, 50m+ siljigandagina yangilanadi, aks holda marshrut "sakraydi"); GPS yo'q bo'lsa birinchi zakaz. Har nuqtaga masofa (`legKm`) va jami yo'l footer'da ko'rsatiladi.
- **Yetkazilganlar xaritada YO'Q** — faqat kutilayotganlar pin bo'ladi (hammasi ko'k); ro'yxatda yetkazilganlar pastda (opacity-60, line-through, ✓). Hammasi yetkazilsa "🎉" karta.
- **Xarita sticky** (`sticky top-0 z-20`) — ro'yxat aylantirilganda ham ko'rinib turadi; mobilda h-[38vh].
- **Jonli yangilanish:** use-orders.ts dagi BARCHA mutatsiyalar (create/status/assign/update/cancel) `["driver-day-orders"]` cache'ni invalidate qiladi. YANGI mutatsiya yozsangiz buni unutmang.
- **Orqaga qaytish:** marshrut ro'yxatidagi linklar `?from=route` bilan; order-detail back tugmasi shunda `/route` ga qaytadi (window.location.search orqali — useSearchParams EMAS, Suspense talab qilmasin deb).

✅ **Haydovchi UX tuzatishlari (2026-07-07, APK chiqqandan keyin):**
- **Rol bo'yicha sahifa himoyasi:** `(dashboard)/layout.tsx` da `ROLE_ROUTES` xaritasi — rolga mos kelmagan sahifa ochilsa avtomatik o'z "uy" sahifasiga redirect (DRIVER→/orders, OPERATOR→/customers, MANAGER→/ va ko'rish sahifalari, ADMIN→hammasi). Sabab: APK/PWA start_url="/" — haydovchi ilovani qayta ochganda dashboard ko'rinardi.
- **Buyurtmalar mobilda karta ko'rinishida:** orders-table.tsx — `md:hidden` kartalar (raqam, mijoz+hudud, tel, holat, tara·summa, Yetkazildi/Biriktirish tugmalari), jadval `hidden md:block`. Sahifalash ikkalasida umumiy (`pagination` const).
- **Xaritada hudud:** route-map.tsx popup'ida mijoz hududi ko'k chip bo'lib chiqadi ("B hudud").

✅ **Haydovchi marshruti xaritada (2026-07-06):**
- **Xarita:** Leaflet + OpenStreetMap (bepul, API kalitsiz; plitkalar brauzerdan yuklanadi). `apps/web/src/components/route/route-map.tsx` — RouteMap komponenti. Leaflet SSR'da ishlamaydi → useEffect ichida dinamik import.
- **Sahifa:** `/route` ("Bugungi marshrut") — sidebar'da faqat DRIVER ko'radi. Admin xuddi shu xaritani haydovchi tafsiloti sahifasida ("Bugungi marshrut" bo'limi) ko'radi.
- Pinlar yurish tartibida raqamlangan (1,2,3 — yaratilish tartibi), yetkazilgan=yashil, kutilayotgan=ko'k, punktir chiziq marshrutni bog'laydi. Pin popup: mijoz, #seq, summa, manzil + "Qo'ng'iroq" (tel:) va "Borish" (Google Maps) tugmalari. Pastda "Yurish tartibi" ro'yxati; lokatsiyasiz zakazlar alohida (sariq fon) ko'rsatiladi.
- **Koordinata qayerdan:** mijoz `lat/lng` maydonlaridan. Bo'sh bo'lsa `locationLink`dan avtomatik ajratiladi: `apps/api/src/common/utils/geo.util.ts` (q=/ll=/@.../!3d!4d formatlar; qisqa maps.app.goo.gl havolalari redirect kuzatib hal qilinadi, 4s timeout). Ajratish nuqtalari: mijoz create/update (customers.service) + haydovchi marshruti so'ralganda lazy backfill (orders.service ensureCustomerCoords) — natija bazaga saqlanadi.
- GET /orders/driver/:id endpointida haydovchi faqat O'Z marshrutini oladi (controller'da param almashtiriladi).
- Yangi dependency: `leaflet` (+ @types/leaflet dev) apps/web da — Docker build pnpm-lock orqali o'rnatadi.

✅ **RBAC qat'iylashtirish + UI + MARSHRUT XARITASI (2026-07-05…07 sessiyalari):**
1. **Manager = faqat ko'rish** — batafsil yuqoridagi "Rollar" bo'limida. Backend: `ManagerReadOnlyGuard` (global, POST/PATCH/PUT/DELETE blok). Frontend: `apps/web/src/hooks/use-permissions.ts` (readOnly/canCreateOrder/canManageOrders/canDeliver) — YANGI sahifada tugma qo'shsangiz shu hookdan foydalaning.
2. **Zakaz faqat OPERATOR (+admin) yozadi; "Yetkazildi"ni faqat HAYDOVCHI (o'z buyurtmasi, +admin) bosadi** — orders.controller @Roles + orders.service updateStatus'da tekshiruv; frontendda tugmalar rolga qarab yashiringan.
3. **Dashboard "Bugungi xulosa"** qayta chizildi — bo'lingan segmentli karta (4 holat + yashil tushum bloki).
4. **Mijoz tafsiloti (customer-detail.tsx) mobilga to'liq moslandi** — telefon bir qatorda (mono+nowrap), 3 ixcham stat karta, holat chiplari gorizontal scroll, jadval overflow-x, tugmalar mobilda to'liq kenglikda. Manager'da To'lov/Tahrirlash yashirin.
5. **MARSHRUT XARITASI** (Leaflet + OpenStreetMap, API kalitsiz, bepul):
   - `apps/web/src/components/route/route-map.tsx` + sahifa `app/(dashboard)/route/page.tsx` ("Bugungi marshrut").
   - Sidebar'da "Marshrut" — faqat DRIVER ko'radi. Admin xuddi shu xaritani driver-detail sahifasida ko'radi (RouteMap driverId prop oladi).
   - Raqamlangan pinlar (yurish tartibi; ko'k=kutilmoqda, yashil=yetkazildi), punktir marshrut chizig'i, popup'da Qo'ng'iroq (tel:) + Borish (Google Maps) tugmalari, pastda "Yurish tartibi" ro'yxati + lokatsiyasiz buyurtmalar alohida (amber fon).
   - **Jonli lokatsiya**: `watchPosition` → pulsatsiyalanuvchi ko'k nuqta (animatsiya `aqGeoPing` globals.css'da) + aniqlik doirasi; pastki-o'ng dumaloq tugma = kuzatish rejimi (xarita haydovchi bilan yuradi; drag qilsa o'chadi). HTTPS shart (prod'da bor). Birinchi ochilishda brauzer ruxsat so'raydi.
   - Leaflet `window` talab qiladi — useEffect ichida dinamik import qilingan; SSR muammosi yo'q.
6. **Geo (koordinata) tizimi**:
   - `apps/api/src/common/utils/geo.util.ts` — Google/Apple Maps havolasidan lat/lng ajratadi (q=/ll=/@/!3d!4d formatlari, istalgan kasr uzunligi); qisqa havolalar (maps.app.goo.gl) redirect kuzatib hal qilinadi (timeout 4s, consent sahifalar decode qilinadi).
   - Mijoz create/update'da locationLink kelsa avtomatik ajratiladi; `getDriverOrders` chaqirilganda lat/lng bo'sh mijozlar lazy hal qilinadi va bazaga yoziladi.
   - **Backfill endpoint**: `POST /api/v1/customers/resolve-locations` (ADMIN) — barcha mijozlarni bir yo'la hal qiladi. Prod'da bir marta ishga tushirilgan (Hudud Test, Gulbaybek hal bo'lgan).
7. Yangi paket: `leaflet` (+ @types/leaflet dev) apps/web'da. pnpm-lock yangilangan — Docker build'da muammosiz o'rnatiladi.

✅ **Logika tuzatishlari + soddalashtirishlar (2026-07-04 sessiyasi):**
1. **Buyurtma sanoq raqami (`seq`):** Order modelida `seq Int @default(autoincrement()) @unique` (migratsiya `order_seq`, eskilar created_at bo'yicha qayta raqamlangan). UI hamma joyda `#12` ko'rinishida (jadval, tafsilot, dashboard, mijoz tarixi, haydovchi hisoboti). Qidiruv: qisqa raqam ("#12"/"12", ≤5 xona) FAQAT seq/orderNumber bo'yicha; uzun matn — mijoz/telefon bo'yicha.
2. **"Kun boshlash" OLIB TASHLANDI** (foydalanuvchi so'rovi) — drivers-page va driver-detail'da tugma yo'q. Backend openSession qoldi, lekin UI'dan chaqirilmaydi. "Kun yopish" faqat ochiq sessiya bo'lsa ko'rinadi (eskilarini yopish uchun).
3. **MUHIM — nasiya ikki marta hisoblanish xatosi TUZATILDI:** avval DEBT buyurtma yetkazilganda "Nasiya sotuv" INCOME yozilardi, keyin qarz to'langanda yana "Qarz to'lovi" INCOME — tushum 2x. Endi nasiya yetkazilganda INCOME yozilMAYDI; tushum faqat to'lovda.
4. **Ombor harakati endi buyurtma orqali (sessiyasiz yagona manba):** buyurtma yaratilganda FULL_BOTTLE -= quantity (hamma chiqqan to'la tara), EMPTY_BOTTLE += bottlesReturned; bekor qilinsa teskarisi. Har harakat InventoryAction tarixiga "Buyurtma #N" izohi bilan yoziladi. (Avval faqat yangi tara kamayardi — to'la/bo'sh taqsimot noto'g'ri edi.)
5. **Dashboard totalDebt** endi musbat (avval manfiy yig'ilardi).
6. **Hisobotlar:** bekor qilinganlar suv/tara hisobiga kirmaydi; "Tara aylanishi" buyurtmalar asosida (deliveredWater/newSold/emptyBack); Top haydovchilar sessiya emas — yetkazilgan buyurtmalar bo'yicha; Top hududlar mijoz `zone`sidan (bo'lmasa manzil).
7. Haydovchi hisoboti (driver-detail) sessiyasiz ham ishlaydi — yetkazilgan buyurtmalardan hisoblanadi.
⚠️ Prod'da migratsiya avtomatik o'tadi (api CMD `prisma migrate deploy`).

✅ **Redesign YAKUNLANDI (2026-07-03 sessiyasi):** AquaERP.dc.html dizayni endi BARCHA sahifalarga qo'llandi:
- Umumiy dizayn bloklari: `apps/web/src/components/shared/page-ui.tsx` — PageHeader (30px h1 + subtitle + amallar), StatCard/StatStrip, Avatar (hash-rangli, dizayn palitrasi), Pill, Ring, Donut (SVG), SegmentTabs, thClass/cardClass/btnPrimary/btnSecondary/rowBtnClass. YANGI sahifa yasashda SHU komponentlardan foydalaning.
- Mijozlar: hudud chiplari, avatar+tip, mono telefon, balans −/+ rangli, holat pill, ko'z/menyu tugmalari.
- Buyurtmalar: mono ko'k ID+vaqt, mijoz+hudud pill, tara taqsimoti, to'lov/holat pill, haydovchi avatar, tez "Yetkazildi".
- Haydovchilar: dizayn kartasi — 46px avatar, sessiya holati pill (pulse), 64px progress halqa, inkassatsiya, kun boshlash/yopish.
- Ombor: 4 stat karta, tara taqsimoti donut + "Taralar qayerda?" ring, harakatlar jadvali.
- Moliya: stat strip (rentabellik bilan), ko'k/qizil area chart + legend, kirim donut (naqd/karta), tranzaksiyalar dizayn ro'yxati (ikonka tile).
- Qarzdorlik: stat strip, qarzdorlar jadvali (avatar, oxirgi to'lov, qizil qarz, doimiy ko'rinadigan To'lov tugmasi).
- Hisobotlar: SegmentTabs davr, PDF primary/Excel secondary, stat kartalar, moliya+tara panellari.
- Tahlil: tushum area chart, hududlar donut+legend, gradient gorizontal barlar, top ro'yxatlar avatar bilan.
- Foydalanuvchilar (Sozlamalar ichida tab): rol kartalari (nuqta+tavsif+son), jadval rol pill/holat nuqtasi bilan; bo'lim sarlavhasi 17px (nested).
- Audit: dizayn timeline (ikonka tile + amal + obyekt pill + avatar + vaqt).
- Sozlamalar: 30px sarlavha + segment tablar.

✅ **Avvalgi tuzatishlar (2026-07-02 sessiya — Claude Design redesign boshlanishi):**
0. **UI/UX redesign — Claude Design'dan (2026-07-02):**
   - Manba: `AquaERP.dc.html` (repo root'da, foydalanuvchi Claude Design'da yasagan). Bu fayl — dizayn etaloni, O'CHIRMANG.
   - Tailwind `gray` shkalasi dizayn tokenlariga qo'lda moslangan (tailwind.config.ts'dagi `designGray`): light bg `#F8F9FB`, border `#ECEEF3`; dark bg `#0A0B0D`, surface `#141619`. `blue` — Tailwind default (primary `#2563EB`).
   - Shriftlar: Inter + **JetBrains Mono** (`font-mono` — buyurtma raqamlari, telefonlar). Manrope OLIB TASHLANDI. globals.css @import orqali (next/font EMAS!).
   - Sidebar: yorug' surface panel, **guruhlangan menyu** (Asosiy / Ombor & Moliya / Hisobot / Tizim), aktivda ko'k-weak pill + chapda 3px rail, pastda user karta. RBAC filtri guruh darajasida (bo'sh guruh yashirinadi).
   - Header: 64px sticky blur, **sana chipi**, ⌘K qidiruv, 40px hoshiyali tugmalar (radius 11), user chip.
   - Dashboard: salomlashuv h1 + tezkor amallar (Yangi buyurtma primary), "Bugungi xulosa" paneli (nuqtali chiplar + yashil tushum pill), 4 KPI karta (ikonka tile + katta raqam), buyurtmalar jadvali (mono ko'k ID, uppercase th).
   - StatusBadge (shared): dizayn xaritasi — NEW=violet, ASSIGNED=blue, PROCESSING=amber+pulse, DELIVERED=green, CANCELLED=red.
   - Login/Sozlamalar dizaynda YO'Q edi — shu uslubga moslab yasalgan.
   - Soyalar: `shadow-card/panel/card-hover/glow` (tailwind.config). Radius: `--radius: 0.7rem`, `rounded-2xl` = 18px.
   - `formatDate` endi o'zbek lokalida (date-fns/locale uz).
1. Operator menyusidan Dashboard+Ombor olib tashlandi
2. Qo'shimcha telefon ixtiyoriy (bloklamaydi)
3. Butun dastur listlari chiziqlari aniqlashtirildi (`border-gray-100 dark:border-gray-800`)
4. Mijoz "Taralar (uyida)" = `bottlesOwned` (tahrirlanadi); berildi/qaytdi olib tashlandi
5. Mijoz buyurtma tarixida qisqa raqam (1,2,3) uzun ID o'rniga
6. Haydovchilar bo'limi bug'i tuzatildi (DriverCard'da vergul operatori → fragment)

⏳ **Qolgan/ixtiyoriy ishlar — 2026-07-10 holati (egasi rejasi):**
- ❌ **Telegram bot / kunlik Telegram xulosa — RAD ETILDI.** Egasi: "ilovada push bor, Telegram ortiqcha, unda programma nima ish qiladi". Bu yo'nalishga QAYTMANG.
- ⏳ **Doimiy/takroriy buyurtmalar** — mijozga "har 5 kunda 2 ta" jadval, tizim o'zi zakaz tayyorlaydi. TAVSIYA qilingan, hali boshlanmagan (egasi keyin so'rashi mumkin — kundalik ishni eng ko'p yengillashtiradi).
- ✅ **"Yo'qolayotgan mijozlar"** — BAJARILDI (2026-07-09, yuqoriga qarang).
- ✅ **Toza DB reset** — BAJARILDI (2026-07-10, yuqoridagi "BAZA TOZALANDI" bo'limi). Endi egasi qo'lda 10 mijoz bilan test qilyapti.
- ⏳ **Backup'ni serverdan tashqariga (offsite)** — egaga tushuntirilgan (#5): hozir zaxira nusxa o'sha serverda; server buzilsa nusxa ham ketadi. Nusxani Telegram/bulutga avtomatik yuborish kerak. Egasi "keyin qilamiz" dedi.
- ⏳ **Har kishiga alohida login + real parollar** — egasi test tugagach o'zi yaratadi va real ishga topshiradi (test parollar shunda almashadi).
- ⏳ **Haqiqiy domen** (aquaerp.uz) — egasi "keyin, hozir mablag' kam" dedi.
- **ESKIRDI — Haydovchi sessiyalari**: "Kun boshlash" UI'dan OLIB TASHLANGAN (2026-07-04). Backend openSession qolgan, lekin ishlatilmaydi — qayta tiklamang.

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
