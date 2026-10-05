-- YO'QOLAYOTGAN MIJOZGA SMS BELGISI (2026-10-05, egasi so'rovi)
-- "SMS" tugmasi bosilganda kim, qachon yuborgani yozib qo'yiladi — ro'yxatda
-- "SMS jo'natildi · sana, soat" ko'rinadi. SMS'ni server yubormaydi (xodim
-- o'z telefonidan yuboradi), bu jadval faqat belgi. Mavjud ma'lumotga tegilmaydi.

CREATE TABLE "customer_sms" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_sms_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_sms_customer_id_created_at_idx" ON "customer_sms"("customer_id", "created_at");

ALTER TABLE "customer_sms" ADD CONSTRAINT "customer_sms_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_sms" ADD CONSTRAINT "customer_sms_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
