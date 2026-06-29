# 💧 AquaERP — 19L Suv Yetkazib Berish ERP Tizimi

To'liq funksional, scalable ERP/CRM tizimi. Kichik biznesdan katta kompaniyagacha.

## 🛠 Texnologiyalar

| Qatlam | Texnologiya |
|--------|-------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| State | Zustand, TanStack Query |
| Backend | NestJS 10, Clean Architecture, modular |
| Database | PostgreSQL 16 + Prisma ORM |
| Realtime | Socket.io |
| Auth | JWT + Refresh Token Rotation, RBAC |
| Eksport | ExcelJS, PDFKit |
| Jobs | @nestjs/schedule (avtomatik backup) |
| DevOps | Docker Compose, Turborepo, pnpm |

## 📦 Modullar

- ✅ **Dashboard** — real-time statistika
- ✅ **Mijozlar** — CRUD, qidiruv, qarz, to'lov tarixi
- ✅ **Buyurtmalar** — status workflow, haydovchiga biriktirish, real-time
- ✅ **Haydovchilar** — kunlik sessiya, hisobot, grafiklar
- ✅ **Ombor** — to'la/bo'sh/singan/yo'qolgan tara, avtomatik hisob
- ✅ **Moliya** — kirim/chiqim/ish haqi/yetkazib beruvchi
- ✅ **Qarzdorlik** — qarzdorlar, to'lov qabul qilish
- ✅ **Hisobotlar** — kunlik/oylik/yillik, Excel/PDF eksport
- ✅ **Analytics** — top mijoz/haydovchi/hudud, grafiklar
- ✅ **Foydalanuvchilar** — RBAC (4 rol)
- ✅ **Audit Log** — barcha o'zgarishlar
- ✅ **Backup** — avtomatik (har kuni 02:00) + qo'lda

## 🚀 Ishga tushirish

```bash
cp .env.example .env
pnpm install
docker compose up -d        # Postgres + Redis
pnpm db:generate
pnpm db:migrate
pnpm db:seed                # test ma'lumotlar
pnpm dev                    # API:3001 + Web:3000
```

- Web: http://localhost:3000
- API: http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api/docs

## 👤 Test hisoblar

| Rol | Telefon | Parol |
|-----|---------|-------|
| Admin | +998901234567 | Admin@123 |
| Manager | +998901234568 | Manager@123 |
| Operator | +998901234569 | Operator@123 |
| Driver | +998901234570 | Driver@123 |

> ⚠️ Backup uchun serverda `pg_dump` / `psql` (postgresql-client) o'rnatilgan bo'lishi kerak.
