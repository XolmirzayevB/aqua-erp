-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "seq" SERIAL NOT NULL;

-- Mavjud buyurtmalarni yaratilgan vaqti bo'yicha qayta raqamlash
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn FROM "orders"
)
UPDATE "orders" o SET seq = n.rn FROM numbered n WHERE o.id = n.id;

-- Ketma-ketlikni eng katta qiymatdan davom ettirish
SELECT setval(pg_get_serial_sequence('"orders"', 'seq'), COALESCE((SELECT MAX(seq) FROM "orders"), 1));

-- CreateIndex
CREATE UNIQUE INDEX "orders_seq_key" ON "orders"("seq");
