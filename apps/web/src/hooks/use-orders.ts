"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

// Mijozning qo'shimcha manzili (Uy, Apteka...) — buyurtmaga biriktiriladi
export interface OrderLocation {
  id: string;
  label: string;
  address?: string | null;
  locationLink?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  seq: number;
  customerId: string;
  driverId?: string;
  quantity: number;
  pricePerUnit: number;
  refillCount: number;
  newBottles: number;
  refillPrice: number;
  newBottlePrice: number;
  totalAmount: number;
  bottlesReturned: number;
  // null = to'lov turi hali tanlanmagan (yetkazilganda haydovchi tanlaydi)
  // FREE = imtiyozli/bepul zakaz (pul olinmaydi)
  paymentType: "CASH" | "CARD" | "DEBT" | "FREE" | null;
  status: "NEW" | "PROCESSING" | "ASSIGNED" | "DELIVERED" | "CANCELLED";
  notes?: string;
  deliveredAt?: string;
  createdAt: string;
  locationId?: string | null;
  location?: OrderLocation | null;
  customer: { id: string; name: string; phone: string; address: string; balance?: number; zone?: string; locationLink?: string; lat?: number | string | null; lng?: number | string | null };
  driver?: { id: string; name: string; phone?: string };
  createdBy: { id: string; name: string };
}

// Haydovchining kunlik buyurtmalari (marshrut xaritasi uchun, lat/lng bilan)
export function useDriverDayOrders(driverId?: string, date?: string) {
  return useQuery({
    queryKey: ["driver-day-orders", driverId, date],
    queryFn: () =>
      api
        .get(`/orders/driver/${driverId}`, { params: date ? { date } : {} })
        .then((r) => r.data.data as (Order & {
          customer: Order["customer"] & { lat?: number | string | null; lng?: number | string | null };
        })[]),
    enabled: !!driverId,
    refetchInterval: 60_000,
  });
}

export interface OrderQueryParams {
  search?: string;
  status?: string;
  driverId?: string;
  customerId?: string;
  paymentType?: string;
  zone?: string;
  dateFrom?: string;
  dateTo?: string;
  // Qolib ketgan (kechikkan) ochiq zakazlar — eng eskisi birinchi
  overdue?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function useOrders(params: OrderQueryParams = {}) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () =>
      api.get("/orders", { params }).then((r) => r.data.data as {
        data: Order[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data as Order),
    enabled: !!id,
  });
}

export interface CreateOrderPayload {
  customerId: string;
  refillCount?: number;
  newBottles?: number;
  // To'lov turi endi yaratishda YUBORILMAYDI — yetkazilganda haydovchi tanlaydi
  bottlesReturned?: number;
  // Operator mijozdan so'rab aniqlagan uyidagi HAQIQIY tara soni (daftar tuzatiladi)
  actualBottlesOwned?: number;
  locationId?: string; // mijozning qo'shimcha manzili (Uy/Apteka...)
  driverId?: string;
  notes?: string;
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderPayload) =>
      api.post("/orders", data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["driver-day-orders"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Buyurtma yaratildi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    // paymentType — "Yetkazildi"da haydovchi tanlagan to'lov turi (naqd/karta/nasiya)
    mutationFn: ({ id, status, notes, paymentType }: { id: string; status: string; notes?: string; paymentType?: "CASH" | "CARD" | "DEBT" | "FREE" }) =>
      api.patch(`/orders/${id}/status`, { status, notes, paymentType }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["driver-day-orders"] });
      qc.invalidateQueries({ queryKey: ["orders", id] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      // Nasiya bilan yetkazilganda mijoz balansi/qarzdorlik o'zgaradi
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["debts"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      toast.success("Status yangilandi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}

export function useAssignDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, driverId }: { id: string; driverId: string }) =>
      api.patch(`/orders/${id}/assign`, { driverId }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["driver-day-orders"] });
      qc.invalidateQueries({ queryKey: ["orders", id] });
      toast.success("Haydovchi biriktirildi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) =>
      api.patch(`/orders/${id}`, data).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["driver-day-orders"] });
      qc.invalidateQueries({ queryKey: ["orders", id] });
      toast.success("Buyurtma yangilandi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/orders/${id}`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["driver-day-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Buyurtma bekor qilindi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}
