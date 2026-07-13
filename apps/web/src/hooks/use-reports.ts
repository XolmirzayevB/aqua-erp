"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

type Period = "daily" | "weekly" | "monthly" | "yearly";

export interface ReportOverview {
  orders: { total: number; delivered: number; cancelled: number; revenue: number };
  finance: { income: number; expense: number; profit: number };
  water: { sold: number; bottlesReturned: number; newBottlesSold: number };
  bottles: {
    deliveredWater: number; newSold: number; emptyBack: number;
    soldBySessions: number; emptyReturned: number; takenBySessions: number;
  };
  newCustomers: number;
  period: { from: string; to: string };
}

// day ("YYYY-MM-DD") berilsa — davr o'rniga o'sha BITTA kun ko'rsatiladi
export function useReportOverview(period: Period = "monthly", day?: string) {
  return useQuery({
    queryKey: ["report-overview", period, day ?? null],
    queryFn: () =>
      api.get("/reports/overview", {
        params: day ? { dateFrom: day, dateTo: day } : { period },
      }).then((r) => r.data.data as ReportOverview),
  });
}

export function useTopCustomers(period: Period = "monthly", limit = 10) {
  return useQuery({
    queryKey: ["top-customers", period, limit],
    queryFn: () => api.get("/reports/top-customers", { params: { period, limit } }).then((r) => r.data.data),
  });
}

export function useTopDrivers(period: Period = "monthly", limit = 10) {
  return useQuery({
    queryKey: ["top-drivers", period, limit],
    queryFn: () => api.get("/reports/top-drivers", { params: { period, limit } }).then((r) => r.data.data),
  });
}

export function useTopRegions(period: Period = "monthly", limit = 10) {
  return useQuery({
    queryKey: ["top-regions", period, limit],
    queryFn: () => api.get("/reports/top-regions", { params: { period, limit } }).then((r) => r.data.data),
  });
}

export function useDebtPayments(period: Period = "monthly", day?: string) {
  return useQuery({
    queryKey: ["debt-payments-report", period, day ?? null],
    queryFn: () => api.get("/reports/debt-payments", { params: day ? { dateFrom: day, dateTo: day } : { period } }).then((r) => r.data.data as {
      payments: { id: string; amount: number; method: string; notes?: string; createdAt: string; customer: { id: string; name: string; phone: string; balance: number } | null }[];
      summary: { total: number; cash: number; card: number; count: number };
      period: { from: string; to: string };
    }),
  });
}

// Download helper with auth token
export async function downloadReport(type: "excel" | "pdf", period: Period) {
  const token = useAuthStore.getState().accessToken;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${apiUrl}/api/v1/reports/export/${type}?period=${period}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aquaerp-hisobot.${type === "excel" ? "xlsx" : "pdf"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success(`${type === "excel" ? "Excel" : "PDF"} yuklab olindi`);
  } catch {
    toast.error("Eksport qilishda xatolik");
  }
}
