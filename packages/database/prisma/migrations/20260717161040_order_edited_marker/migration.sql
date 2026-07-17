-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "edited_at" TIMESTAMPTZ,
ADD COLUMN     "edited_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
