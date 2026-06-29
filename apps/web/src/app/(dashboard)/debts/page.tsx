import type { Metadata } from "next";
import { DebtsPage } from "@/components/debts/debts-page";

export const metadata: Metadata = { title: "Qarzdorlik" };

export default function Page() {
  return <DebtsPage />;
}
