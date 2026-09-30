"use client";

// ─── XARAJATLAR BO'LIMI (2026-09-03, egasi so'rovi) ──────────────────────────
// Egasining savoli: "1 oyda KIMGA qancha, NIMAGA qancha pul ketdi?"
// Ikki ko'rinish (tab):
//   1) SMART TAHLIL — o'xshash yozuvlar bitta guruhga yig'iladi
//      ("G'ayrat akaga" = "gayratga" = "G'ayrat aka"), eng kattasi birinchi.
//   2) KETMA-KETLIK — kun bo'yicha: har kunning JAMISI va ichida har bir yozuv.
// Sana tanlash boshqa bo'limlar bilan BIR XIL (RangePicker).
//
// 2026-10-01 (egasi so'rovi): chiqim IKKI TURGA bo'lindi —
//   XARAJAT (yoqilg'i, metan, ta'mirlash) va BERILGAN PUL (odamga berilgan).
// Tepadagi tanlagich butun sahifani (kartalar, grafik, guruhlar, ro'yxat)
// filtrlaydi; ikki turning jamisi esa doim ko'rinib turadi.

import { useMemo, useState } from "react";
import {
  TrendingDown, CalendarClock, ListOrdered, Sparkles, Wallet, Plus,
  ChevronDown, Banknote, CreditCard, Search, User, Crown, HandCoins, Fuel,
  ArrowLeftRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  useExpenseReport, useSetExpenseKind, KIND_LABELS,
  type ExpenseItem, type ExpenseKind,
} from "@/hooks/use-finance";
import { usePermissions } from "@/hooks/use-permissions";
import { DriverExpenseModal } from "@/components/finance/driver-expense-modal";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  PageHeader, StatCard, StatStrip, SegmentTabs, Avatar, Pill, btnPrimary, cardClass,
} from "@/components/shared/page-ui";
import { RangePicker, defaultRange, rangeText, type RangeValue } from "@/components/shared/range-picker";

const TYPE_LABELS: Record<string, string> = {
  EXPENSE: "Xarajat",
  SALARY: "Ish haqi",
  SUPPLIER_PAYMENT: "Yetkazib beruvchi",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin", MANAGER: "Menejer", OPERATOR: "Operator", DRIVER: "Haydovchi",
};

const BAR_COLOR = "#EF4444";        // haqiqiy xarajat — qizil
const BAR_COLOR_PAYOUT = "#D97706";  // berilgan pul — amber

export function ExpensesPage() {
  const [range, setRange] = useState<RangeValue>(defaultRange());
  const [tab, setTab] = useState<"smart" | "list">("smart");
  // Chiqim turi filtri: "" = hammasi
  const [kind, setKind] = useState<"" | ExpenseKind>("");
  const [showModal, setShowModal] = useState(false);
  const { isAdmin, isOperator } = usePermissions();
  const { data, isLoading } = useExpenseReport(range, kind || undefined);

  const s = data?.summary;
  const expenseTotal = s?.byKind?.EXPENSE ?? 0;
  const payoutTotal = s?.byKind?.PAYOUT ?? 0;
  const kindTitle = kind === "PAYOUT" ? "Berilgan pul" : kind === "EXPENSE" ? "Haqiqiy xarajat" : "Barcha chiqim";

  return (
    <div>
      <PageHeader
        title="Xarajatlar"
        subtitle={
          s
            ? `${rangeText(range)} · ${kindTitle.toLowerCase()} ${formatCurrency(s.total)} · ${s.count} ta yozuv`
            : rangeText(range)
        }
      >
        <RangePicker value={range} onChange={setRange} />
        {/* Xarajat yozish — admin/operator (menejer faqat ko'radi) */}
        {(isAdmin || isOperator) && (
          <button onClick={() => setShowModal(true)} className={btnPrimary}>
            <Plus className="w-4 h-4 flex-none" />
            Xarajat
          </button>
        )}
      </PageHeader>

      {/* ── XARAJAT / BERILGAN PUL ── bosilsa butun sahifa shu turga filtrlanadi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4">
        {([
          { v: "", label: "Hammasi", sum: (s?.byKind?.EXPENSE ?? 0) + (s?.byKind?.PAYOUT ?? 0),
            cnt: (s?.countByKind?.EXPENSE ?? 0) + (s?.countByKind?.PAYOUT ?? 0),
            icon: Wallet, ring: "border-gray-900 dark:border-white", text: "text-gray-900 dark:text-white" },
          { v: "EXPENSE", label: "Haqiqiy xarajat", sum: expenseTotal, cnt: s?.countByKind?.EXPENSE ?? 0,
            icon: Fuel, ring: "border-red-500", text: "text-red-600 dark:text-red-400" },
          { v: "PAYOUT", label: "Berilgan pul", sum: payoutTotal, cnt: s?.countByKind?.PAYOUT ?? 0,
            icon: HandCoins, ring: "border-amber-500", text: "text-amber-600 dark:text-amber-400" },
        ] as const).map((o) => {
          const active = kind === o.v;
          return (
            <button
              key={o.v || "all"}
              onClick={() => setKind(o.v as "" | ExpenseKind)}
              className={cn(
                // Mobilda IXCHAM qator (nom chapda, summa o'ngda), sm+ da karta
                "text-left rounded-2xl border bg-white dark:bg-gray-900 px-3.5 sm:px-4 py-2.5 sm:py-[15px] shadow-card transition-all",
                "hover:-translate-y-0.5 hover:shadow-panel min-w-0",
                "flex items-center justify-between gap-2 sm:block",
                active
                  ? cn("border-2", o.ring)
                  : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
              )}
            >
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-gray-500 dark:text-gray-400 min-w-0">
                <o.icon className={cn("w-4 h-4 flex-none", active && o.text)} />
                <span className="truncate">{o.label}</span>
                {o.cnt > 0 && <span className="text-[11px] text-gray-400 tabular-nums flex-none">{o.cnt} ta</span>}
              </span>
              <span className={cn(
                "block sm:mt-1 text-[15px] sm:text-[21px] font-bold tracking-tight tabular-nums leading-tight break-words flex-none sm:flex-auto",
                active ? o.text : "text-gray-900 dark:text-white"
              )}>
                {isLoading ? "—" : formatCurrency(o.sum)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Asosiy raqamlar — tanlangan tur bo'yicha */}
      <StatStrip>
        <StatCard
          label={kindTitle}
          value={formatCurrency(s?.total ?? 0)}
          unit={s ? `${s.count} ta` : undefined}
          icon={kind === "PAYOUT" ? HandCoins : TrendingDown}
          tone={kind === "PAYOUT" ? "warning" : "danger"}
          loading={isLoading}
        />
        <StatCard
          label="Kunlik o'rtacha"
          value={formatCurrency(s?.avgPerDay ?? 0)}
          unit={s ? `${s.daysCount} kun` : undefined}
          icon={CalendarClock}
          tone="warning"
          loading={isLoading}
        />
        <StatCard
          label="Eng ko'p ketgani"
          value={s?.topLabel ?? "—"}
          unit={s?.topAmount ? formatCurrency(s.topAmount) : undefined}
          icon={Crown}
          tone="violet"
          loading={isLoading}
        />
        <StatCard
          label="Naqd / Klik"
          value={formatCurrency(s?.cash ?? 0)}
          unit={`klik ${formatCurrency(s?.card ?? 0)}`}
          icon={Wallet}
          tone="primary"
          loading={isLoading}
        />
      </StatStrip>

      {/* Kunlik xarajat dinamikasi */}
      <div className={cn(cardClass, "p-5 mb-4")}>
        <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
          Kunlik {kind === "PAYOUT" ? "berilgan pul" : "xarajat"}
        </h2>
        <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-0.5 mb-3">
          Har kuni qancha pul chiqqani
        </p>
        {data && data.daily.length > 0 ? (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...data.daily].reverse().map((d) => ({
                  label: formatDate(d.date, "dd.MM"),
                  total: d.total,
                  count: d.count,
                }))}
                margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
              >
                <CartesianGrid stroke="currentColor" className="text-gray-100 dark:text-gray-800" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10.5, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(v: any) => formatCurrency(v)}
                  labelStyle={{ fontSize: 11, fontWeight: 600 }}
                  contentStyle={{ borderRadius: 11, border: "1px solid #ECEEF3", fontSize: 12 }}
                  cursor={{ fill: kind === "PAYOUT" ? "rgba(217,119,6,0.07)" : "rgba(239,68,68,0.06)" }}
                />
                {/* isAnimationActive=false — davr almashganda recharts'ning
                    kirish animatsiyasi "osilib" qolib, ustunlar UMUMAN
                    chizilmasdi (30 kunlik oyda tekshirilgan).
                    Radius ham ustun enidan kichik bo'lishi kerak. */}
                <Bar
                  dataKey="total"
                  name={kind === "PAYOUT" ? "Berilgan pul" : "Xarajat"}
                  fill={kind === "PAYOUT" ? BAR_COLOR_PAYOUT : BAR_COLOR}
                  radius={data.daily.length > 20 ? [2, 2, 0, 0] : [6, 6, 0, 0]}
                  maxBarSize={38}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-52 flex items-center justify-center text-sm text-gray-400">
            {isLoading ? "Yuklanmoqda..." : "Bu davrda xarajat yo'q"}
          </div>
        )}
      </div>

      {/* Ikki ko'rinish */}
      <div className="mb-4">
        <SegmentTabs
          options={[
            { value: "smart", label: "🔎 Smart tahlil", count: data?.groups.length },
            { value: "list", label: "📅 Ketma-ketlik", count: data?.summary.count },
          ]}
          value={tab}
          onChange={(v) => setTab(v as "smart" | "list")}
        />
      </div>

      {tab === "smart" ? (
        <SmartView data={data} isLoading={isLoading} canEdit={isAdmin} />
      ) : (
        <SequenceView data={data} isLoading={isLoading} canEdit={isAdmin} />
      )}

      {showModal && <DriverExpenseModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

/* ─── 1) SMART TAHLIL ─────────────────────────────────────────────────────── */
function SmartView({ data, isLoading, canEdit }: { data: any; isLoading: boolean; canEdit: boolean }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const groups = data?.groups ?? [];
  const max = groups[0]?.total ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4">
      {/* Kimga / nimaga ketdi */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-[11px] bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-none">
            <Sparkles className="w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
              Kimga / nimaga ketdi
            </h2>
            <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-0.5">
              O&apos;xshash yozuvlar birlashtirildi — bosib tafsilotini ko&apos;ring
            </p>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm border-t border-gray-400/70 dark:border-gray-600">
            {isLoading ? "Yuklanmoqda..." : "Bu davrda xarajat yozilmagan"}
          </div>
        ) : (
          groups.map((g: any, i: number) => {
            const open = openKey === g.key;
            return (
              <div key={g.key} className="border-t border-gray-400/70 dark:border-gray-600">
                <button
                  onClick={() => setOpenKey(open ? null : g.key)}
                  className="w-full flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-5 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  {/* Tartib raqami telefonda yashirin — nomga joy ko'proq qolsin */}
                  <span className="w-6 text-center flex-none text-xs font-bold text-gray-400 tabular-nums hidden sm:block">{i + 1}</span>
                  <Avatar name={g.label} size={34} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate">
                      {g.label}
                      {g.variants.length > 1 && (
                        <span className="ml-1.5 text-[11px] font-medium text-gray-400">
                          +{g.variants.length - 1} xil yozilgan
                        </span>
                      )}
                    </p>
                    {/* Ulush chizig'i — ko'z bilan solishtirish uchun */}
                    <div className="mt-1.5 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-700"
                        style={{ width: `${max ? (g.total / max) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-none">
                    <p className="text-[13px] sm:text-[14px] font-bold text-red-600 dark:text-red-400 tabular-nums">
                      {formatCurrency(g.total)}
                    </p>
                    <p className="text-[11px] sm:text-[11.5px] text-gray-400 tabular-nums mt-0.5">
                      {g.count} marta · {g.share}%
                    </p>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-gray-400 flex-none transition-transform", open && "rotate-180")} />
                </button>

                {open && (
                  <div className="bg-gray-50/70 dark:bg-gray-800/30 px-5 py-2 border-t border-gray-100 dark:border-gray-800">
                    {g.items.map((it: ExpenseItem) => (
                      <div key={it.id} className="flex items-center gap-3 py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-800/60">
                        <span className="text-[11.5px] text-gray-400 tabular-nums w-[86px] flex-none">
                          {formatDate(it.createdAt, "dd.MM HH:mm")}
                        </span>
                        <span className="flex-1 min-w-0 text-[12.5px] text-gray-600 dark:text-gray-400 truncate">
                          {it.label}
                          {it.note && it.note !== it.label ? ` · ${it.note}` : ""}
                          <span className="text-gray-400"> — {it.spentBy}</span>
                        </span>
                        <KindBadge kind={it.kind} />
                        <span className="text-[12.5px] font-bold text-gray-900 dark:text-white tabular-nums flex-none">
                          {formatCurrency(it.amount)}
                        </span>
                        {canEdit && <KindSwitch item={it} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Kimning pulidan / kim yozgan */}
      <div className="flex flex-col gap-4">
        <BreakdownCard
          title="Kimning pulidan ketdi"
          hint="Xarajat qaysi ishchining balansidan yechilgan"
          icon={Wallet}
          rows={(data?.bySource ?? []).map((x: any) => ({
            key: x.name, name: x.name, sub: `${x.count} ta yozuv`, value: x.total,
          }))}
          total={data?.summary.total ?? 0}
        />
        <BreakdownCard
          title="Kim yozgan"
          hint="Tizimga xarajatni kiritgan xodim"
          icon={User}
          rows={(data?.byWorker ?? []).map((x: any) => ({
            key: x.userId, name: x.name, sub: ROLE_LABELS[x.role] ?? x.role, value: x.total,
          }))}
          total={data?.summary.total ?? 0}
        />
        {/* Turlari bo'yicha (xarajat / ish haqi / yetkazib beruvchi) */}
        {data && (
          <div className={cn(cardClass, "p-5")}>
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight mb-3">
              Turlari bo&apos;yicha
            </h2>
            <div className="flex flex-col gap-2.5">
              {Object.entries(data.summary.byType as Record<string, number>).map(([type, amount]) => (
                <div key={type} className="flex items-center gap-2.5">
                  <span className="flex-1 text-[13px] text-gray-500 dark:text-gray-400">{TYPE_LABELS[type] ?? type}</span>
                  <span className="text-[13px] font-bold text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
              <div className="pt-2.5 mt-1 border-t border-gray-400/70 dark:border-gray-600 flex items-center gap-2.5">
                <span className="flex-1 text-[13px] font-semibold text-gray-700 dark:text-gray-300">Jami</span>
                <span className="text-[13.5px] font-bold text-red-600 dark:text-red-400 tabular-nums">
                  {formatCurrency(data.summary.total)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownCard({
  title, hint, icon: Icon, rows, total,
}: {
  title: string; hint: string; icon: any;
  rows: { key: string; name: string; sub: string; value: number }[];
  total: number;
}) {
  return (
    <div className={cn(cardClass, "overflow-hidden")}>
      <div className="px-5 py-4 flex items-center gap-3">
        <span className="w-9 h-9 rounded-[11px] bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-none">
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">{title}</h2>
          <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{hint}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-6 text-center text-[13px] text-gray-400 border-t border-gray-400/70 dark:border-gray-600">
          Ma&apos;lumot yo&apos;q
        </div>
      ) : (
        rows.map((r) => (
          <div
            key={r.key}
            className="flex items-center gap-3 px-5 py-2.5 border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25"
          >
            <Avatar name={r.name} size={30} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{r.name}</p>
              <p className="text-[11.5px] text-gray-400 dark:text-gray-500">{r.sub}</p>
            </div>
            <div className="text-right flex-none">
              <p className="text-[13px] font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(r.value)}</p>
              <p className="text-[11px] text-gray-400 tabular-nums">
                {total > 0 ? Math.round((r.value / total) * 100) : 0}%
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ─── Chiqim turi belgisi va tuzatish tugmasi ─────────────────────────────── */
// "Berilgan pul" yozuvlari amber belgi bilan ajralib turadi; xarajatlarda
// belgi ko'rsatilmaydi (ular ko'pchilik — ro'yxat shovqinlashmasin).
function KindBadge({ kind }: { kind?: ExpenseKind }) {
  if (kind !== "PAYOUT") return null;
  return (
    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-semibold whitespace-nowrap flex-none bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
      <HandCoins className="w-3 h-3" /> berildi
    </span>
  );
}

// Admin xato belgilangan yozuvni bitta bosishda qarama-qarshi turga o'tkazadi
function KindSwitch({ item }: { item: ExpenseItem }) {
  const setKindMut = useSetExpenseKind();
  const next: ExpenseKind = item.kind === "PAYOUT" ? "EXPENSE" : "PAYOUT";
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setKindMut.mutate({ id: item.id, kind: next });
      }}
      disabled={setKindMut.isPending}
      title={`"${KIND_LABELS[next]}"ga o'tkazish`}
      className="w-[26px] h-[26px] rounded-lg inline-flex items-center justify-center flex-none text-gray-300 dark:text-gray-600 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors disabled:opacity-40"
    >
      <ArrowLeftRight className="w-3.5 h-3.5" />
    </button>
  );
}

/* ─── 2) KETMA-KETLIK (kun bo'yicha) ──────────────────────────────────────── */
function SequenceView({ data, isLoading, canEdit }: { data: any; isLoading: boolean; canEdit: boolean }) {
  const [q, setQ] = useState("");

  // Kun bo'yicha guruhlash — har kunning JAMISI sarlavhada
  const days = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    const filtered: ExpenseItem[] = needle
      ? data.list.filter((it: ExpenseItem) =>
          [it.label, it.note, it.spentBy, it.createdBy.name].some((v) =>
            (v || "").toLowerCase().includes(needle),
          ),
        )
      : data.list;

    const map = new Map<string, { date: string; total: number; items: ExpenseItem[] }>();
    for (const it of filtered) {
      // Kun — foydalanuvchi ko'rayotgan (mahalliy) sana bo'yicha,
      // ISO satrining UTC qismi emas (kechqurungi xarajat ertaga tushmasin)
      const d = formatDate(it.createdAt, "yyyy-MM-dd");
      const cur = map.get(d) ?? { date: d, total: 0, items: [] };
      cur.total += it.amount;
      cur.items.push(it);
      map.set(d, cur);
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [data, q]);

  const shown = days.reduce((s, d) => s + d.total, 0);

  return (
    <div className={cn(cardClass, "overflow-hidden")}>
      <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-[11px] bg-red-50 dark:bg-red-500/15 text-red-500 dark:text-red-400 flex items-center justify-center flex-none">
            <ListOrdered className="w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
              Xarajatlar ketma-ketligi
            </h2>
            <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-0.5">
              Kunlar bo&apos;yicha — har kunning jamisi bilan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Qidirish: nom, izoh, ishchi..."
              className="h-[38px] w-[210px] pl-9 pr-3 rounded-[10px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[13px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-red-50 dark:bg-red-500/15 text-[13px] font-bold text-red-600 dark:text-red-400 tabular-nums">
            {formatCurrency(shown)}
          </span>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="px-5 py-10 text-center text-gray-400 text-sm border-t border-gray-400/70 dark:border-gray-600">
          {isLoading ? "Yuklanmoqda..." : q ? "Qidiruvga mos xarajat topilmadi" : "Bu davrda xarajat yozilmagan"}
        </div>
      ) : (
        days.map((d) => (
          <div key={d.date}>
            {/* Kun sarlavhasi — kunlik JAMI (egasi shuni so'radi) */}
            <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-y border-gray-400/70 dark:border-gray-600 sticky top-0 z-[1]">
              <span className="text-[13px] font-bold text-gray-900 dark:text-white">
                {formatDate(d.date, "d-MMMM, EEEE")}
              </span>
              <span className="text-[13px] font-bold text-red-600 dark:text-red-400 tabular-nums">
                {formatCurrency(d.total)}
                <span className="ml-1.5 text-[11.5px] font-medium text-gray-400">{d.items.length} ta</span>
              </span>
            </div>

            {d.items.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                <span className="text-[11.5px] text-gray-400 tabular-nums w-[42px] flex-none">
                  {formatDate(it.createdAt, "HH:mm")}
                </span>
                <span className={cn(
                  "w-[30px] h-[30px] rounded-[9px] inline-flex items-center justify-center flex-none",
                  it.paymentMethod === "CASH"
                    ? "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400"
                    : "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
                )}>
                  {it.paymentMethod === "CASH"
                    ? <Banknote className="w-[15px] h-[15px]" />
                    : <CreditCard className="w-[15px] h-[15px]" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate">
                    {it.label}
                    {it.note && it.note !== it.label && (
                      <span className="font-normal text-gray-400"> · {it.note}</span>
                    )}
                  </p>
                  <p className="text-[11.5px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    {it.spentBy} puli
                    {it.createdBy.name !== it.spentBy ? ` · yozdi: ${it.createdBy.name}` : ""}
                    {it.type !== "EXPENSE" ? ` · ${TYPE_LABELS[it.type]}` : ""}
                  </p>
                </div>
                {it.type !== "EXPENSE" && (
                  <Pill tone="warning" className="hidden sm:inline-flex">{TYPE_LABELS[it.type]}</Pill>
                )}
                <KindBadge kind={it.kind} />
                <span className={cn(
                  "text-[13.5px] font-bold tabular-nums flex-none",
                  it.kind === "PAYOUT" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                )}>
                  −{formatCurrency(it.amount)}
                </span>
                {canEdit && <KindSwitch item={it} />}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
