"use client";

// Dizayn (AquaERP.dc.html) umumiy qurilish bloklari:
// PageHeader, StatCard, Avatar, Pill, Ring, Donut + th/btn class'lari.
// Ranglar va o'lchamlar dizayn shablonidagi qiymatlardan olingan.

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------- Sahifa sarlavhasi: h1 30px + subtitle + amallar ---------- */
export function PageHeader({
  title, subtitle, children,
}: {
  title: string; subtitle?: ReactNode; children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-4 items-end justify-between mb-5">
      <div>
        <h1 className="text-[26px] md:text-[30px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-1">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[14px] text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

/* ---------- Tugma class'lari (42px, radius 12) ---------- */
export const btnPrimary =
  "inline-flex items-center gap-2 h-[42px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13.5px] font-semibold shadow-glow transition-all hover:-translate-y-px disabled:opacity-60 disabled:hover:translate-y-0";
export const btnSecondary =
  "inline-flex items-center gap-2 h-[42px] px-4 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-800 text-[13.5px] font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60";

/* ---------- Jadval sarlavhasi (th) ---------- */
export const thClass =
  "text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/60 whitespace-nowrap";

/* ---------- Karta (surface, radius 18, soya) ---------- */
export const cardClass =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-panel";

/* ---------- Ton ranglari ---------- */
export type Tone = "primary" | "violet" | "success" | "warning" | "danger" | "muted";

export const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300",
  violet: "bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300",
  success: "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400",
  warning: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300",
  danger: "bg-red-50 dark:bg-red-500/15 text-red-500 dark:text-red-400",
  muted: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
};

/* ---------- Stat karta (ikonka chapda, label + qiymat + delta pill) ---------- */
export function StatCard({
  label, value, unit, icon: Icon, tone = "primary", delta, deltaUp = true, loading,
}: {
  label: string; value: ReactNode; unit?: string; icon: any; tone?: Tone;
  delta?: string; deltaUp?: boolean; loading?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-[15px] shadow-card flex items-center gap-3.5 hover:-translate-y-0.5 hover:shadow-panel hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200 min-w-0">
      <span className={cn("w-[42px] h-[42px] rounded-xl inline-flex items-center justify-center flex-none", TONE_CLASSES[tone])}>
        <Icon className="w-[19px] h-[19px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-gray-500 dark:text-gray-400 font-medium truncate">{label}</p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className={cn(
            "text-[21px] font-bold tracking-tight tabular-nums leading-none",
            loading ? "text-gray-300 dark:text-gray-700 animate-pulse" : "text-gray-900 dark:text-white"
          )}>
            {loading ? "—" : value}
          </span>
          {unit && <span className="text-[11.5px] text-gray-400 dark:text-gray-500">{unit}</span>}
        </div>
      </div>
      {delta && (
        <span className={cn(
          "inline-flex items-center gap-0.5 text-[11.5px] font-bold px-2 py-[3px] rounded-full flex-none",
          deltaUp
            ? "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400"
            : "bg-red-50 dark:bg-red-500/15 text-red-500 dark:text-red-400"
        )}>
          {delta}
        </span>
      )}
    </div>
  );
}

/* ---------- Stat strip (2/4 ustunli grid) ---------- */
export function StatStrip({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-5">{children}</div>;
}

/* ---------- Avatar — dizayn palitrasi, hash rang, kvadrat-yumaloq ---------- */
const AV_PALETTE = [
  "#B93B3B", "#7C3AED", "#0EA5E9", "#0D9488", "#DB2777",
  "#EA580C", "#16A34A", "#4F46E5", "#CA8A04", "#0891B2",
];

export function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_PALETTE[h % AV_PALETTE.length];
}

export function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  const color = avatarColor(name || "?");
  const parts = (name || "?").replace(/["'`]/g, "").split(/\s+/).filter(Boolean);
  const initials = (
    (parts[0]?.[0] || "") + (parts[1]?.[0] || parts[0]?.[1] || "")
  ).toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center flex-none font-bold tracking-tight"
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.3),
        background: `${color}24`, color, fontSize: size * 0.4,
      }}
    >
      {initials}
    </span>
  );
}

/* ---------- Pill (status/badge) ---------- */
export function Pill({
  tone = "muted", children, dot, pulse, className,
}: {
  tone?: Tone; children: ReactNode; dot?: boolean; pulse?: boolean; className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11.5px] font-semibold whitespace-nowrap",
      TONE_CLASSES[tone], className
    )}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full bg-current flex-none", pulse && "animate-pulse")} />}
      {children}
    </span>
  );
}

/* ---------- Ring — progress halqa (SVG) ---------- */
export function Ring({
  pct, size = 120, thick = 12, colorClass = "text-blue-600 dark:text-blue-400", children,
}: {
  pct: number; size?: number; thick?: number; colorClass?: string; children?: ReactNode;
}) {
  const r = (size - thick) / 2;
  const c = 2 * Math.PI * r;
  const len = Math.max(0, Math.min(1, pct)) * c;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thick}
          className="stroke-gray-100 dark:stroke-gray-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thick}
          strokeLinecap="round" strokeDasharray={`${len} ${c - len}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={cn("stroke-current transition-all duration-700", colorClass)} />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      )}
    </div>
  );
}

/* ---------- Donut — segmentli halqa (SVG) ---------- */
export function Donut({
  segments, size = 180, thick = 22, children,
}: {
  segments: { value: number; color: string }[];
  size?: number; thick?: number; children?: ReactNode;
}) {
  const r = (size - thick) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thick}
          className="stroke-gray-100 dark:stroke-gray-800" />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color} strokeWidth={thick}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: "stroke-dasharray .7s ease" }} />
          );
          acc += len;
          return el;
        })}
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      )}
    </div>
  );
}

/* ---------- Segment tab (davr/filtr tanlash) ---------- */
export function SegmentTabs<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex gap-1 p-1 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 rounded-xl overflow-x-auto max-w-full">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold whitespace-nowrap transition-all",
            value === o.value
              ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-card"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn(
              "text-[11px] font-bold px-1.5 py-px rounded-full tabular-nums",
              value === o.value
                ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
            )}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------- Qator ichidagi kichik tugma (30px) ---------- */
export const rowBtnClass =
  "w-[30px] h-[30px] rounded-[9px] inline-flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all";
