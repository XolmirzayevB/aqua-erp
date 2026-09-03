"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

// Barcha hisobot so'rovlari ENDI sana oralig'i bilan ishlaydi (2026-09-03).
// RangePicker {from,to} beradi — o'tgan oy/hafta/ixtiyoriy kunlar shu orqali.
export interface RangeParams { from: string; to: string }
const rangeQuery = (r: RangeParams) => ({ dateFrom: r.from, dateTo: r.to });

export interface ReportOverview {
  orders: { total: number; delivered: number; cancelled: number; revenue: number };
  finance: {
    income: number; expense: number; profit: number;
    // Kutilayotgan Klik (tasdiqlanmagan CARD) va yozilgan qarzlar (DEBT) — davr bo'yicha
    pendingClick: number; pendingClickCount: number;
    debtsWritten: number; debtsWrittenCount: number;
  };
  water: { sold: number; bottlesReturned: number; newBottlesSold: number };
  bottles: {
    deliveredWater: number; newSold: number; emptyBack: number;
    soldBySessions: number; emptyReturned: number; takenBySessions: number;
  };
  newCustomers: number;
  period: { from: string; to: string };
}

export function useReportOverview(range: RangeParams) {
  return useQuery({
    queryKey: ["report-overview", range.from, range.to],
    queryFn: () =>
      api.get("/reports/overview", { params: rangeQuery(range) }).then((r) => r.data.data as ReportOverview),
  });
}

export function useTopCustomers(range: RangeParams, limit = 10) {
  return useQuery({
    queryKey: ["top-customers", range.from, range.to, limit],
    queryFn: () => api.get("/reports/top-customers", { params: { ...rangeQuery(range), limit } }).then((r) => r.data.data),
  });
}

export function useTopDrivers(range: RangeParams, limit = 10) {
  return useQuery({
    queryKey: ["top-drivers", range.from, range.to, limit],
    queryFn: () => api.get("/reports/top-drivers", { params: { ...rangeQuery(range), limit } }).then((r) => r.data.data),
  });
}

export function useTopRegions(range: RangeParams, limit = 10) {
  return useQuery({
    queryKey: ["top-regions", range.from, range.to, limit],
    queryFn: () => api.get("/reports/top-regions", { params: { ...rangeQuery(range), limit } }).then((r) => r.data.data),
  });
}

export function useDebtPayments(range: RangeParams) {
  return useQuery({
    queryKey: ["debt-payments-report", range.from, range.to],
    queryFn: () => api.get("/reports/debt-payments", { params: rangeQuery(range) }).then((r) => r.data.data as {
      payments: { id: string; amount: number; method: string; notes?: string; createdAt: string; customer: { id: string; name: string; phone: string; balance: number } | null }[];
      summary: { total: number; cash: number; card: number; count: number };
      period: { from: string; to: string };
    }),
  });
}

// Download helper with auth token — eksport ham TANLANGAN oraliq bo'yicha
export async function downloadReport(type: "excel" | "pdf", range: RangeParams) {
  const token = useAuthStore.getState().accessToken;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${apiUrl}/api/v1/reports/export/${type}?dateFrom=${range.from}&dateTo=${range.to}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gissar-hisobot-${range.from}_${range.to}.${type === "excel" ? "xlsx" : "pdf"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success(`${type === "excel" ? "Excel" : "PDF"} yuklab olindi`);
  } catch {
    toast.error("Eksport qilishda xatolik");
  }
}
