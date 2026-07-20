"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/utils";

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
  // Yopilgandan keyin tahrirlangan zakazlar (belgisi bilan ko'rinadi)
  editedAt?: string | null;
  editedBy?: { id: string; name: string } | null;
  // Klik (karta) tasdiqlash: null = tasdiqlanmagan (operator kutilyapti).
  // Yetkazilgan CARD zakaz CARD_CONFIRM_HOURS ichida tasdiqlanmasa avto-nasiyaga o'tadi.
  cardConfirmedAt?: string | null;
  customer: { id: string; name: string; phone: string; address: string; balance?: number; zone?: string; locationLink?: string; lat?: number | string | null; lng?: number | string | null; bottlesOwned?: number };
  driver?: { id: string; name: string; phone?: string };
  createdBy: { id: string; name: string };
}

// KLIK TASDIQLASH (2026-07-18): yetkazilgan + Karta (Click) + hali tasdiqlanmagan
export function isCardPending(o: Order): boolean {
  return o.status === "DELIVERED" && o.paymentType === "CARD" && !o.cardConfirmedAt;
}

// Klik tasdiqlash muddati (soat) — backend orders.service CARD_CONFIRM_HOURS
// bilan BIR XIL bo'lishi shart (2026-07-20: 48 → 12 soat, egasi so'rovi)
export const CARD_CONFIRM_HOURS = 12;

// Nasiyaga o'tishga qancha qoldi (yetkazilgandan CARD_CONFIRM_HOURS): "5 soat qoldi"
export function cardTimeLeftLabel(deliveredAt?: string): string {
  if (!deliveredAt) return "";
  const left = new Date(deliveredAt).getTime() + CARD_CONFIRM_HOURS * 3600000 - Date.now();
  if (left <= 0) return "muddat tugadi — nasiyaga o'tadi";
  const days = Math.floor(left / 86400000);
  const hours = Math.floor((left % 86400000) / 3600000);
  if (days > 0) return `${days} kun${hours > 0 ? ` ${hours} soat` : ""} qoldi`;
  return `${Math.max(1, hours)} soat qoldi`;
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
  // Klik to'lovi tasdiqlanmagan yetkazilgan zakazlar — eng eskisi birinchi
  cardPending?: boolean;
  // "Yo'lda" — barcha ochiq (yetkazilmagan) zakazlar
  open?: boolean;
  // "Haydovchi yuklash" — haydovchi biriktirilmagan ochiq zakazlar
  unassigned?: boolean;
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
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    // paymentType — "Yetkazildi"da haydovchi tanlagan to'lov turi (naqd/karta/nasiya).
    // driverLat/driverLng — "Lokatsiyani saqlash" yoqilgan bo'lsa haydovchining GPS joyi.
    mutationFn: ({ id, status, notes, paymentType, driverLat, driverLng, locationAccuracy }:
      { id: string; status: string; notes?: string; paymentType?: "CASH" | "CARD" | "DEBT" | "FREE"; driverLat?: number; driverLng?: number; locationAccuracy?: number }) =>
      api.patch(`/orders/${id}/status`, { status, notes, paymentType, driverLat, driverLng, locationAccuracy }).then((r) => r.data.data),
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
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

// Yopilgan (yetkazilgan) zakazni 24 soat ichida tuzatish — operator/admin.
// Ta'siri hamma joyga: ombor, moliya, mijoz tarasi, hisobotlar.
export function useAdjustOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, refillCount, newBottles, reason, actualBottlesOwned }: { id: string; refillCount: number; newBottles: number; reason?: string; actualBottlesOwned?: number }) =>
      api.patch(`/orders/${id}/adjust`, { refillCount, newBottles, reason, actualBottlesOwned }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["orders", id] });
      qc.invalidateQueries({ queryKey: ["driver-day-orders"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["debts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["free-orders"] });
      toast.success("Zakaz tahrirlandi — hamma hisoblar yangilandi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

// Klik (karta) to'lovini tasdiqlash — operator Click hisobida pulni ko'rib
// bosadi. INCOME shu paytda yoziladi — moliya/dashboard/hisobotlar yangilanadi.
export function useConfirmCardPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/orders/${id}/confirm-card`).then((r) => r.data.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["orders", id] });
      qc.invalidateQueries({ queryKey: ["driver-day-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Klik to'lovi tasdiqlandi — kirim moliyaga yozildi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
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
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

// OCHIQ (yetkazilmagan) zakazni tahrirlash — operator/admin, yetkazishdan oldin.
// Sonlar o'zgarsa mijoz tarasi/ombor/summa qayta hisoblanadi (moliya hali yo'q).
export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, refillCount, newBottles, reason, notes, actualBottlesOwned }:
      { id: string; refillCount?: number; newBottles?: number; reason?: string; notes?: string; actualBottlesOwned?: number }) =>
      api.patch(`/orders/${id}`, { refillCount, newBottles, reason, notes, actualBottlesOwned }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["orders", id] });
      qc.invalidateQueries({ queryKey: ["driver-day-orders"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Zakaz tahrirlandi — tara va ombor hisoblari yangilandi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
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
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}
