"use client";

import { useState } from "react";
import {
  FileText, Plus, Edit, Trash2, LogIn, LogOut,
  ChevronLeft, ChevronRight, User as UserIcon,
} from "lucide-react";
import { useAuditLog } from "@/hooks/use-users";
import { formatDate, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ACTION_META: Record<string, { label: string; icon: any; color: string }> = {
  CREATE: { label: "Yaratdi", icon: Plus, color: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  UPDATE: { label: "O'zgartirdi", icon: Edit, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  DELETE: { label: "O'chirdi", icon: Trash2, color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
  LOGIN: { label: "Kirdi", icon: LogIn, color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  LOGOUT: { label: "Chiqdi", icon: LogOut, color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

const ENTITY_LABELS: Record<string, string> = {
  customers: "Mijozlar", orders: "Buyurtmalar", drivers: "Haydovchilar",
  users: "Foydalanuvchilar", finance: "Moliya", inventory: "Ombor",
};

const ACTIONS = ["", "CREATE", "UPDATE", "DELETE"];

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const { data, isLoading } = useAuditLog(page, undefined, action || undefined);

  const logs = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tizimda kim nima qilgani yozib boriladi</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {ACTIONS.map((a) => (
            <button
              key={a}
              onClick={() => { setAction(a); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                action === a ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              )}
            >
              {a === "" ? "Barchasi" : ACTION_META[a]?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              {["Foydalanuvchi", "Amal", "Obyekt", "IP", "Vaqt"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">Yozuvlar yo'q</td></tr>
            ) : logs.map((log: any) => {
              const meta = ACTION_META[log.action] || ACTION_META.UPDATE;
              return (
                <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-semibold">
                        {log.user ? getInitials(log.user.name) : "?"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-xs">{log.user?.name ?? "Tizim"}</p>
                        <p className="text-xs text-gray-400">{log.user?.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium", meta.color)}>
                      <meta.icon className="w-3 h-3" />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs">
                    {ENTITY_LABELS[log.entity] || log.entity}
                    {log.entityId && <span className="text-gray-400 ml-1">#{String(log.entityId).slice(0, 8)}</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs font-mono">{log.ipAddress || "—"}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(log.createdAt, "dd.MM.yyyy HH:mm:ss")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {meta && meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">{meta.total} ta yozuv</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs text-gray-500">{page} / {meta.totalPages}</span>
              <button onClick={() => setPage(page + 1)} disabled={page >= meta.totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
