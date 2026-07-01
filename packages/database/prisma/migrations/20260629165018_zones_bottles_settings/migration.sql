-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "bottles_owned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "location_link" TEXT,
ADD COLUMN     "zone" VARCHAR(50);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "new_bottle_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "new_bottles" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refill_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refill_price" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "settings" (
    "key" VARCHAR(50) NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);
