# 🚀 AquaERP — Production Deploy

VPS serverga (Ubuntu/Debian) bir necha qadamda chiqarish.

## 1. Talablar (serverda)

- Docker + Docker Compose plugin
- Ochiq portlar: 80, 443

```bash
# Docker o'rnatish (Ubuntu)
curl -fsSL https://get.docker.com | sh
```

## 2. Loyihani serverga olib kelish

```bash
git clone <repo-url> aqua-erp && cd aqua-erp
```

## 3. Maxfiy kalitlarni sozlash

```bash
cp .env.production.example .env.production
nano .env.production
```

Quyidagilarni **albatta** o'zgartiring:
- `POSTGRES_PASSWORD` — kuchli parol
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — `openssl rand -hex 32` bilan generatsiya qiling
- `PUBLIC_URL`, `FRONTEND_URL` — domeningiz (masalan `https://erp.domen.uz`)

## 4. Ishga tushirish

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Bu avtomatik:
- PostgreSQL + Redis ko'taradi
- Migration'ni qo'llaydi (`prisma migrate deploy`)
- API + Web build qiladi
- Nginx orqali 80-portda xizmat qiladi

## 5. Birinchi admin (seed)

```bash
docker exec aqua_api_prod sh -c "cd packages/database && pnpm exec tsx src/seed.ts"
```

Test hisoblar yaratiladi (keyin Sozlamalar → Foydalanuvchilar'dan o'zgartiring):
- Admin: `+998901234567 / Admin@123`

## 6. Tekshirish

```bash
curl http://localhost/api/docs   # Swagger 200
```
Brauzerda: `http://server-ip/` yoki domeningiz.

---

## SSL (HTTPS) qo'shish

`nginx/certs/` ga sertifikatlaringizni qo'ying va `nginx/nginx.conf`'ga 443 server bloki qo'shing.
Eng oson yo'l — Certbot:

```bash
docker run -it --rm -v ./nginx/certs:/etc/letsencrypt certbot/certbot certonly \
  --standalone -d erp.domen.uz
```

Yoki Caddy/Traefik reverse-proxy ishlatib avtomatik SSL oling.

---

## Foydali buyruqlar

```bash
# Loglar
docker logs -f aqua_api_prod
docker logs -f aqua_web_prod

# Qayta ishga tushirish (kod yangilangach)
git pull && docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# Backup (avtomatik har kuni 02:00, qo'lda):
docker exec aqua_api_prod sh -c "node node_modules/.bin/... "  # yoki UI: Sozlamalar → Backup

# To'xtatish
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

## CI/CD

`.github/workflows/ci.yml` — har push'da type-check + Docker build tekshiradi.
Avtomatik deploy uchun workflow oxiriga SSH-deploy step qo'shish mumkin.
