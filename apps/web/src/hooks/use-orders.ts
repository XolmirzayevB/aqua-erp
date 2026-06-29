"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  driverId?: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  bottlesReturned: number;
  paymentType: "CASH" | "CARD" | "DEBT";
  status: "NEW" | "PROCESSING" | "ASSIGNED" | "DELIVERED" | "CANCELLED";
  notes?: string;
  deliveredAt?: string;
  createdAt: string;
  customer: { id: string; name: string; phone: string; address: string; balance?: number };
  driver?: { id: string; name: string; phone?: string };
  createdBy: { id: string; name: string };
}

export interface OrderQueryParams {
  search?: string;
  status?: string;
  driverId?: string;
  customerId?: string;
  paymentType?: string;
  dateFrom?: string;
  dateTo?: string;
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

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Order> & { customerId: string }) =>
      api.post("/orders", data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Buyurtma yaratildi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      api.patch(`/orders/${id}/status`, { status, notes }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["orders", id] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
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
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Buyurtma bekor qilindi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}
