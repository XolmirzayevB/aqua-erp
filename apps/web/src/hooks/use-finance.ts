"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/utils";
import type { RangeParams } from "./use-reports";

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
  // Tasdiqlanmagan Klik (karta) to'lovlari — Kirimga hali kirmagan
  pendingClickAmount: number;
  pendingClickCount: number;
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

// range o'rniga "all" berilsa — butun vaqt bo'yicha
export function useFreeOrders(range: RangeParams | "all") {
  const params = range === "all" ? { period: "all" } : { dateFrom: range.from, dateTo: range.to };
  return useQuery({
    queryKey: ["free-orders", params],
    queryFn: () =>
      api.get("/finance/free-orders", { params }).then((r) => r.data.data as FreeOrdersReport),
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

export function useFinanceSummary(range: RangeParams) {
  return useQuery({
    queryKey: ["finance-summary", range.from, range.to],
    queryFn: () =>
      api.get("/finance/summary", { params: { dateFrom: range.from, dateTo: range.to } })
        .then((r) => r.data.data as FinanceSummary),
  });
}

// ─── XARAJATLAR BO'LIMI (2026-09-03) ─────────────────────────────────────────
// Smart guruhlash: "G'ayrat akaga" / "gayratga" / "G'ayrat aka" — hammasi
// bitta guruh bo'lib jamlanadi (backend o'zak bo'yicha guruhlaydi).
export interface ExpenseItem {
  id: string;
  type: "EXPENSE" | "SALARY" | "SUPPLIER_PAYMENT";
  amount: number;
  paymentMethod: "CASH" | "CARD";
  category: string | null;
  note: string | null;
  label: string;
  groupKey: string;
  createdAt: string;
  createdBy: { id: string; name: string; role: string };
  /** Pul kimning balansidan ketgan (ko'rsatilmagan bo'lsa — yozgan odam) */
  spentBy: string;
}

export interface ExpenseReport {
  summary: {
    total: number; count: number; cash: number; card: number;
    byType: Record<string, number>;
    daysCount: number; activeDays: number; avgPerDay: number;
    topLabel: string | null; topAmount: number;
  };
  daily: { date: string; total: number; count: number }[];
  groups: {
    key: string; label: string; total: number; count: number;
    cash: number; card: number; share: number; lastAt: string;
    variants: string[]; items: ExpenseItem[];
  }[];
  byWorker: { userId: string; name: string; role: string; total: number; count: number }[];
  bySource: { name: string; total: number; count: number }[];
  list: ExpenseItem[];
  period: { from: string; to: string };
}

export function useExpenseReport(range: RangeParams) {
  return useQuery({
    queryKey: ["expense-report", range.from, range.to],
    queryFn: () =>
      api.get("/finance/expenses/report", { params: { dateFrom: range.from, dateTo: range.to } })
        .then((r) => r.data.data as ExpenseReport),
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
    // sourceUserId/paymentMethod — xarajat KIMNING qaysi balansidan (2026-07-19)
    mutationFn: (data: {
      amount: number;
      category?: string;
      description?: string;
      paymentMethod?: "CASH" | "CARD";
      sourceUserId?: string;
    }) => api.post("/finance/expenses", data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-expenses"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      // Xarajat ishchi balansidan ayiriladi — balans sahifasi ham yangilansin
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["expense-report"] });
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
