import type { Metadata } from "next";
import { InventoryPage } from "@/components/inventory/inventory-page";

export const metadata: Metadata = { title: "Ombor" };

export default function Page() {
  return <InventoryPage />;
}
