"use client";

// ─── DAVR TANLAGICH (2026-09-03, egasi so'rovi) ──────────────────────────────
// Muammo: hisobotlarda faqat BUGUNGI davrlar va bitta kun ko'rinardi —
// "avgust oyida qancha savdo bo'ldi?" degan savolga javob yo'q edi.
// Yechim: BITTA umumiy tanlagich — Hisobot, Tahlil, Moliya va Xarajatlarda
// bir xil ishlaydi:
//   • tez tugmalar: Bugun / Hafta / Oy / Yil
//   • "Davr" tugmasi → o'tgan oylar ro'yxati (12 oy), tez tanlovlar
//     (kecha, oxirgi 7/30 kun, o'tgan hafta/oy) va ixtiyoriy "dan — gacha".
// Natija doim {from, to} (YYYY-MM-DD) — backend aynan shu oraliqni hisoblaydi.

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, X } from "lucide-react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  subDays, subMonths, subWeeks, format,
} from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SegmentTabs } from "./page-ui";

export interface RangeValue {
  /** daily | weekly | monthly | yearly | custom */
  key: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  label: string;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Tez tugmalar (Bugun/Hafta/Oy/Yil) uchun oraliq hisoblash */
export function quickRange(key: string, base = new Date()): RangeValue {
  switch (key) {
    case "daily":
      return { key, from: iso(base), to: iso(base), label: "Bugun" };
    case "weekly":
      return {
        key,
        from: iso(startOfWeek(base, { weekStartsOn: 1 })),
        to: iso(endOfWeek(base, { weekStartsOn: 1 })),
        label: "Shu hafta",
      };
    case "yearly":
      return { key, from: iso(startOfYear(base)), to: iso(endOfYear(base)), label: `${base.getFullYear()}-yil` };
    default:
      return {
        key: "monthly",
        from: iso(startOfMonth(base)),
        to: iso(endOfMonth(base)),
        label: cap(format(base, "LLLL yyyy", { locale: uz })),
      };
  }
}

/** Sahifalar uchun boshlang'ich qiymat — shu oy */
export const defaultRange = () => quickRange("monthly");

/** Ko'rinadigan matn: "1-avgust — 31-avgust 2026" */
export function rangeText(v: RangeValue) {
  const f = new Date(v.from), t = new Date(v.to);
  if (v.from === v.to) return format(f, "d-MMMM yyyy", { locale: uz });
  const sameYear = f.getFullYear() === t.getFullYear();
  return `${format(f, sameYear ? "d-MMMM" : "d-MMMM yyyy", { locale: uz })} — ${format(t, "d-MMMM yyyy", { locale: uz })}`;
}

const QUICK_TABS = [
  { value: "daily", label: "Bugun" },
  { value: "weekly", label: "Hafta" },
  { value: "monthly", label: "Oy" },
  { value: "yearly", label: "Yil" },
];

function presets(now: Date): RangeValue[] {
  const y = subDays(now, 1);
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastMonth = subMonths(now, 1);
  return [
    { key: "custom", from: iso(y), to: iso(y), label: "Kecha" },
    { key: "custom", from: iso(subDays(now, 6)), to: iso(now), label: "Oxirgi 7 kun" },
    { key: "custom", from: iso(subDays(now, 29)), to: iso(now), label: "Oxirgi 30 kun" },
    {
      key: "custom",
      from: iso(lastWeekStart),
      to: iso(endOfWeek(lastWeekStart, { weekStartsOn: 1 })),
      label: "O'tgan hafta",
    },
    {
      key: "custom",
      from: iso(startOfMonth(lastMonth)),
      to: iso(endOfMonth(lastMonth)),
      label: cap(format(lastMonth, "LLLL", { locale: uz })) + " (o'tgan oy)",
    },
    { key: "custom", from: iso(subMonths(now, 3)), to: iso(now), label: "Oxirgi 3 oy" },
  ];
}

function lastMonths(now: Date, count = 12): RangeValue[] {
  return Array.from({ length: count }, (_, i) => {
    const m = subMonths(now, i);
    return {
      key: "custom",
      from: iso(startOfMonth(m)),
      to: iso(endOfMonth(m)),
      label: cap(format(m, "LLL", { locale: uz })),
      // yil ko'rsatish uchun qo'shimcha maydon label ichida emas — pastda beriladi
    } as RangeValue & { year?: number };
  });
}

export function RangePicker({
  value,
  onChange,
}: {
  value: RangeValue;
  onChange: (v: RangeValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);
  const boxRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const today = iso(now);

  // Tashqariga bosilsa yopiladi
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    setCustomFrom(value.from);
    setCustomTo(value.to);
  }, [value.from, value.to]);

  const pick = (v: RangeValue) => {
    onChange(v);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    const [f, t] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
    pick({ key: "custom", from: f, to: t, label: rangeText({ key: "custom", from: f, to: t, label: "" }) });
  };

  const isCustom = value.key === "custom";
  const months = lastMonths(now);

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {/* Tez tugmalar — barcha sahifalarda bir xil */}
      <SegmentTabs
        options={QUICK_TABS}
        value={isCustom ? "" : value.key}
        onChange={(k) => onChange(quickRange(k))}
      />

      {/* Davr tanlash (o'tgan oylar / ixtiyoriy oraliq) */}
      <div className="relative" ref={boxRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "inline-flex items-center gap-2 h-[42px] px-3.5 rounded-xl border text-[13.5px] font-semibold transition-colors max-w-[280px]",
            isCustom
              ? "border-blue-500/60 bg-blue-50/70 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
              : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          <CalendarDays className="w-4 h-4 flex-none" />
          <span className="truncate">{isCustom ? value.label : "Davr tanlash"}</span>
          {isCustom ? (
            <span
              role="button"
              tabIndex={0}
              title="Bekor qilish"
              onClick={(e) => { e.stopPropagation(); onChange(quickRange("monthly")); setOpen(false); }}
              className="w-6 h-6 -mr-1 rounded-lg flex items-center justify-center text-blue-500/70 hover:bg-white/70 dark:hover:bg-gray-800 flex-none"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          ) : (
            <ChevronDown className={cn("w-3.5 h-3.5 flex-none transition-transform", open && "rotate-180")} />
          )}
        </button>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-card-hover p-3.5">
            {/* Tez tanlovlar */}
            <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-500 mb-2">
              Tez tanlov
            </p>
            <div className="grid grid-cols-2 gap-1.5 mb-3.5">
              {presets(now).map((p) => {
                const active = value.from === p.from && value.to === p.to;
                return (
                  <button
                    key={p.label}
                    onClick={() => pick(p)}
                    className={cn(
                      "px-2.5 py-2 rounded-[10px] text-[12.5px] font-semibold text-left transition-colors truncate",
                      active
                        ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                        : "bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Oy bo'yicha — o'tgan 12 oy */}
            <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-500 mb-2">
              Oy bo'yicha
            </p>
            <div className="grid grid-cols-4 gap-1.5 mb-3.5">
              {months.map((m) => {
                const active = value.from === m.from && value.to === m.to;
                const year = new Date(m.from).getFullYear();
                return (
                  <button
                    key={m.from}
                    onClick={() =>
                      pick({ ...m, label: cap(format(new Date(m.from), "LLLL yyyy", { locale: uz })) })
                    }
                    className={cn(
                      "px-1 py-2 rounded-[10px] text-[12px] font-semibold transition-colors leading-tight",
                      active
                        ? "bg-blue-600 text-white"
                        : "bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    {m.label}
                    <span className={cn("block text-[10px] font-medium", active ? "text-white/70" : "text-gray-400")}>
                      {year}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Ixtiyoriy oraliq */}
            <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-500 mb-2">
              Ixtiyoriy oraliq
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                max={today}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="flex-1 min-w-0 h-[38px] px-2.5 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-[12.5px] font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-xs flex-none">—</span>
              <input
                type="date"
                value={customTo}
                max={today}
                onChange={(e) => setCustomTo(e.target.value)}
                className="flex-1 min-w-0 h-[38px] px-2.5 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-[12.5px] font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={applyCustom}
                title="Qo'llash"
                className="w-[38px] h-[38px] flex-none rounded-[10px] bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
