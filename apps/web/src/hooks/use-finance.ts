"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/utils";

export interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE" | "SALARY" | "SUPPLIER_PAYMENT";
  amount: number;
  paymentMethod: "CASH" | "CARD";
  category?: string;
  description?: string;
  createdAt: string;
  createdBy: { id: string; name: string };
  customer?: { id: string; name: string };
  order?: { id: string; orderNumber: string };
}

export interface FinanceSummary {
  income: number;
  expense: number;
  salary: number;
  supplier: number;
  totalOut: number;
  profit: number;
  cashIn: number;
  cardIn: number;
  // Yo'ldagi (yetkazilmagan) zakazlar — kutilayotgan pul
  pendingAmount: number;
  pendingCount: number;
  // Imtiyozli (bepul) berilganlar — shu davrda
  freeAmount: number;
  freeCount: number;
  transactionCount: number;
  chart: { label: string; income: number; expense: number }[];
  period: { from: string; to: string };
}

// ── Imtiyozli (bepul) zakazlar hisoboti ──
export interface FreeOrdersReport {
  totalCount: number;
  totalBottles: number;
  totalAmount: number;
  byCustomer: {
    customerId: string; name: string; phone: string; zone?: string | null;
    customerType?: string | null; count: number; bottles: number; amount: number;
    lastAt: string | null;
  }[];
  orders: {
    id: string; seq: number; customerId: string; customerName: string;
    quantity: number; totalAmount: number; deliveredAt: string | null;
    driverName: string | null;
  }[];
  period: { from: string | null; to: string | null };
}

export function useFreeOrders(period: "daily" | "weekly" | "monthly" | "yearly" | "all" = "monthly") {
  return useQuery({
    queryKey: ["free-orders", period],
    queryFn: () =>
      api.get("/finance/free-orders", { params: { period } }).then((r) => r.data.data as FreeOrdersReport),
  });
}

export interface DebtCustomer {
  id: string;
  name: string;
  phone: string;
  address: string;
  balance: number;
  debt: number;
  lastPayment: { createdAt: string; amount: number } | null;
}

export function useTransactions(params: any = {}) {
  return useQuery({
    queryKey: ["transactions", params],
    queryFn: () =>
      api.get("/finance/transactions", { params })
        .then((r) => r.data.data as { data: Transaction[]; meta: any }),
  });
}

export function useFinanceSummary(period: "daily" | "weekly" | "monthly" | "yearly" = "monthly") {
  return useQuery({
    queryKey: ["finance-summary", period],
    queryFn: () =>
      api.get("/finance/summary", { params: { period } }).then((r) => r.data.data as FinanceSummary),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Transaction>) =>
      api.post("/finance/transactions", data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Tranzaksiya qo'shildi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

// ─── Haydovchi xarajati ───────────────────────────────────────────────────────

export interface MyExpense {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  createdAt: string;
}

// Haydovchining bugungi o'z xarajatlari (modal ichida ko'rsatiladi)
export function useMyTodayExpenses(enabled = true) {
  return useQuery({
    queryKey: ["my-expenses"],
    queryFn: () =>
      api.get("/finance/expenses/my").then((r) => r.data.data as { data: MyExpense[]; total: number }),
    enabled,
  });
}

export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; category?: string; description?: string }) =>
      api.post("/finance/expenses", data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-expenses"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Xarajat qo'shildi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

export function useDebts(page = 1, search?: string) {
  return useQuery({
    queryKey: ["debts", page, search],
    queryFn: () =>
      api.get("/finance/debts", { params: { page, search } })
        .then((r) => r.data.data as { data: DebtCustomer[]; meta: any; totalDebt: number }),
  });
}
