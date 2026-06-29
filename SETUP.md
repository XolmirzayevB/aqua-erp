# AquaERP — Ishga tushirish

## 1. Talab
- Node.js >= 20
- pnpm: `npm install -g pnpm`
- Docker & Docker Compose

## 2. O'rnatish

```bash
cd aqua-erp

# .env fayl yaratish
cp .env.example .env

# Dependencylarni o'rnatish
pnpm install

# Docker (Postgres + Redis) ishga tushirish
docker compose up -d

# Prisma client generate qilish
pnpm db:generate

# Migration
pnpm db:migrate

# Seed (test ma'lumotlar)
pnpm db:seed
```

## 3. Dev serverni ishga tushirish

```bash
# Hammasi bir vaqtda (Turborepo)
pnpm dev

# Alohida:
# API: http://localhost:3001
# Web: http://localhost:3000
# Swagger: http://localhost:3001/api/docs
# pgAdmin: http://localhost:5050
```

## 4. Test hisoblar

| Role      | Telefon        | Parol       |
|-----------|----------------|-------------|
| Admin     | +998901234567  | Admin@123   |
| Manager   | +998901234568  | Manager@123 |
| Operator  | +998901234569  | Operator@123|
| Driver    | +998901234570  | Driver@123  |
