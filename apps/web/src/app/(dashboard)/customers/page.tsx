import type { Metadata } from "next";
import { CustomersTable } from "@/components/customers/customers-table";

export const metadata: Metadata = { title: "Mijozlar" };

export default function CustomersPage() {
  return <CustomersTable />;
}
