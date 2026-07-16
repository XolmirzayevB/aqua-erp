-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "location_id" TEXT,
ALTER COLUMN "payment_type" DROP NOT NULL;

-- CreateTable
CREATE TABLE "customer_locations" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "label" VARCHAR(60) NOT NULL,
    "address" TEXT,
    "location_link" TEXT,
    "lat" DECIMAL(10,8),
    "lng" DECIMAL(11,8),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_locations_customer_id_idx" ON "customer_locations"("customer_id");

-- AddForeignKey
ALTER TABLE "customer_locations" ADD CONSTRAINT "customer_locations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "customer_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
