"use client";

import { useState } from "react";
import {
  Plus, TrendingUp, TrendingDown, Wallet, Users,
  Banknote, CreditCard, ChevronLeft, ChevronRight,
  ArrowDownCircle, ArrowUpCircle,
} from "lucide-react";
import {
  useFinanceSummary, useTransactions, Transaction,
} from "@/hooks/use-finance";
import { TransactionModal } from "./transaction-modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const PERIODS = [
  { value: "daily", label: "Bugun" },
  { value: "weekly", label: "Hafta" },
  { value: "monthly", label: "Oy" },
  { value: "yearly", label: "Yil" },
] as const;

const TYPE_META: Record<string, { label: string; color: string }> = {
  INCOME: { label: "Kirim", color: "text-green-600 dark:text-green-400" },
  EXPENSE: { label: "Xarajat", color: "text-red-500" },
  SALARY: { label: "Ish haqi", color: "text-purple-600 dark:text-purple-400" },
  SUPPLIER_PAYMENT: { label: "Yetkazib beruvchi", color: "text-orange-600 dark:text-orange-400" },
};

export function FinancePage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [showModal, setShowModal] = useState(false);
  const [txnPage, setTxnPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");

  const { data: summary, isLoading } = useFinanceSummary(period);
  const { data: txns } = useTransactions({ page: txnPage, limit: 15, type: typeFilter || undefined });

  const stats = [
    { label: "Kirim", value: summary?.income ?? 0, icon: TrendingUp, color: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400" },
    { label: "Chiqim (jami)", value: summary?.totalOut ?? 0, icon: TrendingDown, color: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" },
    { label: "Sof foyda", value: summary?.profit ?? 0, icon: Wallet, color: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400", highlight: true },
    { label: "Ish haqi", value: summary?.salary ?? 0, icon: Users, color: "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Moliya</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kirim, chiqim va foyda hisoboti</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  period === value ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-blue-200 dark:shadow-blue-900/30">
            <Plus className="w-4 h-4" />
            Tranzaksiya
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "bg-white dark:bg-gray-900 rounded-2xl border p-5",
              stat.highlight ? "border-blue-200 dark:border-blue-900/50 ring-1 ring-blue-100 dark:ring-blue-900/30" : "border-gray-100 dark:border-gray-800"
            )}
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className={cn(
              "text-xl font-bold",
              isLoading ? "animate-pulse text-gray-300" :
              stat.label === "Sof foyda" && stat.value < 0 ? "text-red-500" : "text-gray-900 dark:text-white"
            )}>
              {isLoading ? "—" : formatCurrency(stat.value)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Chart + cash/card split */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Kirim / Chiqim dinamikasi</h2>
          {summary?.chart && summary.chart.length > 0 && (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.chart} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} labelStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="income" name="Kirim" stroke="#10b981" fill="url(#incomeG)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" name="Chiqim" stroke="#ef4444" fill="url(#expenseG)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Cash vs card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Kirim taqsimoti</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
              <Banknote className="w-5 h-5 text-emerald-600" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Naqd</p>
                <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(summary?.cashIn ?? 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Karta</p>
                <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(summary?.cardIn ?? 0)}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400">Tranzaksiyalar: {summary?.transactionCount ?? 0} ta</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions list */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Tranzaksiyalar</h2>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setTxnPage(1); }}
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
            <option value="">Barchasi</option>
            <option value="INCOME">Kirim</option>
            <option value="EXPENSE">Xarajat</option>
            <option value="SALARY">Ish haqi</option>
            <option value="SUPPLIER_PAYMENT">Yetkazib beruvchi</option>
          </select>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              {["Tur", "Kategoriya", "Summa", "Usul", "Izoh", "Kim", "Sana"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!txns?.data?.length ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">Tranzaksiyalar yo'q</td></tr>
            ) : txns.data.map((t) => {
              const meta = TYPE_META[t.type];
              const isIncome = t.type === "INCOME";
              return (
                <tr key={t.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-5 py-3">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", meta.color)}>
                      {isIncome ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs">{t.category || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={cn("font-semibold", isIncome ? "text-green-600 dark:text-green-400" : "text-red-500")}>
                      {isIncome ? "+" : "−"}{formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{t.paymentMethod === "CASH" ? "Naqd" : "Karta"}</td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[180px] truncate">{t.description || "—"}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{t.createdBy?.name}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(t.createdAt, "dd.MM HH:mm")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {txns?.meta && txns.meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">{txns.meta.total} ta jami</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setTxnPage(txnPage - 1)} disabled={txnPage <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs text-gray-500">{txnPage} / {txns.meta.totalPages}</span>
              <button onClick={() => setTxnPage(txnPage + 1)} disabled={txnPage >= txns.meta.totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
