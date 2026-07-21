"use client";

import { useState } from "react";
import {
  Plus, Edit, Trash2, LogIn, LogOut, ChevronLeft, ChevronRight, MapPin, ExternalLink,
} from "lucide-react";
import { useAuditLog } from "@/hooks/use-users";
import { formatDate, formatPhone } from "@/lib/utils";
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
  location: "Lokatsiya",
};

// Filtr tablari: entity yoki action bo'yicha. "location" — haydovchi qo'ygan
// GPS lokatsiyalari (egasi so'rovi 2026-07-21).
const FILTERS: { value: string; label: string; kind: "all" | "entity" | "action" }[] = [
  { value: "", label: "Barchasi", kind: "all" },
  { value: "location", label: "📍 Lokatsiya", kind: "entity" },
  { value: "CREATE", label: "Yaratildi", kind: "action" },
  { value: "UPDATE", label: "O'zgartirildi", kind: "action" },
  { value: "DELETE", label: "O'chirildi", kind: "action" },
];

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const cur = FILTERS.find((f) => f.value === filter) ?? FILTERS[0];
  const { data, isLoading } = useAuditLog(
    page,
    cur.kind === "entity" ? cur.value : undefined,
    cur.kind === "action" ? cur.value : undefined,
  );

  const logs = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Audit jurnali" subtitle="Barcha o'zgarishlar tarixi">
        <SegmentTabs
          options={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
          value={filter}
          onChange={(v) => { setFilter(v); setPage(1); }}
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
              const isLast = i === logs.length - 1;
              const isLocation = log.newData?.type === "LOCATION_SET";
              const m = isLocation
                ? { label: "Lokatsiya o'rnatdi", icon: MapPin, tone: "sky" as Tone }
                : ACTION_META[log.action] || ACTION_META.UPDATE;
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
                        {!isLocation && log.entityId ? ` #${String(log.entityId).slice(0, 8)}` : ""}
                      </Pill>
                    </div>

                    {/* 📍 LOKATSIYA — kim, kimga, qayerga, aniqlik, xarita (egasi so'rovi) */}
                    {isLocation && (
                      <div className="mb-2 rounded-xl border border-sky-100 dark:border-sky-500/20 bg-sky-50/50 dark:bg-sky-500/[0.07] p-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <span className="block text-[13.5px] font-bold text-gray-900 dark:text-white">
                              {log.newData.customerName}
                              {log.newData.orderSeq ? <span className="ml-1.5 font-mono text-[12px] text-blue-600 dark:text-blue-400">#{log.newData.orderSeq}</span> : null}
                            </span>
                            {log.newData.customerPhone && (
                              <span className="block font-mono text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                                {formatPhone(log.newData.customerPhone)}
                              </span>
                            )}
                          </div>
                          {log.newData.mapLink && (
                            <a
                              href={log.newData.mapLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[9px] border border-sky-200 dark:border-sky-500/40 bg-white dark:bg-gray-900 text-[12.5px] font-semibold text-sky-600 dark:text-sky-400 flex-none"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Xaritada
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-2 text-[12px]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 font-semibold text-amber-700 dark:text-amber-400">
                            <MapPin className="w-3 h-3" /> {log.newData.target}
                          </span>
                          {log.newData.accuracy != null && (
                            <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                              aniqlik ~{Math.round(log.newData.accuracy)} m
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                            {Number(log.newData.lat).toFixed(6)}, {Number(log.newData.lng).toFixed(6)}
                          </span>
                        </div>
                      </div>
                    )}

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
          <div className="pt-4 border-t border-gray-400/70 dark:border-gray-600 flex items-center justify-between">
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
