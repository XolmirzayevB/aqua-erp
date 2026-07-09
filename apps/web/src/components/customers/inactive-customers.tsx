"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Navigation, ChevronLeft, ChevronRight, UserX, Clock,
} from "lucide-react";
import { useInactiveCustomers } from "@/hooks/use-customers";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PageHeader, Avatar, Pill, SegmentTabs, thClass, cardClass,
} from "@/components/shared/page-ui";
import { usePermissions } from "@/hooks/use-permissions";

const DAY_OPTIONS = [
  { value: "7", label: "7 kun" },
  { value: "14", label: "14 kun" },
  { value: "30", label: "30 kun" },
];

// Nechchi kun bo'lganiga qarab rang (uzoq = qizilroq)
function toneForDays(d: number) {
  if (d >= 30) return "danger" as const;
  if (d >= 14) return "warning" as const;
  return "muted" as const;
}

export function InactiveCustomers() {
  const [days, setDays] = useState("14");
  const [page, setPage] = useState(1);
  const { isDriver } = usePermissions();
  const { data, isLoading } = useInactiveCustomers(Number(days), page);

  const list = data?.data || [];
  const meta = data?.meta;

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Link
          href="/customers"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-none"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <PageHeader
            title="Yo'qolayotgan mijozlar"
            subtitle={meta ? `${meta.total} ta mijoz ${days} kundan beri zakaz qilmagan` : "Yuklanmoqda..."}
          />
        </div>
      </div>

      {/* Davr tanlash */}
      <div className="mb-4">
        <SegmentTabs
          options={DAY_OPTIONS}
          value={days}
          onChange={(v) => { setDays(v); setPage(1); }}
        />
      </div>

      {/* MOBIL: kartalar */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn(cardClass, "p-4")}>
              <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-2" />
              <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))
        ) : list.length === 0 ? (
          <div className={cn(cardClass, "px-5 py-12 text-center")}>
            <div className="text-green-500 text-xl mb-1">✓</div>
            <p className="text-gray-400 dark:text-gray-500">Yaxshi — bu davrda yo'qolayotgan mijoz yo'q</p>
          </div>
        ) : (
          list.map((c) => (
            <div key={c.id} className={cn(cardClass, "p-4 shadow-card")}>
              <div className="flex items-center gap-3">
                <Avatar name={c.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/customers/${c.id}`} className="text-[14px] font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400">{c.name}</Link>
                    {c.zone && <Pill tone="primary" className="!text-[11px] !py-0.5">{c.zone}</Pill>}
                  </div>
                  <span className="font-mono text-xs text-gray-400 dark:text-gray-500">{formatPhone(c.phone)}</span>
                </div>
                <Pill tone={toneForDays(c.daysSince)} className="!text-[11px] whitespace-nowrap">
                  <Clock className="w-3 h-3" /> {c.daysSince} kun
                </Pill>
              </div>
              <div className="flex items-center justify-between gap-2 mt-3">
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  Oxirgi zakaz: {formatDate(c.lastOrderAt, "dd.MM.yyyy")}
                  {Number(c.balance) < 0 && <span className="text-red-500 font-medium"> · qarz {formatCurrency(Math.abs(Number(c.balance)))}</span>}
                </span>
                <a href={`tel:${c.phone}`} className="flex-none inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold transition-colors">
                  <Phone className="w-4 h-4" /> Qo'ng'iroq
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* KOMPYUTER: jadval */}
      <div className={cn(cardClass, "overflow-hidden hidden md:block")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr>
                <th className={cn(thClass, "pl-5")}>Mijoz</th>
                <th className={thClass}>Telefon</th>
                <th className={thClass}>Oxirgi zakaz</th>
                <th className={cn(thClass, "text-center")}>Qancha vaqt</th>
                <th className={cn(thClass, "text-right")}>Qarz</th>
                <th className={cn(thClass, "pr-5")}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-400/70 dark:border-gray-600">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center border-t border-gray-400/70 dark:border-gray-600">
                    <div className="text-green-500 text-xl mb-1">✓</div>
                    <p className="text-gray-400 dark:text-gray-500">Yaxshi — bu davrda yo'qolayotgan mijoz yo'q</p>
                  </td>
                </tr>
              ) : list.map((c) => (
                <tr key={c.id} className="border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 pl-5 py-3">
                    <Link href={`/customers/${c.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                      <Avatar name={c.name} size={38} />
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[13.5px] font-semibold text-gray-900 dark:text-white whitespace-nowrap max-w-[170px] truncate">{c.name}</span>
                        {c.zone && <Pill tone="primary" className="!text-[11px] !py-0.5">{c.zone}</Pill>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12.5px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatPhone(c.phone)}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">{formatDate(c.lastOrderAt, "dd.MM.yyyy")}</td>
                  <td className="px-4 py-3 text-center">
                    <Pill tone={toneForDays(c.daysSince)} className="!text-[11px] whitespace-nowrap">
                      <Clock className="w-3 h-3" /> {c.daysSince} kun
                    </Pill>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold tabular-nums whitespace-nowrap">
                    {Number(c.balance) < 0
                      ? <span className="text-red-500">{formatCurrency(Math.abs(Number(c.balance)))}</span>
                      : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 pr-5 py-3 text-right">
                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[9px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap">
                      <Phone className="w-3.5 h-3.5" /> Qo'ng'iroq
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sahifalash */}
      {meta && meta.totalPages > 1 && (
        <div className={cn(cardClass, "px-4 py-3 mt-3 flex items-center justify-between")}>
          <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{meta.total} ta jami</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs text-gray-500 tabular-nums">{page} / {meta.totalPages}</span>
            <button onClick={() => setPage(page + 1)} disabled={page >= meta.totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
