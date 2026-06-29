"use client";

import { useState } from "react";
import {
  FileSpreadsheet, FileText, ShoppingCart, CheckCircle,
  XCircle, Droplets, Package, TrendingUp, TrendingDown,
  Wallet, UserPlus, Download,
} from "lucide-react";
import { useReportOverview, downloadReport } from "@/hooks/use-reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "daily", label: "Kunlik" },
  { value: "weekly", label: "Haftalik" },
  { value: "monthly", label: "Oylik" },
  { value: "yearly", label: "Yillik" },
] as const;

export function ReportsPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [downloading, setDownloading] = useState<"excel" | "pdf" | null>(null);
  const { data, isLoading } = useReportOverview(period);

  const handleDownload = async (type: "excel" | "pdf") => {
    setDownloading(type);
    await downloadReport(type, period);
    setDownloading(null);
  };

  const cards = [
    { label: "Jami buyurtmalar", value: data?.orders.total ?? 0, icon: ShoppingCart, color: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" },
    { label: "Yetkazilgan", value: data?.orders.delivered ?? 0, icon: CheckCircle, color: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400" },
    { label: "Bekor qilingan", value: data?.orders.cancelled ?? 0, icon: XCircle, color: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" },
    { label: "Yangi mijozlar", value: data?.newCustomers ?? 0, icon: UserPlus, color: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400" },
    { label: "Sotilgan suv", value: `${data?.water.sold ?? 0} dona`, icon: Droplets, color: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400" },
    { label: "Qaytarilgan tara", value: `${data?.water.bottlesReturned ?? 0} ta`, icon: Package, color: "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400" },
  ];

  const financeCards = [
    { label: "Kirim", value: data?.finance.income ?? 0, icon: TrendingUp, color: "text-green-600 dark:text-green-400" },
    { label: "Chiqim", value: data?.finance.expense ?? 0, icon: TrendingDown, color: "text-red-500" },
    { label: "Sof foyda", value: data?.finance.profit ?? 0, icon: Wallet, color: "text-blue-600 dark:text-blue-400" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Hisobotlar</h1>
          {data && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(data.period.from, "dd.MM.yyyy")} — {formatDate(data.period.to, "dd.MM.yyyy")}
            </p>
          )}
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
          <button
            onClick={() => handleDownload("excel")}
            disabled={downloading !== null}
            className="flex items-center gap-2 px-3 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {downloading === "excel" ? "..." : "Excel"}
          </button>
          <button
            onClick={() => handleDownload("pdf")}
            disabled={downloading !== null}
            className="flex items-center gap-2 px-3 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <FileText className="w-4 h-4" />
            {downloading === "pdf" ? "..." : "PDF"}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex items-center gap-4">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", c.color)}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className={cn("text-xl font-bold", isLoading ? "animate-pulse text-gray-300" : "text-gray-900 dark:text-white")}>
                {isLoading ? "—" : c.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Finance summary */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Moliyaviy xulosa</h2>
        <div className="grid grid-cols-3 gap-4">
          {financeCards.map((c) => (
            <div key={c.label} className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
              <c.icon className={cn("w-6 h-6 mx-auto mb-2", c.color)} />
              <p className={cn("text-lg font-bold", c.label === "Sof foyda" && c.value < 0 ? "text-red-500" : "text-gray-900 dark:text-white")}>
                {formatCurrency(c.value)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottle circulation */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Tara aylanishi (sessiyalar bo'yicha)</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Olingan butilka", value: data?.bottles.takenBySessions ?? 0, color: "text-blue-600" },
            { label: "Sotilgan butilka", value: data?.bottles.soldBySessions ?? 0, color: "text-green-600" },
            { label: "Qaytarilgan tara", value: data?.bottles.emptyReturned ?? 0, color: "text-orange-600" },
          ].map((c) => (
            <div key={c.label} className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
              <p className={cn("text-2xl font-bold", c.color)}>{c.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
