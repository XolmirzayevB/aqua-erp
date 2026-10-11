-- ARALASH / QISMAN TO'LOV (2026-10-11, egasi so'rovi)
-- Muammo: zakaz yopilganda faqat BITTA to'lov turi tanlanardi (naqd / klik /
-- nasiya). Hayotda mijoz yarmini naqd, yarmini klik qiladi yoki to'liq bermaydi.
-- Yechim: yangi tur MIXED + uchta summa ustuni:
--   cash_amount — naqd olingan qism (darrov kirim, haydovchi naqd balansiga)
--   card_amount — klik qismi (operator tasdiqlagach kirim)
--   debt_amount — to'lanmagan qism (mijoz qarziga)
-- Mavjud zakazlarga TEGILMAYDI: ularda ustunlar 0, to'lov turi o'zgarmaydi.

ALTER TYPE "PaymentType" ADD VALUE 'MIXED';

ALTER TABLE "orders"
  ADD COLUMN "cash_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "card_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "debt_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
