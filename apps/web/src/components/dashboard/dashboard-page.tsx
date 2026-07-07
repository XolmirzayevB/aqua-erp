"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Banknote, Coins, Droplet, Users,
  Plus, UserPlus, Wallet, Download, ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PAYMENT_TYPE_LABELS } from "@aqua/shared";
import { StatusBadge } from "@/components/orders/status-badge";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/use-permissions";

// Dizayn KPI kartasi: ikonka chapda tepada, pastda label + katta qiymat + birlik
function KpiCard({
  label, value, unit, icon: Icon, tone,
}: {
  label: string; value: string | number; unit?: string; icon: any; tone: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-panel hover:shadow-card-hover hover:-translate-y-[3px] hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200">
      <span className={`w-10 h-10 rounded-xl inline-flex items-center justify-center mb-4 ${tone}`}>
        <Icon className="w-[19px] h-[19px]" />
      </span>
      <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium mb-1.5">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[26px] md:text-[30px] font-bold text-gray-900 dark:text-white tracking-tight leading-none tabular-nums">
          {value}
        </span>
        {unit && <span className="text-[13px] text-gray-400 dark:text-gray-500 font-medium">{unit}</span>}
      </div>
    </div>
  );
}

const quickActions = [
  { label: "Yangi buyurtma", href: "/orders", icon: Plus, primary: true },
  { label: "Mijoz qo'shish", href: "/customers", icon: UserPlus },
  { label: "To'lov qabul qilish", href: "/debts", icon: Wallet },
  { label: "Hisobot", href: "/reports", icon: Download },
];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { readOnly } = usePermissions();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/dashboard/stats").then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  const inProgress = Math.max(
    0,
    (data?.todayOrders ?? 0) - (data?.deliveredToday ?? 0) - (data?.cancelledToday ?? 0)
  );

  const summaryChips = [
    { label: "Buyurtma", value: data?.todayOrders ?? "—", dot: "bg-blue-500" },
    { label: "Yetkazildi", value: data?.deliveredToday ?? "—", dot: "bg-green-500" },
    { label: "Jarayonda", value: inProgress, dot: "bg-amber-500 animate-pulse" },
    { label: "Bekor", value: data?.cancelledToday ?? "—", dot: "bg-red-500" },
  ];

  const kpis = [
    {
      label: "Oylik tushum",
      value: data ? formatCurrency(data.monthIncome || 0) : "—",
      unit: formatDate(new Date(), "MMMM"),
      icon: Banknote,
      tone: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300",
    },
    {
      label: "Qarzdor mijozlar",
      value: data?.debtorCount ?? "—",
      unit: data ? formatCurrency(data.totalDebt || 0) : "",
      icon: Coins,
      tone: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300",
    },
    {
      label: "Bo'sh taralar",
      value: data?.emptyBottles ?? "—",
      unit: "omborda",
      icon: Droplet,
      tone: "bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300",
    },
    {
      label: "Jami mijozlar",
      value: data?.totalCustomers ?? "—",
      unit: "faol",
      icon: Users,
      tone: "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400",
    },
  ];

  const firstName = user?.name?.split(" ")[0] || "";

  return (
    <div>
      {/* Salomlashuv + tezkor amallar */}
      <div className="flex flex-wrap gap-4 items-end justify-between mb-5">
        <div>
          <h1 className="text-[26px] md:text-[30px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-1">
            Assalomu alaykum{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400">
            {formatDate(new Date(), "d-MMMM, EEEE")} — bugun {data?.todayOrders ?? 0} ta buyurtma bor.
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2 flex-wrap">
            {quickActions.map((qa) => (
              <Link
                key={qa.label}
                href={qa.href}
                className={
                  qa.primary
                    ? "inline-flex items-center gap-2 h-[42px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13.5px] font-semibold shadow-glow transition-all hover:-translate-y-px"
                    : "inline-flex items-center gap-2 h-[42px] px-4 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-800 text-[13.5px] font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                }
              >
                <qa.icon className="w-4 h-4 flex-none" />
                <span className="hidden sm:inline">{qa.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bugungi xulosa — bo'lingan qatorli karta (4 holat + tushum) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-card mb-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-stretch divide-y sm:divide-y-0 sm:divide-x divide-gray-400/70 dark:divide-gray-600">
          {summaryChips.map((c) => (
            <div key={c.label} className="flex-1 flex items-center gap-3 px-5 py-4">
              <span className={`w-2.5 h-2.5 rounded-full flex-none ${c.dot}`} />
              <div className="min-w-0">
                <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight leading-none">
                  {c.value}
                </div>
                <div className="text-[12px] text-gray-500 dark:text-gray-400 font-medium mt-1">{c.label}</div>
              </div>
            </div>
          ))}
          {/* Bugungi tushum — ajratilgan yashil segment */}
          <div className="flex-1 flex items-center gap-3 px-5 py-4 bg-green-50/60 dark:bg-green-500/10">
            <span className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center flex-none">
              <Banknote className="w-[18px] h-[18px] text-green-600 dark:text-green-400" />
            </span>
            <div className="min-w-0">
              <div className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums tracking-tight leading-none truncate">
                {data ? formatCurrency(data.todayIncome || 0) : "—"}
              </div>
              <div className="text-[12px] text-green-700/80 dark:text-green-400/70 font-medium mt-1">Bugungi tushum</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI kartalar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* So'nggi buyurtmalar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-panel overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
            So'nggi buyurtmalar
          </h2>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
          >
            Barchasi
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr>
                  {["Buyurtma", "Tara", "Summa", "To'lov", "Holat", "Sana"].map((h, i) => (
                    <th
                      key={h}
                      className={`text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/60 whitespace-nowrap ${i === 0 ? "pl-5" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.recentOrders || []).map((order: any) => (
                  <tr
                    key={order.id}
                    className="border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 pl-5 py-3">
                      <div className="font-mono text-[13.5px] font-bold text-blue-600 dark:text-blue-400 tabular-nums" title={order.orderNumber}>
                        #{order.seq}
                      </div>
                      <div className="text-[12.5px] text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap">
                        {order.customer?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13.5px] font-semibold text-gray-900 dark:text-white tabular-nums">
                      {order.quantity} ta
                    </td>
                    <td className="px-4 py-3 text-[13.5px] font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {PAYMENT_TYPE_LABELS[order.paymentType as keyof typeof PAYMENT_TYPE_LABELS]}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(order.createdAt, "dd.MM HH:mm")}
                    </td>
                  </tr>
                ))}
                {!data?.recentOrders?.length && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm border-t border-gray-400/70 dark:border-gray-600">
                      Hali buyurtmalar yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
