"use client";

import { useState } from "react";
import { Trophy, Truck, Crown, Medal, Award } from "lucide-react";
import Link from "next/link";
import {
  useTopCustomers, useTopDrivers, useTopRegions,
} from "@/hooks/use-reports";
import { useFinanceSummary } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  PageHeader, Avatar, Donut, SegmentTabs, cardClass,
} from "@/components/shared/page-ui";

const PERIODS = [
  { value: "weekly", label: "Hafta" },
  { value: "monthly", label: "Oy" },
  { value: "yearly", label: "Yil" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

const RANK_ICONS = [Crown, Medal, Award];
const RANK_COLORS = ["text-amber-500", "text-gray-400", "text-amber-700"];
const SEG_COLORS = ["#2563EB", "#0EA5E9", "#7C3AED", "#14B8A6", "#F59E0B", "#EF4444", "#DB2777", "#16A34A"];

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("monthly");
  const { data: topCustomers = [] } = useTopCustomers(period, 8);
  const { data: topDrivers = [] } = useTopDrivers(period, 8);
  const { data: topRegions = [] } = useTopRegions(period, 6);
  const { data: finance } = useFinanceSummary(period);

  const regionSegs = topRegions.map((r: any, i: number) => ({
    label: r.region,
    value: r.revenue,
    color: SEG_COLORS[i % SEG_COLORS.length],
  }));
  const regionTotal = regionSegs.reduce((s: number, x: any) => s + x.value, 0);
  const maxOrders = topRegions.length ? topRegions[0].orders : 0;

  return (
    <div>
      <PageHeader title="Tahlil" subtitle="Tushum dinamikasi va eng yaxshilar">
        <SegmentTabs
          options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
          value={period}
          onChange={setPeriod}
        />
      </PageHeader>

      {/* Tushum dinamikasi + hududlar donut */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 mb-4">
        <div className={cn(cardClass, "p-5")}>
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">Tushum dinamikasi</h2>
          <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-0.5 mb-3">Tushum va xarajat</p>
          {finance?.chart && finance.chart.length > 0 ? (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={finance.chart} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="anIncomeG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop offset="80%" stopColor="#2563EB" stopOpacity={0.02} />
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
                  <Area type="monotone" dataKey="income" name="Tushum" stroke="#2563EB" strokeWidth={2.5} fill="url(#anIncomeG)" />
                  <Area type="monotone" dataKey="expense" name="Xarajat" stroke="#EF4444" strokeWidth={2.5} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-sm text-gray-400">Ma'lumot yo'q</div>
          )}
        </div>

        {/* Hududlar bo'yicha tushum (donut) */}
        <div className={cn(cardClass, "p-5")}>
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">Hududlar bo'yicha tushum</h2>
          <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-0.5">Top {regionSegs.length} hudud</p>
          {regionSegs.length > 0 ? (
            <>
              <div className="flex items-center justify-center my-4">
                <Donut segments={regionSegs} size={160} thick={20}>
                  <span className="text-[11px] text-gray-400">Jami</span>
                  <span className="text-[16px] font-bold text-gray-900 dark:text-white tabular-nums px-3 text-center leading-tight">
                    {formatCurrency(regionTotal)}
                  </span>
                </Donut>
              </div>
              <div className="flex flex-col gap-2">
                {regionSegs.map((s: any) => (
                  <div key={s.label} className="flex items-center gap-2.5">
                    <span className="w-[9px] h-[9px] rounded-[3px] flex-none" style={{ background: s.color }} />
                    <span className="flex-1 text-[13px] text-gray-500 dark:text-gray-400 truncate">{s.label}</span>
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white tabular-nums">
                      {regionTotal > 0 ? Math.round((s.value / regionTotal) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-400 text-sm py-12">Ma'lumot yo'q</p>
          )}
        </div>
      </div>

      {/* Hududlar bo'yicha buyurtmalar (gorizontal barlar) */}
      <div className={cn(cardClass, "p-5 mb-4")}>
        <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight mb-4">
          Hududlar bo'yicha buyurtmalar
        </h2>
        {topRegions.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Ma'lumot yo'q</p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {topRegions.map((r: any) => (
              <div key={r.region} className="flex items-center gap-3.5">
                <span className="w-24 md:w-28 flex-none text-[13px] font-medium text-gray-900 dark:text-white truncate">
                  {r.region}
                </span>
                <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-[7px] overflow-hidden">
                  <div
                    className="h-full rounded-[7px] bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-700"
                    style={{ width: `${maxOrders ? (r.orders / maxOrders) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-24 md:w-32 flex-none text-right text-[13px] font-bold text-gray-900 dark:text-white tabular-nums">
                  {r.orders} ta · {formatCurrency(r.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top mijozlar va haydovchilar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
    <div className={cn(cardClass, "p-5")}>
      <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" /> {title}
      </h2>
      <div className="flex flex-col divide-y divide-gray-300 dark:divide-gray-700">
        {items.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">Ma'lumot yo'q</p>
        ) : items.map((item, i) => {
          const RankIcon = i < 3 ? RANK_ICONS[i] : null;
          const Wrapper: any = item.href ? Link : "div";
          return (
            <Wrapper
              key={item.id || i}
              {...(item.href ? { href: item.href } : {})}
              className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="w-6 flex items-center justify-center flex-none">
                {RankIcon ? (
                  <RankIcon className={cn("w-[18px] h-[18px]", RANK_COLORS[i])} />
                ) : (
                  <span className="text-xs font-bold text-gray-400 tabular-nums">{i + 1}</span>
                )}
              </div>
              <Avatar name={item.name} size={34} />
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-px">{item.sub}</p>
              </div>
              <span className="text-[13px] font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                {item.value}
              </span>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
