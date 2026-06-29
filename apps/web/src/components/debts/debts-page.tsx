"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Phone, MapPin, AlertTriangle, Banknote,
  ChevronLeft, ChevronRight, TrendingDown, Clock,
} from "lucide-react";
import { useDebts } from "@/hooks/use-finance";
import { PaymentModal } from "@/components/customers/payment-modal";
import { formatCurrency, formatDate, formatPhone, getInitials } from "@/lib/utils";

export function DebtsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [payTarget, setPayTarget] = useState<{ id: string; name: string; balance: number } | null>(null);

  const { data, isLoading } = useDebts(page, debouncedSearch);

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 400);
  };

  const debtors = data?.data || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Qarzdorlik</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data ? `${data.meta.total} ta qarzdor mijoz` : "Yuklanmoqda..."}
          </p>
        </div>
      </div>

      {/* Total debt banner */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-white/80">Umumiy qarzdorlik</p>
            <p className="text-2xl font-bold">{data ? formatCurrency(data.totalDebt) : "—"}</p>
          </div>
        </div>
        <AlertTriangle className="w-8 h-8 text-white/40" />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Qarzdor mijozni qidirish..."
          className="bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none w-full"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              {["Mijoz", "Telefon", "Manzil", "Qarz", "Oxirgi to'lov", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : debtors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <div className="text-green-500 mb-2">✓</div>
                  <p className="text-gray-400 dark:text-gray-500">Qarzdor mijozlar yo'q</p>
                </td>
              </tr>
            ) : debtors.map((d) => (
              <tr key={d.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                <td className="px-5 py-3">
                  <Link href={`/customers/${d.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-700 dark:text-orange-400 font-semibold text-xs flex-shrink-0">
                      {getInitials(d.name)}
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">{d.name}</p>
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 text-xs font-mono">
                    <Phone className="w-3 h-3 text-gray-400" />{formatPhone(d.phone)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="flex items-start gap-1.5 text-gray-500 dark:text-gray-400 text-xs max-w-[180px]">
                    <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{d.address}</span>
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="font-bold text-red-500 text-base">{formatCurrency(d.debt)}</span>
                </td>
                <td className="px-5 py-3">
                  {d.lastPayment ? (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDate(d.lastPayment.createdAt, "dd.MM.yyyy")}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Hali yo'q</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => setPayTarget({ id: d.id, name: d.name, balance: Number(d.balance) })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    To'lov
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data?.meta && data.meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">{data.meta.total} ta jami</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs text-gray-500">{page} / {data.meta.totalPages}</span>
              <button onClick={() => setPage(page + 1)} disabled={page >= data.meta.totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {payTarget && (
        <PaymentModal
          customerId={payTarget.id}
          customerName={payTarget.name}
          currentBalance={payTarget.balance}
          onClose={() => setPayTarget(null)}
        />
      )}
    </div>
  );
}
