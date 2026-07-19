"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/utils";

// ISHCHI PUL BALANSI (2026-07-19): kimda qancha naqd/klik pul borligi.
// Haydovchiga boshqalarning summasi ko'rinmaydi (null keladi).
export interface WorkerBalance {
  id: string;
  name: string;
  role: "ADMIN" | "OPERATOR" | "DRIVER";
  cashBalance: number | null;
  clickBalance: number | null;
}

export interface TransferUser {
  id: string;
  name: string;
  role: string;
}

export interface WorkerTransfer {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number | string;
  method: "CASH" | "CARD";
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  notes?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  fromUser: TransferUser;
  toUser: TransferUser;
}

export function useBalances() {
  return useQuery({
    queryKey: ["balances"],
    queryFn: () =>
      api.get("/balances").then((r) => r.data.data as {
        data: WorkerBalance[];
        // pendingCash/pendingClick — "yo'ldagi" pul (qabul kutilayotgan
        // o'tkazmalar); cash/click jamlariga ALLAQACHON qo'shilgan
        totals: { cash: number; click: number; pendingCash: number; pendingClick: number } | null;
      }),
  });
}

export function useTransfers() {
  return useQuery({
    queryKey: ["transfers"],
    queryFn: () =>
      api.get("/balances/transfers").then((r) => r.data.data as {
        pending: WorkerTransfer[];
        resolved: WorkerTransfer[];
      }),
  });
}

// Balans/o'tkazma o'zgarganda yangilanadigan keshlar bitta joyda
function invalidateBalanceCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["balances"] });
  qc.invalidateQueries({ queryKey: ["transfers"] });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { toUserId: string; amount: number; method: "CASH" | "CARD"; notes?: string }) =>
      api.post("/balances/transfers", data).then((r) => r.data.data as WorkerTransfer),
    onSuccess: (t) => {
      invalidateBalanceCaches(qc);
      toast.success(`Pul yuborildi — ${t.toUser.name} qabul qilishi kutilmoqda`);
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

export function useAcceptTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/balances/transfers/${id}/accept`).then((r) => r.data.data),
    onSuccess: () => {
      invalidateBalanceCaches(qc);
      toast.success("Pul qabul qilindi — balansingizga qo'shildi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

export function useRejectTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/balances/transfers/${id}/reject`).then((r) => r.data.data),
    onSuccess: () => {
      invalidateBalanceCaches(qc);
      toast.success("O'tkazma rad etildi — pul yuboruvchiga qaytdi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

export function useCancelTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/balances/transfers/${id}/cancel`).then((r) => r.data.data),
    onSuccess: () => {
      invalidateBalanceCaches(qc);
      toast.success("O'tkazma bekor qilindi — pul qaytdi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}
