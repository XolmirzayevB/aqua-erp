"use client";

import { useState } from "react";
import {
  Plus, Edit, Trash2, LogIn, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuditLog } from "@/hooks/use-users";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PageHeader, Avatar, Pill, SegmentTabs, cardClass, TONE_CLASSES,
} from "@/components/shared/page-ui";
import type { Tone } from "@/components/shared/page-ui";

const ACTION_META: Record<string, { label: string; icon: any; tone: Tone }> = {
  CREATE: { label: "Yaratdi", icon: Plus, tone: "success" },
  UPDATE: { label: "O'zgartirdi", icon: Edit, tone: "primary" },
  DELETE: { label: "O'chirdi", icon: Trash2, tone: "danger" },
  LOGIN:  { label: "Kirdi", icon: LogIn, tone: "violet" },
  LOGOUT: { label: "Chiqdi", icon: LogOut, tone: "muted" },
};

const ENTITY_LABELS: Record<string, string> = {
  customers: "Mijoz", orders: "Buyurtma", drivers: "Haydovchi",
  users: "Foydalanuvchi", finance: "Moliya", inventory: "Ombor",
};

const ACTIONS = ["", "CREATE", "UPDATE", "DELETE"];

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const { data, isLoading } = useAuditLog(page, undefined, action || undefined);

  const logs = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Audit jurnali" subtitle="Barcha o'zgarishlar tarixi">
        <SegmentTabs
          options={ACTIONS.map((a) => ({
            value: a,
            label: a === "" ? "Barchasi" : ACTION_META[a]?.label || a,
          }))}
          value={action}
          onChange={(v) => { setAction(v); setPage(1); }}
        />
      </PageHeader>

      <div className={cn(cardClass, "p-6")}>
        <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight mb-5">
          O'zgarishlar tarixi
        </h2>

        {isLoading ? (
          <div className="flex flex-col gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3.5">
                <div className="w-8 h-8 rounded-[9px] bg-gray-100 dark:bg-gray-800 animate-pulse flex-none" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-gray-400">Yozuvlar yo'q</p>
        ) : (
          <div className="flex flex-col">
            {logs.map((log: any, i: number) => {
              const m = ACTION_META[log.action] || ACTION_META.UPDATE;
              const isLast = i === logs.length - 1;
              return (
                <div key={log.id} className="flex gap-3.5 relative pb-5">
                  {/* Vertikal chiziq */}
                  {!isLast && (
                    <span className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-800 -translate-x-1/2" />
                  )}
                  {/* Ikonka */}
                  <span className={cn(
                    "w-8 h-8 rounded-[9px] inline-flex items-center justify-center flex-none z-[1]",
                    TONE_CLASSES[m.tone]
                  )}>
                    <m.icon className="w-4 h-4" />
                  </span>
                  {/* Matn */}
                  <div className="flex-1 min-w-0 pt-px">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-[13.5px] font-semibold text-gray-900 dark:text-white">
                        {m.label}
                      </span>
                      <Pill tone={m.tone} className="!text-[11px]">
                        {ENTITY_LABELS[log.entity] || log.entity}
                        {log.entityId ? ` #${String(log.entityId).slice(0, 8)}` : ""}
                      </Pill>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Avatar name={log.user?.name || "Tizim"} size={24} />
                      <span className="text-[12.5px] text-gray-500 dark:text-gray-400 font-medium">
                        {log.user?.name ?? "Tizim"}
                      </span>
                      {log.ipAddress && (
                        <span className="font-mono text-[11px] text-gray-400 dark:text-gray-600">{log.ipAddress}</span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        · {formatDate(log.createdAt, "dd.MM.yyyy HH:mm:ss")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700/70 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{meta.total} ta yozuv</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs text-gray-500 tabular-nums">{page} / {meta.totalPages}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= meta.totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
