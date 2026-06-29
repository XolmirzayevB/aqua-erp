"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: "ADMIN" | "MANAGER" | "OPERATOR" | "DRIVER";
  isActive: boolean;
  createdAt: string;
  _count?: { orders: number };
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((r) => r.data.data as User[]),
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ["user-stats"],
    queryFn: () => api.get("/users/stats").then((r) => r.data.data as Record<string, number>),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; phone: string; password: string; role: string }) =>
      api.post("/users", data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["user-stats"] });
      toast.success("Foydalanuvchi qo'shildi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> & { password?: string } }) =>
      api.patch(`/users/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["user-stats"] });
      toast.success("Yangilandi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("O'chirildi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik yuz berdi"),
  });
}

// ─── Audit ─────────────────────────────────────────────────────────────────

export function useAuditLog(page = 1, entity?: string, action?: string) {
  return useQuery({
    queryKey: ["audit", page, entity, action],
    queryFn: () =>
      api.get("/audit", { params: { page, entity, action } }).then((r) => r.data.data),
  });
}

// ─── Backup ────────────────────────────────────────────────────────────────

export function useBackups() {
  return useQuery({
    queryKey: ["backups"],
    queryFn: () => api.get("/backup").then((r) => r.data.data as any[]),
  });
}

export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/backup").then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backups"] });
      toast.success("Backup yaratildi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Backup xatosi"),
  });
}

export function useRestoreBackup() {
  return useMutation({
    mutationFn: (filename: string) => api.post(`/backup/restore/${filename}`).then((r) => r.data.data),
    onSuccess: () => toast.success("Backup tiklandi"),
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Tiklashda xatolik"),
  });
}

export function useDeleteBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (filename: string) => api.delete(`/backup/${filename}`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backups"] });
      toast.success("Backup o'chirildi");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] || "Xatolik"),
  });
}
