-- ISHCHI PUL BALANSI (2026-07-19): har ishchida naqd + Click balansi,
-- ishchilar orasida qabul-bilan pul o'tkazmasi.

-- 1) Yangi ustunlar va jadval
ALTER TABLE "users" ADD COLUMN "cash_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "click_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

CREATE TABLE "worker_transfers" (
    "id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "notes" VARCHAR(300),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,
    CONSTRAINT "worker_transfers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "worker_transfers_from_user_id_idx" ON "worker_transfers"("from_user_id");
CREATE INDEX "worker_transfers_to_user_id_idx" ON "worker_transfers"("to_user_id");
CREATE INDEX "worker_transfers_status_idx" ON "worker_transfers"("status");

ALTER TABLE "worker_transfers" ADD CONSTRAINT "worker_transfers_from_user_id_fkey"
  FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_transfers" ADD CONSTRAINT "worker_transfers_to_user_id_fkey"
  FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2) BACKFILL — tizim ishga tushgandan beri yig'ilgan pullar balanslarga
-- o'tkaziladi, aks holda egasi darrov noto'g'ri (0) raqamlarni ko'radi.

-- 2a) NAQD yetkazilgan zakazlar → yetkazgan haydovchi naqdiga
--     (haydovchi biriktirilmagan bo'lsa — zakazni yozgan odamga)
UPDATE "users" u SET "cash_balance" = "cash_balance" + s.total
FROM (
  SELECT COALESCE(o."driver_id", o."created_by_id") AS uid, SUM(o."total_amount") AS total
  FROM "orders" o
  WHERE o."status" = 'DELIVERED' AND o."payment_type" = 'CASH'
  GROUP BY 1
) s
WHERE u."id" = s.uid;

-- 2b) Tasdiqlangan KLIK zakazlari → tasdiqlagan operator klikiga.
--     Eski (klik-tasdiqlash chiqishidan avvalgi) zakazlarda tasdiqlagan yo'q —
--     yagona faol OPERATORga yoziladi (Click hisobini u yuritadi).
UPDATE "users" u SET "click_balance" = "click_balance" + s.total
FROM (
  SELECT COALESCE(
           o."card_confirmed_by_id",
           (SELECT id FROM "users" WHERE role = 'OPERATOR' AND "is_active" = true ORDER BY "created_at" LIMIT 1)
         ) AS uid,
         SUM(o."total_amount") AS total
  FROM "orders" o
  WHERE o."status" = 'DELIVERED' AND o."payment_type" = 'CARD' AND o."card_confirmed_at" IS NOT NULL
  GROUP BY 1
) s
WHERE u."id" = s.uid AND s.uid IS NOT NULL;

-- 2c) Qarz to'lovlari → qabul qilgan ishchiga (naqd → naqdiga, karta → klikiga)
UPDATE "users" u SET "cash_balance" = "cash_balance" + s.total
FROM (
  SELECT t."created_by_id" AS uid, SUM(t."amount") AS total
  FROM "transactions" t
  WHERE t."type" = 'INCOME' AND t."category" = 'Qarz to''lovi' AND t."payment_method" = 'CASH'
  GROUP BY 1
) s
WHERE u."id" = s.uid;

UPDATE "users" u SET "click_balance" = "click_balance" + s.total
FROM (
  SELECT t."created_by_id" AS uid, SUM(t."amount") AS total
  FROM "transactions" t
  WHERE t."type" = 'INCOME' AND t."category" = 'Qarz to''lovi' AND t."payment_method" = 'CARD'
  GROUP BY 1
) s
WHERE u."id" = s.uid;

-- 2d) Haydovchi/operator xarajatlari → yozgan odam balansidan ayiriladi
--     (admin qo'lda kiritgan umumiy xarajatlar ishchi balansiga TEGMAYDI)
UPDATE "users" u SET "cash_balance" = "cash_balance" - s.total
FROM (
  SELECT t."created_by_id" AS uid, SUM(t."amount") AS total
  FROM "transactions" t
  WHERE t."type" = 'EXPENSE' AND t."payment_method" = 'CASH'
    AND (t."description" LIKE '%(haydovchi)%' OR t."description" LIKE '%(operator)%')
  GROUP BY 1
) s
WHERE u."id" = s.uid;

UPDATE "users" u SET "click_balance" = "click_balance" - s.total
FROM (
  SELECT t."created_by_id" AS uid, SUM(t."amount") AS total
  FROM "transactions" t
  WHERE t."type" = 'EXPENSE' AND t."payment_method" = 'CARD'
    AND (t."description" LIKE '%(haydovchi)%' OR t."description" LIKE '%(operator)%')
  GROUP BY 1
) s
WHERE u."id" = s.uid;
