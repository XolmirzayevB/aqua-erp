-- KLIK (karta) TASDIQLASH: operator Click hisobida pulni ko'rib tasdiqlaydi.
-- Yangi ustunlar — faqat qo'shimcha, mavjud ma'lumotga xavfsiz.
ALTER TABLE "orders" ADD COLUMN "card_confirmed_at" TIMESTAMPTZ;
ALTER TABLE "orders" ADD COLUMN "card_confirmed_by_id" TEXT;

-- ESKI karta zakazlari: ularning kirimi (INCOME) yetkazilganda ALLAQACHON
-- yozilgan — tasdiqlangan deb belgilaymiz, aks holda ular "Klik kutilmoqda"
-- ro'yxatiga tushib, 2 kundan keyin NOTO'G'RI ravishda nasiyaga o'tib ketardi.
UPDATE "orders"
SET "card_confirmed_at" = "delivered_at"
WHERE "payment_type" = 'CARD' AND "delivered_at" IS NOT NULL;
