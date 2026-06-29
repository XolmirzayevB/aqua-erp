import type { Metadata } from "next";
import { DriversPage } from "@/components/drivers/drivers-page";

export const metadata: Metadata = { title: "Haydovchilar" };

export default function Page() {
  return <DriversPage />;
}
