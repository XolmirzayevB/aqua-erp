"use client";

// Haydovchining bugungi marshruti — xarita + yurish tartibi
import { useAuthStore } from "@/store/auth.store";
import { RouteMap } from "@/components/route/route-map";
import { PageHeader } from "@/components/shared/page-ui";
import { formatDate } from "@/lib/utils";

export default function RoutePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Bugungi marshrut"
        subtitle={`${formatDate(new Date(), "d-MMMM, EEEE")} · sizga biriktirilgan buyurtmalar`}
      />
      <RouteMap driverId={user?.id} />
    </div>
  );
}
