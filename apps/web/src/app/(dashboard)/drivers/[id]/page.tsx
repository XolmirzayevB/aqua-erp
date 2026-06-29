import type { Metadata } from "next";
import { DriverDetail } from "@/components/drivers/driver-detail";

export const metadata: Metadata = { title: "Haydovchi hisoboti" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DriverDetail id={id} />;
}
