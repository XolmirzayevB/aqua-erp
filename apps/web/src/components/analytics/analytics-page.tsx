"use client";

import { useState } from "react";
import {
  Trophy, Truck, MapPin, Crown, Medal, Award,
} from "lucide-react";
import Link from "next/link";
import {
  useTopCustomers, useTopDrivers, useTopRegions,
} from "@/hooks/use-reports";
import { useFinanceSummary } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const PERIODS = [
  { value: "weekly", label: "Hafta" },
  { value: "monthly", label: "Oy" },
  { value: "yearly", label: "Yil" },
] as const;

const RANK_ICONS = [Crown, Medal, Award];
const RANK_COLORS = ["text-yellow-500", "text-gray-400", "text-orange-600"];
const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export function AnalyticsPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const { data: topCustomers = [] } = useTopCustomers(period, 8);
  const { data: topDrivers = [] } = useTopDrivers(period, 8);
  const { data: topRegions = [] } = useTopRegions(period, 6);
  const { data: finance } = useFinanceSummary(period);

  const regionPieData = topRegions.map((r: any) => ({ name: r.region, value: r.revenue }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Grafiklar va eng yaxshilar</p>
        </div>
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
      </div>

      {/* Income/expense chart */}
      {finance?.chart && finance.chart.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Sotuv o'sishi</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finance.chart} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} labelStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Kirim" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Chiqim" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        {/* Top customers */}
        <RankList
          title="Eng ko'p xarid qilgan mijozlar"
          icon={Trophy}
          items={topCustomers.map((c: any) => ({
            id: c.customer?.id,
            name: c.customer?.name ?? "—",
            sub: `${c.transactionCount} ta tranzaksiya`,
            value: formatCurrency(c.totalSpent),
            href: c.customer?.id ? `/customers/${c.customer.id}` : undefined,
          }))}
        />

        {/* Top drivers */}
        <RankList
          title="Eng yaxshi haydovchilar"
          icon={Truck}
          items={topDrivers.map((d: any) => ({
            id: d.driver?.id,
            name: d.driver?.name ?? "—",
            sub: `${d.bottlesSold} dona · ${d.workDays} kun`,
            value: formatCurrency(d.revenue),
            href: d.driver?.id ? `/drivers/${d.driver.id}` : undefined,
          }))}
        />
      </div>

      {/* Regions */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" /> Top hududlar (tushum)
          </h2>
          {regionPieData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={regionPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => e.name}>
                    {regionPieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-12">Ma'lumot yo'q</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Hudud bo'yicha buyurtmalar</h2>
          <div className="space-y-2">
            {topRegions.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-12">Ma'lumot yo'q</p>
            ) : topRegions.map((r: any, i: number) => (
              <div key={r.region} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900 dark:text-white truncate">{r.region}</span>
                    <span className="text-gray-500 text-xs">{r.orders} ta</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(r.orders / topRegions[0].orders) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RankList({
  title, icon: Icon, items,
}: {
  title: string; icon: any;
  items: { id?: string; name: string; sub: string; value: string; href?: string }[];
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-600" /> {title}
      </h2>
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">Ma'lumot yo'q</p>
        ) : items.map((item, i) => {
          const RankIcon = i < 3 ? RANK_ICONS[i] : null;
          const Wrapper = item.href ? Link : "div";
          return (
            <Wrapper
              key={item.id || i}
              {...(item.href ? { href: item.href } : {}) as any}
              className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="w-7 flex items-center justify-center flex-shrink-0">
                {RankIcon ? (
                  <RankIcon className={cn("w-5 h-5", RANK_COLORS[i])} />
                ) : (
                  <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.name}</p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm whitespace-nowrap">{item.value}</span>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
