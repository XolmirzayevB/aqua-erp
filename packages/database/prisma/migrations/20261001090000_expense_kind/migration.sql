-- XARAJAT / BERILGAN PUL AJRATILDI (2026-10-01, egasi so'rovi)
-- Muammo: hamma chiqim "xarajat" bo'lib ketgan edi — yoqilg'i ham, odamga
-- berilgan pul ham. Endi har bir yozuv belgilanadi:
--   EXPENSE — haqiqiy xarajat (yoqilg'i, metan, ta'mirlash, ovqat...)
--   PAYOUT  — odamga berilgan pul (avans, qarz, "G'ayrat akamga")
-- Pul harakati o'zgarmaydi (ikkalasi ham balansdan ayiriladi) — faqat hisobot
-- ikkiga bo'linadi. Eski yozuvlar default bo'yicha xarajat bo'lib qoladi.

CREATE TYPE "ExpenseKind" AS ENUM ('EXPENSE', 'PAYOUT');

ALTER TABLE "transactions"
  ADD COLUMN "expense_kind" "ExpenseKind" NOT NULL DEFAULT 'EXPENSE';
