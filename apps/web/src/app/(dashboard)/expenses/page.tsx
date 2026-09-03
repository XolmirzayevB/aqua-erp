import type { Metadata } from "next";
import { ExpensesPage } from "@/components/expenses/expenses-page";

export const metadata: Metadata = { title: "Xarajatlar" };

export default function Page() {
  return <ExpensesPage />;
}
