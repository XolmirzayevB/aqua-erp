"use client";

import { useState } from "react";
import {
  Plus, TrendingUp, TrendingDown, Wallet, Percent, Truck,
  ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Gift, Droplets,
} from "lucide-react";
import { useFinanceSummary, useTransactions, useFreeOrders } from "@/hooks/use-finance";
import { Avatar } from "@/components/shared/page-ui";
import { formatPhone } from "@/lib/utils";
import { TransactionModal } from "./transaction-modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  PageHeader, StatCard, StatStrip, Donut, SegmentTabs, btnPrimary, cardClass,
} from "@/components/shared/page-ui";
import { usePermissions } from "@/hooks/use-permissions";

const PERIODS = [
  { value: "daily", label: "Bugun" },
  { value: "weekly", label: "Hafta" },
  { value: "monthly", label: "Oy" },
  { value: "yearly", label: "Yil" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

const TX_META: Record<string, { label: string; isIn: boolean }> = {
  INCOME: { label: "Kirim", isIn: true },
  EXPENSE: { label: "Xarajat", isIn: false },
  SALARY: { label: "Ish haqi", isIn: false },
  SUPPLIER_PAYMENT: { label: "Yetkazib beruvchi", isIn: false },
};

export function FinancePage() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [showModal, setShowModal] = useState(false);
  const [txnPage, setTxnPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");

  const { readOnly } = usePermissions();
  const { data: summary, isLoading } = useFinanceSummary(period);
  const { data: txns } = useTransactions({ page: txnPage, limit: 15, type: typeFilter || undefined });

  const income = summary?.income ?? 0;
  const totalOut = summary?.totalOut ?? 0;
  const profit = summary?.profit ?? 0;
  const margin = income > 0 ? Math.round((profit / income) * 100) : 0;

  const paySegs = [
    { label: "Naqd", value: summary?.cashIn ?? 0, color: "#16A34A" },
    { label: "Karta", value: summary?.cardIn ?? 0, color: "#B93B3B" },
  ];
  const payTotal = paySegs.reduce((s, x) => s + x.value, 0);

  return (
    <div>
      <PageHeader
        title="Moliya"
        subtitle={summary ? `Sof foyda ${formatCurrency(profit)} · ${summary.transactionCount ?? 0} tranzaksiya` : "Yuklanmoqda..."}
      >
        <SegmentTabs
          options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
          value={period}
          onChange={setPeriod}
        />
        {!readOnly && (
          <button onClick={() => setShowModal(true)} className={btnPrimary}>
            <Plus className="w-4 h-4 flex-none" />
            Tranzaksiya
          </button>
        )}
      </PageHeader>

      {/* Stat strip — Tushum = KELGAN pul (yetkazilganda yoziladi);
          "Yo'lda" = yetkazilmagan zakazlarning kutilayotgan puli */}
      <StatStrip>
        <StatCard label="Tushum (kelgan pul)" value={formatCurrency(income)} icon={TrendingUp} tone="success" loading={isLoading} />
        <StatCard
          label="Yo'lda (kutilmoqda)"
          value={formatCurrency(summary?.pendingAmount ?? 0)}
          unit={summary?.pendingCount ? `${summary.pendingCount} ta zakaz` : undefined}
          icon={Truck}
          tone="warning"
          loading={isLoading}
        />
        <StatCard label="Xarajat (jami)" value={formatCurrency(totalOut)} icon={TrendingDown} tone="danger" loading={isLoading} />
        <StatCard
          label="Sof foyda"
          value={
            <span className={profit < 0 ? "text-red-500" : undefined}>{formatCurrency(profit)}</span>
          }
          icon={Wallet}
          tone="primary"
          loading={isLoading}
        />
        <StatCard label="Rentabellik" value={margin} unit="%" icon={Percent} tone="violet" loading={isLoading} />
      </StatStrip>

      {/* Pul oqimi + kirim taqsimoti */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 mb-4">
        <div className={cn(cardClass, "p-5")}>
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">Pul oqimi</h2>
              <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-0.5">Tushum va xarajat dinamikasi</p>
            </div>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-[12.5px] text-gray-500 dark:text-gray-400 font-medium">
                <span className="w-[9px] h-[9px] rounded-[3px] bg-green-600" /> Tushum
              </span>
              <span className="flex items-center gap-1.5 text-[12.5px] text-gray-500 dark:text-gray-400 font-medium">
                <span className="w-[9px] h-[9px] rounded-[3px] bg-red-500" /> Xarajat
              </span>
            </div>
          </div>
          {summary?.chart && summary.chart.length > 0 ? (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.chart} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                  <defs>
                    {/* Tushum yashil — xarajat qizil bo'lgani uchun brend qizil ishlatilmaydi (adashadi) */}
                    <linearGradient id="incomeG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16A34A" stopOpacity={0.2} />
                      <stop offset="80%" stopColor="#16A34A" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="expenseG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.12} />
                      <stop offset="80%" stopColor="#EF4444" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="currentColor" className="text-gray-100 dark:text-gray-800" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10.5, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    formatter={(v: any) => formatCurrency(v)}
                    labelStyle={{ fontSize: 11, fontWeight: 600 }}
                    contentStyle={{ borderRadius: 11, border: "1px solid #ECEEF3", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="income" name="Tushum" stroke="#16A34A" strokeWidth={2.5} fill="url(#incomeG)" />
                  <Area type="monotone" dataKey="expense" name="Xarajat" stroke="#EF4444" strokeWidth={2.5} fill="url(#expenseG)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-sm text-gray-400">Ma'lumot yo'q</div>
          )}
        </div>

        {/* Kirim taqsimoti (donut) */}
        <div className={cn(cardClass, "p-5")}>
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">Kirim taqsimoti</h2>
          <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-0.5">To'lov usuli bo'yicha</p>
          <div className="flex items-center justify-center my-4">
            <Donut segments={paySegs} size={170} thick={21}>
              <span className="text-[11px] text-gray-400">Jami kirim</span>
              <span className="text-[18px] font-bold text-gray-900 dark:text-white tabular-nums px-3 text-center leading-tight">
                {formatCurrency(payTotal)}
              </span>
            </Donut>
          </div>
          <div className="flex flex-col gap-2.5">
            {paySegs.map((s) => (
              <div key={s.label} className="flex items-center gap-2.5">
                <span className="w-[9px] h-[9px] rounded-[3px] flex-none" style={{ background: s.color }} />
                <span className="flex-1 text-[13px] text-gray-500 dark:text-gray-400">{s.label}</span>
                <span className="text-[13px] font-bold text-gray-900 dark:text-white tabular-nums">
                  {formatCurrency(s.value)}
                </span>
              </div>
            ))}
            <div className="pt-2 mt-1 border-t border-gray-400/70 dark:border-gray-600 text-xs text-gray-400">
              Tranzaksiyalar: {summary?.transactionCount ?? 0} ta
            </div>
          </div>
        </div>
      </div>

      {/* 🎁 Imtiyozli (bepul) zakazlar — alohida hisob-kitob (egasi so'rovi 2026-07-17) */}
      <FreeOrdersCard pagePeriod={period} />

      {/* So'nggi tranzaksiyalar — dizayn ro'yxati */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">So'nggi tranzaksiyalar</h2>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setTxnPage(1); }}
            className="text-xs font-medium border border-gray-100 dark:border-gray-800 rounded-[9px] px-2.5 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="">Barchasi</option>
            <option value="INCOME">Kirim</option>
            <option value="EXPENSE">Xarajat</option>
            <option value="SALARY">Ish haqi</option>
            <option value="SUPPLIER_PAYMENT">Yetkazib beruvchi</option>
          </select>
        </div>
        <div>
          {!txns?.data?.length ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm border-t border-gray-400/70 dark:border-gray-600">
              Tranzaksiyalar yo'q
            </div>
          ) : txns.data.map((t) => {
            const meta = TX_META[t.type] || { label: t.type, isIn: false };
            return (
              <div
                key={t.id}
                className="flex items-center gap-3.5 px-5 py-3 border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                <span className={cn(
                  "w-[34px] h-[34px] rounded-[10px] inline-flex items-center justify-center flex-none",
                  meta.isIn
                    ? "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400"
                    : "bg-red-50 dark:bg-red-500/15 text-red-500 dark:text-red-400"
                )}>
                  {meta.isIn ? <ArrowDownCircle className="w-[17px] h-[17px]" /> : <ArrowUpCircle className="w-[17px] h-[17px]" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate">
                    {meta.label}
                    {t.category ? ` — ${t.category}` : ""}
                    {t.description ? ` · ${t.description}` : ""}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {t.paymentMethod === "CASH" ? "Naqd" : "Karta"}
                    {t.createdBy?.name ? ` · ${t.createdBy.name}` : ""}
                    {" · "}
                    {formatDate(t.createdAt, "dd.MM HH:mm")}
                  </div>
                </div>
                <span className={cn(
                  "text-sm font-bold tabular-nums whitespace-nowrap",
                  meta.isIn ? "text-green-600 dark:text-green-400" : "text-red-500"
                )}>
                  {meta.isIn ? "+" : "−"}{formatCurrency(t.amount)}
                </span>
              </div>
            );
          })}
        </div>

        {txns?.meta && txns.meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-400/70 dark:border-gray-600 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{txns.meta.total} ta jami</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTxnPage(txnPage - 1)}
                disabled={txnPage <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs text-gray-500 tabular-nums">{txnPage} / {txns.meta.totalPages}</span>
              <button
                onClick={() => setTxnPage(txnPage + 1)}
                disabled={txnPage >= txns.meta.totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ── 🎁 IMTIYOZLI (BEPUL) ZAKAZLAR — alohida hisob-kitob ──────────────────────
// Prokuratura kabi joylarga bepul berilganlar: jami soni/tarasi/qiymati +
// KIMGA qancha berilgani. Davr — sahifadagi tanlov bo'yicha; "Butun vaqt"
// tugmasi bilan boshidan beri jami ham ko'riladi.
function FreeOrdersCard({ pagePeriod }: { pagePeriod: "daily" | "weekly" | "monthly" | "yearly" }) {
  const [allTime, setAllTime] = useState(false);
  const { data, isLoading } = useFreeOrders(allTime ? "all" : pagePeriod);

  const periodLabel = allTime
    ? "butun vaqt"
    : { daily: "bugun", weekly: "shu hafta", monthly: "shu oy", yearly: "shu yil" }[pagePeriod];

  return (
    <div className={cn(cardClass, "overflow-hidden mb-4")}>
      {/* Sarlavha */}
      <div className="px-5 py-4 flex items-center gap-3 flex-wrap">
        <span className="w-9 h-9 rounded-[11px] bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-none">
          <Gift className="w-[18px] h-[18px]" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
            Imtiyozli (bepul) berilganlar
          </h2>
          <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-0.5">
            Pul olinmagan zakazlar — {periodLabel}
          </p>
        </div>
        <button
          onClick={() => setAllTime((v) => !v)}
          className={cn(
            "h-9 px-3.5 rounded-[10px] border text-[12.5px] font-semibold transition-all flex-none",
            allTime
              ? "bg-violet-600 text-white border-violet-600"
              : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800 hover:border-violet-300"
          )}
        >
          Butun vaqt
        </button>
      </div>

      {/* Jami ko'rsatkichlar */}
      <div className="grid grid-cols-3 border-t border-gray-400/70 dark:border-gray-600">
        {[
          { label: "Zakazlar", value: `${data?.totalCount ?? 0} ta`, icon: Gift },
          { label: "Tara (suv)", value: `${data?.totalBottles ?? 0} ta`, icon: Droplets },
          { label: "Qiymati", value: formatCurrency(data?.totalAmount ?? 0), icon: Wallet },
        ].map((s) => (
          <div key={s.label} className="px-4 py-3.5 flex items-center gap-2.5 border-r last:border-r-0 border-gray-400/70 dark:border-gray-600 min-w-0">
            <s.icon className="w-4 h-4 text-violet-500 flex-none" />
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{s.label}</p>
              <p className="text-[14px] font-bold text-gray-900 dark:text-white tabular-nums truncate">
                {isLoading ? "…" : s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Kimga qancha berilgan — mijoz bo'yicha, eng ko'pi birinchi */}
      {data && data.byCustomer.length > 0 ? (
        <div>
          {data.byCustomer.map((c) => (
            <div
              key={c.customerId}
              className="flex items-center gap-3 px-5 py-3 border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25"
            >
              <Avatar name={c.name} size={34} />
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate">
                  {c.name}
                  {c.customerType && (
                    <span className="ml-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">{c.customerType}</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">
                  {formatPhone(c.phone)}{c.zone ? ` · ${c.zone}` : ""}
                  {c.lastAt ? ` · oxirgisi ${formatDate(c.lastAt, "dd.MM")}` : ""}
                </p>
              </div>
              <div className="text-right flex-none">
                <p className="text-[13.5px] font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                  {formatCurrency(c.amount)}
                </p>
                <p className="text-[11.5px] text-gray-400 tabular-nums mt-0.5">
                  {c.count} zakaz · {c.bottles} tara
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-6 text-center text-[13px] text-gray-400 border-t border-gray-400/70 dark:border-gray-600">
          {isLoading ? "Yuklanmoqda..." : `Bepul berilgan zakaz yo'q (${periodLabel})`}
        </div>
      )}
    </div>
  );
}
