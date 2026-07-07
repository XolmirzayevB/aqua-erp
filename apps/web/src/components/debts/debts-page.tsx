"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Banknote, ChevronLeft, ChevronRight, Coins, Users, Wallet,
} from "lucide-react";
import { useDebts } from "@/hooks/use-finance";
import { PaymentModal } from "@/components/customers/payment-modal";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PageHeader, StatCard, Avatar, Pill, thClass, cardClass,
} from "@/components/shared/page-ui";
import { usePermissions } from "@/hooks/use-permissions";

export function DebtsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [payTarget, setPayTarget] = useState<{ id: string; name: string; balance: number } | null>(null);

  const { readOnly } = usePermissions();
  const { data, isLoading } = useDebts(page, debouncedSearch);

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 400);
  };

  const debtors = data?.data || [];
  const totalDebt = data?.totalDebt ?? 0;
  const debtorCount = data?.meta?.total ?? 0;
  const avgDebt = debtorCount > 0 ? totalDebt / debtorCount : 0;

  return (
    <div>
      <PageHeader
        title="Qarzdorlik"
        subtitle={data ? `${debtorCount} qarzdor · jami ${formatCurrency(totalDebt)}` : "Yuklanmoqda..."}
      />

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-5">
        <StatCard label="Jami qarz" value={formatCurrency(totalDebt)} icon={Coins} tone="danger" loading={isLoading} />
        <StatCard label="Qarzdorlar" value={debtorCount} unit="mijoz" icon={Users} tone="warning" loading={isLoading} />
        <StatCard label="O'rtacha qarz" value={formatCurrency(Math.round(avgDebt))} icon={Wallet} tone="primary" loading={isLoading} />
      </div>

      {/* Qidiruv */}
      <div className="flex items-center gap-2.5 h-10 px-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[11px] max-w-sm mb-4 focus-within:border-blue-300 dark:focus-within:border-blue-700 transition-colors">
        <Search className="w-4 h-4 text-gray-400 flex-none" />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Qarzdor mijozni qidirish..."
          className="bg-transparent text-[13.5px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none w-full"
        />
      </div>

      {/* Top qarzdorlar jadvali */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="px-5 pt-4 pb-3 text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
          Qarzdorlar ro'yxati
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr>
                <th className={cn(thClass, "pl-5")}>Mijoz</th>
                <th className={thClass}>Telefon</th>
                <th className={thClass}>Manzil</th>
                <th className={thClass}>Oxirgi to'lov</th>
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
              ) : debtors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center border-t border-gray-400/70 dark:border-gray-600">
                    <div className="text-green-500 text-xl mb-1">✓</div>
                    <p className="text-gray-400 dark:text-gray-500">Qarzdor mijozlar yo'q</p>
                  </td>
                </tr>
              ) : debtors.map((d) => (
                <tr key={d.id} className="border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 pl-5 py-3">
                    <Link href={`/customers/${d.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                      <Avatar name={d.name} size={38} />
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[13.5px] font-semibold text-gray-900 dark:text-white whitespace-nowrap max-w-[170px] truncate">
                          {d.name}
                        </span>
                        {(d as any).zone && (
                          <Pill tone="primary" className="!text-[11px] !py-0.5">{(d as any).zone}</Pill>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12.5px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatPhone(d.phone)}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                    {d.address}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {d.lastPayment ? (
                      <span className="text-[13px] text-gray-500 dark:text-gray-400 tabular-nums">
                        {formatDate(d.lastPayment.createdAt, "dd.MM.yyyy")}
                      </span>
                    ) : (
                      <Pill tone="warning">Hali yo'q</Pill>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-500 tabular-nums whitespace-nowrap">
                    {formatCurrency(d.debt)}
                  </td>
                  <td className="px-4 pr-5 py-3 text-right">
                    {!readOnly && (
                      <button
                        onClick={() => setPayTarget({ id: d.id, name: d.name, balance: Number(d.balance) })}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[9px] bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        To'lov
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data?.meta && data.meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-400/70 dark:border-gray-600 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{data.meta.total} ta jami</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs text-gray-500 tabular-nums">{page} / {data.meta.totalPages}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= data.meta.totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
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
