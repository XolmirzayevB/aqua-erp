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

✅ **Ombor logikasi qayta qurildi (2026-07-09) — MUHIM:**
- **Yangi soddalashtirilgan model:** ombor FAQAT bo'sh tara saqlaydi (to'la tara zaxira YO'Q — qo'lda to'ldirib moshinaga ortiladi). `FULL_BOTTLE` endi ishlatilmaydi; `EMPTY_BOTTLE` = ombordagi yagona hisob.
- **Order effekti (orders.service create + reverseEffects):** faqat `newBottles` ombordan chiqadi (`EMPTY_BOTTLE -= newBottles`), mijoz `bottlesOwned += newBottles`. Almashtirish (refill) omborга TEGMAYDI (bo'sh chiqib bo'sh qaytadi = net nol). Bekor qilinsa teskarisi. (Avval FULL_BOTTLE -= quantity edi — noto'g'ri.)
- **Hisob (getOverview):** warehouseBottles (omborda/sotilmagan), customerBottles (aylanma = sum bottlesOwned), broken, lost. Jami = warehouse+customers+broken+lost (saqlanish qonuni). usableBottles = warehouse+customers.
- **Boshlang'ich zaxira:** `POST /inventory/set-warehouse {quantity}` — ombordagi bo'sh tara sonini ANIQ belgilaydi (intake = ustiga qo'shadi). Frontend: intake-modal'da "Aniq sonni belgilash / Ustiga qo'shish" rejimi.
- **Daftardagi mijozlar:** create'da bottlesOwned kiritilsa → aylanmaga qo'shiladi, omborга tegmaydi (inventory action yo'q — to'g'ri, ular tizimdan oldin sotilgan).
- Test: `scratchpad/test_warehouse.py` (6 stsenariy, hammasi o'tgan). Dev bazasida eski singan/yo'qolgan (50/50) test ma'lumoti bor — prod'da egasi haqiqiy sonni set-warehouse orqali kiritadi.
✅ **Haydovchiga qarzdorlik qabul qilish (2026-07-09):**
- Haydovchi (va operator/admin) buyurtma tafsilotida mijoz qarzi bo'lsa "Qarz to'lovi" tugmasini ko'radi → PaymentModal (mavjud komponent qayta ishlatilgan).
- Backend: `POST /customers/:id/payments` endi DRIVER rolini ham qabul qiladi. `addPayment` — agar DRIVER bo'lsa, o'sha mijozga BIRIKTIRILGAN buyurtmasi borligini tekshiradi (aks holda 403 "Bu mijoz sizga biriktirilmagan"). Tranzaksiya izohiga "(haydovchi)" qo'shiladi.
- Frontend: `usePermissions().canCollectDebt` (driver/operator/admin); order-detail'da qarz bloki yonida tugma; useAddPayment orders/driver-day-orders cache'ni ham yangilaydi.
- Test: `scratchpad/test_driver_debt.py` — begona haydovchi 403, o'z haydovchisi qabul qiladi, INCOME tranzaksiya yoziladi (hammasi o'tgan).

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

⏳ **Qolgan/ixtiyoriy ishlar (foydalanuvchi keyin so'rashi mumkin):**
- **Telegram bot** — ENG KUTILAYOTGANI (foydalanuvchiga tavsiya qilingan): yangi buyurtma haydovchiga Telegram xabar; kechqurun egasiga kunlik xulosa. Hali boshlanmagan.
- **Doimiy/takroriy buyurtmalar** — mijozga "har juma 2 ta" jadval; tavsiya sifatida aytilgan.
- **"Yo'qolayotgan mijozlar"** — uzoq buyurtma qilmagan mijozlar ro'yxati; tavsiya sifatida aytilgan.
- **Toza DB reset** — foydalanuvchi tayyor bo'lganda test ma'lumotni tozalab, 0 dan boshlash.
  Buyruq: `ssh root@... "cd /opt/aqua-erp && docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -c 'cd packages/database && npx prisma migrate reset --force'"` (keyin seed).
  DIQQAT: foydalanuvchi allaqachon REAL mijozlar kirita boshlagan (Behruz, Alisher aka, Hudud Test, Gulbaybek...) — reset oldidan aniqlashtiring!
- **Test parollarni o'zgartirish** (foydalanuvchiga eslatish — xavfsizlik).
- **ESKIRDI — Haydovchi sessiyalari**: "Kun boshlash" UI'dan OLIB TASHLANGAN (2026-07-04, foydalanuvchi so'rovi). Ombor harakati endi buyurtma orqali. Backend openSession qolgan, lekin ishlatilmaydi — qayta tiklamang.
- ~~GitHub'ni yangilash~~ — ✅ 2026-07-07 da commit + push qilindi (GitHub main = lokal).

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
