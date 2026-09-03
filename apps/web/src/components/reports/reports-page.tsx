"use client";

import { useState } from "react";
import {
  FileSpreadsheet, FileText, ShoppingCart, CheckCircle,
  XCircle, Droplets, Package, TrendingUp, TrendingDown,
  Wallet, UserPlus, CreditCard, NotebookPen,
} from "lucide-react";
import { useReportOverview, useDebtPayments, downloadReport } from "@/hooks/use-reports";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PageHeader, StatCard, btnPrimary, btnSecondary, thClass, cardClass,
} from "@/components/shared/page-ui";
import { RangePicker, defaultRange, rangeText, type RangeValue } from "@/components/shared/range-picker";

export function ReportsPage() {
  // Davr tanlash (2026-09-03): tez tugmalar + o'tgan oylar + ixtiyoriy oraliq.
  // 12-da yozilib 13-da yetkazilgan zakaz — 13-kunning "Yetkazilgan"ida chiqadi.
  const [range, setRange] = useState<RangeValue>(defaultRange());
  const [downloading, setDownloading] = useState<"excel" | "pdf" | null>(null);
  const { data, isLoading } = useReportOverview(range);
  const { data: debts } = useDebtPayments(range);

  const handleDownload = async (type: "excel" | "pdf") => {
    setDownloading(type);
    await downloadReport(type, range);
    setDownloading(null);
  };

  return (
    <div>
      <PageHeader
        title="Hisobotlar"
        subtitle={rangeText(range)}
      >
        <RangePicker value={range} onChange={setRange} />
        <button
          onClick={() => handleDownload("pdf")}
          disabled={downloading !== null}
          className={btnPrimary}
        >
          <FileText className="w-4 h-4 flex-none" />
          {downloading === "pdf" ? "..." : "PDF"}
        </button>
        <button
          onClick={() => handleDownload("excel")}
          disabled={downloading !== null}
          className={btnSecondary}
        >
          <FileSpreadsheet className="w-4 h-4 flex-none" />
          {downloading === "excel" ? "..." : "Excel"}
        </button>
      </PageHeader>

      {/* KPI kartalar */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 mb-4">
        {/* "Yozilgan" — shu davrda yozilgan; "Yetkazilgan" — shu davrda yetkazilgan
            (oldinroq yozilgan bo'lsa ham). Suv/tara — yetkazilganlar asosida. */}
        <StatCard label="Yozilgan buyurtmalar" value={data?.orders.total ?? 0} icon={ShoppingCart} tone="primary" loading={isLoading} />
        <StatCard label="Yetkazilgan" value={data?.orders.delivered ?? 0} icon={CheckCircle} tone="success" loading={isLoading} />
        <StatCard label="Bekor qilingan" value={data?.orders.cancelled ?? 0} icon={XCircle} tone="danger" loading={isLoading} />
        <StatCard label="Yangi mijozlar" value={data?.newCustomers ?? 0} icon={UserPlus} tone="violet" loading={isLoading} />
        <StatCard label="Yetkazilgan suv" value={data?.water.sold ?? 0} unit="dona" icon={Droplets} tone="primary" loading={isLoading} />
        <StatCard label="Qaytib olingan bo'sh tara" value={data?.water.bottlesReturned ?? 0} unit="dona" icon={Package} tone="warning" loading={isLoading} />
      </div>

      {/* Moliya + tara aylanishi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className={cn(cardClass, "p-5")}>
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight mb-4">Moliyaviy xulosa</h2>
          {/* Kirim — kelgan pul; Kutilayotgan Klik — tasdiqlanmagan karta (hali
              Kirimda EMAS); Yozilgan qarz — davrdagi nasiya (to'langanда Kirimga
              tushadi). Sof foyda = Kirim − Chiqim. Chalkashmaslik uchun har
              kartada soni ham ko'rsatiladi. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
            {[
              { label: "Kirim", value: data?.finance.income ?? 0, icon: TrendingUp, cls: "text-green-600 dark:text-green-400" },
              { label: "Kutilayotgan Klik", value: data?.finance.pendingClick ?? 0, count: data?.finance.pendingClickCount, icon: CreditCard, cls: "text-sky-600 dark:text-sky-400" },
              { label: "Yozilgan qarzlar", value: data?.finance.debtsWritten ?? 0, count: data?.finance.debtsWrittenCount, icon: NotebookPen, cls: "text-amber-600 dark:text-amber-400" },
              { label: "Chiqim", value: data?.finance.expense ?? 0, icon: TrendingDown, cls: "text-red-500" },
              { label: "Sof foyda", value: data?.finance.profit ?? 0, icon: Wallet, cls: "text-blue-600 dark:text-blue-400" },
            ].map((c) => (
              <div key={c.label} className="text-center px-2 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                <c.icon className={cn("w-5 h-5 mx-auto mb-2", c.cls)} />
                <p className={cn(
                  "text-[14px] font-bold tabular-nums tracking-tight",
                  c.label === "Sof foyda" && (c.value as number) < 0 ? "text-red-500" : "text-gray-900 dark:text-white"
                )}>
                  {formatCurrency(c.value)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">
                  {c.label}
                  {"count" in c && (c.count ?? 0) > 0 && (
                    <span className="ml-1 text-[11px] text-gray-400">· {c.count} ta</span>
                  )}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-gray-400 dark:text-gray-500">
            Kutilayotgan Klik — operator tasdiqlagach <b>Kirim</b>ga qo&apos;shiladi.
            Yozilgan qarz — mijoz to&apos;laganda &quot;Qarz to&apos;lovi&quot; orqali <b>Kirim</b>ga tushadi.
            Sof foyda = Kirim − Chiqim (kutilayotgan pullar kirmagan).
          </p>
        </div>

        <div className={cn(cardClass, "p-5")}>
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight mb-4">
            Tara aylanishi <span className="text-gray-400 font-normal text-[12.5px]">(buyurtmalar bo'yicha)</span>
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Yetkazilgan suv", value: data?.bottles.deliveredWater ?? 0, cls: "text-blue-600 dark:text-blue-400" },
              { label: "Yangi tara sotildi", value: data?.bottles.newSold ?? 0, cls: "text-green-600 dark:text-green-400" },
              { label: "Bo'sh tara qaytdi", value: data?.bottles.emptyBack ?? 0, cls: "text-amber-600 dark:text-amber-300" },
            ].map((c) => (
              <div key={c.label} className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                <p className={cn("text-[22px] font-bold tabular-nums tracking-tight", c.cls)}>{c.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Qarz to'lovlari */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
            Qarz to'lovlari <span className="text-gray-400 font-normal text-[12.5px]">(kim qancha to'ladi)</span>
          </h2>
          {debts && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-green-50 dark:bg-green-500/15 text-[13px] font-bold text-green-600 dark:text-green-400 tabular-nums">
              Jami: {formatCurrency(debts.summary.total)} · {debts.summary.count} ta
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr>
                <th className={cn(thClass, "pl-5")}>Mijoz</th>
                <th className={thClass}>Telefon</th>
                <th className={cn(thClass, "text-right")}>To'lagan</th>
                <th className={thClass}>Usul</th>
                <th className={thClass}>Qolgan qarz</th>
                <th className={cn(thClass, "pr-5")}>Sana</th>
              </tr>
            </thead>
            <tbody>
              {!debts?.payments?.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm border-t border-gray-400/70 dark:border-gray-600">
                    Bu davrda qarz to'lovi yo'q
                  </td>
                </tr>
              ) : debts.payments.map((p) => (
                <tr key={p.id} className="border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 pl-5 py-3 text-[13.5px] font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    {p.customer?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12.5px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {p.customer ? formatPhone(p.customer.phone) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-[13.5px] font-bold text-green-600 dark:text-green-400 tabular-nums whitespace-nowrap">
                    +{formatCurrency(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-gray-500 dark:text-gray-400">
                    {p.method === "CASH" ? "Naqd" : "Karta"}
                  </td>
                  <td className="px-4 py-3">
                    {p.customer && p.customer.balance < 0 ? (
                      <span className="text-[13px] font-semibold text-red-500 tabular-nums">
                        {formatCurrency(Math.abs(p.customer.balance))}
                      </span>
                    ) : (
                      <span className="text-[13px] text-green-600 dark:text-green-400 font-medium">Qarzi yo'q</span>
                    )}
                  </td>
                  <td className="px-4 pr-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(p.createdAt, "dd.MM.yyyy HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
