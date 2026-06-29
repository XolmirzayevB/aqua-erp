import type { Metadata } from "next";
import { OrdersTable } from "@/components/orders/orders-table";

export const metadata: Metadata = { title: "Buyurtmalar" };

export default function OrdersPage() {
  return <OrdersTable />;
}
