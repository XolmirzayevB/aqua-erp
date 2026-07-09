import type { Metadata } from "next";
import { InactiveCustomers } from "@/components/customers/inactive-customers";

export const metadata: Metadata = { title: "Yo'qolayotgan mijozlar" };

export default function Page() {
  return <InactiveCustomers />;
}
