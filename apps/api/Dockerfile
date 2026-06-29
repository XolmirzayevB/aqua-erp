# ─── Builder ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN npm install -g pnpm@9.15.0
WORKDIR /app

# Workspace manifestlari (cache-friendly)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Manba kod
COPY packages ./packages
COPY apps/api ./apps/api

# Prisma client + paketlar + api build
RUN pnpm --filter @aqua/shared build \
 && pnpm --filter @aqua/database exec prisma generate \
 && pnpm --filter @aqua/database build \
 && pnpm --filter @aqua/api build

# ─── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache postgresql16-client && npm install -g pnpm@9.15.0
WORKDIR /app
ENV NODE_ENV=production

# Butun workspace'ni ko'chiramiz (symlinklar va Prisma client buzilmaydi)
COPY --from=builder /app ./

EXPOSE 3001
# Migration deploy + ishga tushirish
CMD ["sh", "-c", "pnpm --filter @aqua/database exec prisma migrate deploy && node apps/api/dist/main.js"]
