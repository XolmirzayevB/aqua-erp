"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/utils";

export interface DriverSession {
  id: string;
  driverId: string;
  date: string;
  bottlesTaken: number;
  emptyTaken: number;
  bottlesSold: number;
  emptyReturned: number;
  cashCollected: number;
  cardCollected: number;
  status: "OPEN" | "CLOSED";
  notes?: string;
  closedAt?: string;
  createdAt: string;
}

export interface DriverFull {
  id: string;
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count?: { orders: number; driverSessions: number };
}

export interface DriverReport {
  summary: {
    totalBottlesSold: number;
    totalEmptyReturned: number;
    totalCash: number;
    totalCard: number;
    totalRevenue: number;
    deliveredOrders: number;
    totalOrders: number;
    avgPerDay: number;
  };
  sessions: DriverSession[];
  orders: any[];
  dailyChart: { date: string; label: string; bottlesSold: number; cash: number; card: number; orders: number }[];
  period: { from: string; to: string };
}

// ─── Driver list ─────────────────────────────────────────────────────────────

export function useDriversList() {
  return useQuery({
    queryKey: ["drivers-list"],
    queryFn: () => api.get("/drivers").then((r) => r.data.data as DriverFull[]),
  });
}

export function useDriverDetail(id: string) {
  return useQuery({
    queryKey: ["drivers-list", id],
    queryFn: () => api.get(`/drivers/${id}`).then((r) => r.data.data as DriverFull),
    enabled: !!id,
  });
}

export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; phone: string; password: string; vehicle?: string }) =>
      api.post("/drivers", data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers-list"] });
      qc.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Haydovchi qo'shildi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

export function useToggleDriverActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/drivers/${id}/toggle-active`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers-list"] });
      toast.success("Holat yangilandi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export function useTodaySession(driverId: string) {
  return useQuery({
    queryKey: ["driver-session-today", driverId],
    queryFn: () => api.get(`/drivers/${driverId}/session/today`).then((r) => r.data.data as DriverSession | null),
    enabled: !!driverId,
    refetchInterval: 30_000,
  });
}

export function useDriverSessions(driverId: string) {
  return useQuery({
    queryKey: ["driver-sessions", driverId],
    queryFn: () => api.get(`/drivers/${driverId}/sessions`).then((r) => r.data.data as DriverSession[]),
    enabled: !!driverId,
  });
}

export function useOpenSession(driverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { bottlesTaken: number; emptyTaken: number; notes?: string }) =>
      api.post(`/drivers/${driverId}/session/open`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-session-today", driverId] });
      qc.invalidateQueries({ queryKey: ["driver-sessions", driverId] });
      toast.success("Sessiya ochildi — Yaxshi kun!");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

export function useCloseSession(driverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      bottlesSold: number; emptyReturned: number;
      cashCollected: number; cardCollected: number; notes?: string;
    }) => api.post(`/drivers/${driverId}/session/close`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-session-today", driverId] });
      qc.invalidateQueries({ queryKey: ["driver-sessions", driverId] });
      qc.invalidateQueries({ queryKey: ["driver-report"] });
      toast.success("Kun yopildi");
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export function useDriverReport(driverId: string, period: "daily" | "weekly" | "monthly" = "daily") {
  return useQuery({
    queryKey: ["driver-report", driverId, period],
    queryFn: () =>
      api.get(`/drivers/${driverId}/report`, { params: { period } })
        .then((r) => r.data.data as DriverReport),
    enabled: !!driverId,
  });
}

export function useAllDriversReport(period: "daily" | "weekly" | "monthly" = "monthly") {
  return useQuery({
    queryKey: ["drivers-all-report", period],
    queryFn: () =>
      api.get("/drivers/report/all", { params: { period } }).then((r) => r.data.data as any[]),
  });
}
