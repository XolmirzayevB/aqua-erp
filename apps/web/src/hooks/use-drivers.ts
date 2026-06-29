"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  role: "DRIVER";
  isActive: boolean;
}

export function useDrivers() {
  return useQuery({
    queryKey: ["drivers"],
    queryFn: () =>
      api.get("/users", { params: { role: "DRIVER", isActive: true, limit: 100 } })
        .then((r) => (r.data.data as Driver[]) ?? []),
    staleTime: 60_000,
  });
}
