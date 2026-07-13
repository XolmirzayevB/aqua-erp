"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Package, DollarSign, BarChart2,
  TrendingUp, Banknote, CreditCard, Clock, Archive, Map as MapIcon,
} from "lucide-react";
import { RouteMap } from "@/components/route/route-map";
import {
  useDriverDetail, useTodaySession, useDriverSessions,
  useDriverReport, useOpenSession, useCloseSession,
} from "@/hooks/use-driver-sessions";
import { SessionCloseModal } from "./session-close-modal";
import { StatusBadge } from "@/components/orders/status-badge";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";

const PERIOD_OPTS = [
  { value: "daily", label: "Bugun" },
  { value: "weekly", label: "Hafta" },
  { value: "monthly", label: "Oy" },
] as const;

interface Props { id: string }

export function DriverDetail({ id }: Props) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [showClose, setShowClose] = useState(false);
  const [activeTab, setActiveTab] = useState<"sessions" | "orders">("sessions");

  const { data: driver, isLoading } = useDriverDetail(id);
  const { data: session } = useTodaySession(id);
  const { data: sessions = [] } = useDriverSessions(id);
  const { data: report } = useDriverReport(id, period);

  if (isLoading) {
    return <div className="animate-pulse space-y-4 max-w-5xl">
      <div className="h-8 w-40 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      <div className="h-56 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
    </div>;
  }

  if (!driver) return <div className="text-gray-400 text-center py-20">Haydovchi topilmadi</div>;

  const s = report?.summary;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/drivers" className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-base">
              {driver.name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{driver.name}</h1>
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400 font-mono">{formatPhone(driver.phone)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Session actions */}
        <div className="flex items-center gap-2">
          {session?.status === "OPEN" && (
            <button onClick={() => setShowClose(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
              🌙 Kun yopish
            </button>
          )}
        </div>
      </div>

      {/* Today session card */}
      {session && (
        <div className={cn(
          "rounded-2xl border p-5",
          session.status === "OPEN"
            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
            : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={cn("w-2.5 h-2.5 rounded-full", session.status === "OPEN" ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {session.status === "OPEN" ? "🟢 Hozir ishlayapti" : "✅ Kun yopilgan"} — {formatDate(session.date, "dd MMMM yyyy")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Olingan butilka", value: `${session.bottlesTaken} ta`, icon: Package, color: "text-blue-600" },
              { label: "Olingan bo'sh tara", value: `${session.emptyTaken} ta`, icon: Archive, color: "text-orange-600" },
              { label: session.status === "OPEN" ? "Hali sotilmagan" : "Sotilgan", value: `${session.status === "OPEN" ? session.bottlesTaken - session.bottlesSold : session.bottlesSold} ta`, icon: Package, color: session.status === "OPEN" ? "text-yellow-600" : "text-green-600" },
              { label: "Qaytarilgan tara", value: `${session.emptyReturned} ta`, icon: Archive, color: "text-purple-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/70 dark:bg-gray-900/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={cn("w-3.5 h-3.5", color)} />
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
              </div>
            ))}
            {session.status === "CLOSED" && (
              <>
                <div className="bg-white/70 dark:bg-gray-900/50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-xs text-gray-500">Naqd</p>
                  </div>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(session.cashCollected)}</p>
                </div>
                <div className="bg-white/70 dark:bg-gray-900/50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    <p className="text-xs text-gray-500">Karta</p>
                  </div>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(session.cardCollected)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bugungi marshrut xaritasi */}
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <MapIcon className="w-4 h-4 text-blue-600" /> Bugungi marshrut
        </h2>
        <RouteMap driverId={id} />
      </div>

      {/* Report period selector + stats */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-600" /> Hisobot
          </h2>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
            {PERIOD_OPTS.map(({ value, label }) => (
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
        </div>

        {s && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Sotilgan butilka", value: `${s.totalBottlesSold} ta`, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-600" },
                { label: "Qaytarilgan tara", value: `${s.totalEmptyReturned} ta`, color: "bg-orange-50 dark:bg-orange-950/30 text-orange-600" },
                { label: "Yetkazildi", value: `${s.deliveredOrders} ta`, color: "bg-green-50 dark:bg-green-950/30 text-green-600" },
                { label: "Umumiy tushum", value: formatCurrency(s.totalRevenue), color: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className={cn("rounded-xl p-3 text-center", color)}>
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-xs opacity-70 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Chart */}
            {report.dailyChart.length > 1 && (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.dailyChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: any, name: string) =>
                        name === "cash" || name === "card" ? formatCurrency(v) : `${v} ta`
                      }
                      labelStyle={{ fontSize: 11 }}
                    />
                    <Bar dataKey="bottlesSold" name="Butilka" fill="#B93B3B" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="orders" name="Buyurtma" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tabs: sessions / orders */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          {[
            { key: "sessions", label: "Sessiyalar tarixi" },
            { key: "orders", label: "Buyurtmalar" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={cn(
                "px-5 py-3.5 text-sm font-medium transition-all border-b-2",
                activeTab === key
                  ? "border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "sessions" && (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                {["Sana", "Olingan", "Sotilgan", "Bo'sh tara", "Naqd", "Karta", "Status"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">Sessiyalar yo'q</td></tr>
              ) : sessions.map((sess) => (
                <tr key={sess.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{formatDate(sess.date, "dd.MM.yyyy")}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{sess.bottlesTaken} ta</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{sess.bottlesSold} ta</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{sess.emptyReturned} ta</td>
                  <td className="px-5 py-3 text-gray-900 dark:text-white">{formatCurrency(sess.cashCollected)}</td>
                  <td className="px-5 py-3 text-gray-900 dark:text-white">{formatCurrency(sess.cardCollected)}</td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      sess.status === "OPEN"
                        ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    )}>
                      {sess.status === "OPEN" ? "Ochiq" : "Yopilgan"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                {["#", "Mijoz", "Soni", "Summa", "Status", "Sana"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(report?.orders || []).length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">Bu davrda buyurtmalar yo'q</td></tr>
              ) : (report?.orders || []).map((order: any) => (
                <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">
                    <Link href={`/orders/${order.id}`} className="hover:underline font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums" title={order.orderNumber}>#{order.seq}</Link>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{order.customer?.name}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{order.quantity} ta</td>
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(order.createdAt, "dd.MM HH:mm")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {showClose && session && <SessionCloseModal driverId={id} driverName={driver.name} session={session} onClose={() => setShowClose(false)} />}
    </div>
  );
}
