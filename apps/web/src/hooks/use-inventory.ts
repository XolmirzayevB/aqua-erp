"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/utils";

export interface InventoryItem {
  id: string;
  type: "FULL_BOTTLE" | "EMPTY_BOTTLE" | "BROKEN_BOTTLE" | "LOST_BOTTLE";
  quantity: number;
  updatedAt: string;
}

export interface InventoryOverview {
  warehouseBottles: number;   // omborda (sotilmagan bo'sh tara)
  customerBottles: number;    // mijozlarda (aylanma / sotilgan)
  brokenBottles: number;
  lostBottles: number;
  usableBottles: number;      // omborda + mijozlarda
  totalBottles: number;       // jami sotib olingan
  totalCirculation: number;
  emptyBottles: number;
  items: InventoryItem[];
}

export interface InventoryAction {
  id: string;
  actionType: string;
  quantity: number;
  description?: string;
  createdAt: string;
  inventory: { type: string };
}

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.get("/inventory").then((r) => r.data.data as InventoryOverview),
    refetchInterval: 30_000,
  });
}

export function useInventoryHistory(page = 1, type?: string) {
  return useQuery({
    queryKey: ["inventory-history", page, type],
    queryFn: () =>
      api.get("/inventory/history", { params: { page, limit: 20, type } })
        .then((r) => r.data.data as { data: InventoryAction[]; meta: any }),
  });
}

export function useInventoryIntake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { quantity: number; description?: string }) =>
      api.post("/inventory/intake", data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-history"] });
      toast.success("Qabul qilindi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

export function useInventorySetWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { quantity: number; description?: string }) =>
      api.post("/inventory/set-warehouse", data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-history"] });
      toast.success("Ombor soni belgilandi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

export function useInventoryAdjust() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string; actionType: string; quantity: number; description?: string }) =>
      api.post("/inventory/adjust", data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-history"] });
      toast.success("Tuzatildi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

export function useInventoryMove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { destination: "BROKEN" | "LOST"; quantity: number; description?: string }) =>
      api.post("/inventory/move", data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-history"] });
      toast.success("O'tkazildi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}
