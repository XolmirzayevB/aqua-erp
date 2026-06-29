"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

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
  transactionCount: number;
  chart: { label: string; income: number; expense: number }[];
  period: { from: string; to: string };
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
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
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
