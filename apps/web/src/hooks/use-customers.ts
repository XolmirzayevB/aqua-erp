"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  phone2?: string;
  address: string;
  zone?: string;
  locationLink?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  bottlesOwned: number;
  bottlesGiven: number;
  bottlesReturned: number;
  balance: number;
  isActive: boolean;
  createdAt: string;
  createdBy: { id: string; name: string };
  _count?: { orders: number };
}

export interface CustomerQueryParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  debtorsOnly?: boolean;
  zone?: string;
}

export function useCustomers(params: CustomerQueryParams = {}) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () =>
      api.get("/customers", { params }).then((r) => r.data.data as {
        data: Customer[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () => api.get(`/customers/${id}`).then((r) => r.data.data as Customer),
    enabled: !!id,
  });
}

export function useCustomerStats(id: string) {
  return useQuery({
    queryKey: ["customers", id, "stats"],
    queryFn: () => api.get(`/customers/${id}/stats`).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCustomerOrders(id: string, page = 1) {
  return useQuery({
    queryKey: ["customers", id, "orders", page],
    queryFn: () => api.get(`/customers/${id}/orders`, { params: { page, limit: 10 } }).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCustomerPayments(id: string, page = 1) {
  return useQuery({
    queryKey: ["customers", id, "payments", page],
    queryFn: () => api.get(`/customers/${id}/payments`, { params: { page, limit: 10 } }).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Customer>) => api.post("/customers", data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Mijoz muvaffaqiyatli qo'shildi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      api.patch(`/customers/${id}`, data).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers", id] });
      toast.success("Mijoz yangilandi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Mijoz o'chirildi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}

export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, method, notes }: { id: string; amount: number; method: string; notes?: string }) =>
      api.post(`/customers/${id}/payments`, { amount, method, notes }).then((r) => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["customers", id] });
      qc.invalidateQueries({ queryKey: ["customers", id, "payments"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      // Buyurtma tafsilotidagi qarz ko'rsatkichi ham yangilansin (haydovchi qarz olganda)
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["driver-day-orders"] });
      toast.success("To'lov qabul qilindi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}
