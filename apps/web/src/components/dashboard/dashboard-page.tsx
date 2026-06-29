"use client";

import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, ShoppingCart, CheckCircle, XCircle,
  AlertCircle, Package, DollarSign, Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OrderStatus, PAYMENT_TYPE_LABELS } from "@aqua/shared";

function StatCard({
  title, value, icon: Icon, color, description,
}: {
  title: string; value: string | number; icon: any; color: string; description?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  NEW: { label: "Yangi", class: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
  PROCESSING: { label: "Jarayonda", class: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400" },
  ASSIGNED: { label: "Biriktirilgan", class: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400" },
  DELIVERED: { label: "Yetkazildi", class: "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400" },
  CANCELLED: { label: "Bekor", class: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400" },
};

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/dashboard/stats").then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  const stats = [
    {
      title: "Bugungi tushum",
      value: data ? formatCurrency(data.todayIncome || 0) : "—",
      icon: DollarSign,
      color: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
      description: "Naqd + karta",
    },
    {
      title: "Oylik tushum",
      value: data ? formatCurrency(data.monthIncome || 0) : "—",
      icon: TrendingUp,
      color: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
      description: formatDate(new Date(), "MMMM yyyy"),
    },
    {
      title: "Bugungi buyurtmalar",
      value: data?.todayOrders ?? "—",
      icon: ShoppingCart,
      color: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400",
      description: "Jami",
    },
    {
      title: "Yetkazildi",
      value: data?.deliveredToday ?? "—",
      icon: CheckCircle,
      color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
      description: "Bugun",
    },
    {
      title: "Bekor qilindi",
      value: data?.cancelledToday ?? "—",
      icon: XCircle,
      color: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
      description: "Bugun",
    },
    {
      title: "Qarzdor mijozlar",
      value: data?.debtorCount ?? "—",
      icon: AlertCircle,
      color: "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400",
      description: data ? formatCurrency(data.totalDebt || 0) : "",
    },
    {
      title: "Bo'sh taralar",
      value: data?.emptyBottles ?? "—",
      icon: Package,
      color: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400",
      description: "Omborida",
    },
    {
      title: "Jami mijozlar",
      value: data?.totalCustomers ?? "—",
      icon: Users,
      color: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
      description: "Faol",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatDate(new Date(), "dd MMMM yyyy, EEEE")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">So'nggi buyurtmalar</h2>
          <a href="/orders" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            Barchasini ko'rish →
          </a>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["#", "Mijoz", "Soni", "Summa", "To'lov", "Status", "Sana"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.recentOrders || []).map((order: any, i: number) => (
                  <tr key={order.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{order.orderNumber}</td>
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{order.customer?.name}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{order.quantity} ta</td>
                    <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {PAYMENT_TYPE_LABELS[order.paymentType as keyof typeof PAYMENT_TYPE_LABELS]}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[order.status]?.class}`}>
                        {STATUS_BADGE[order.status]?.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {formatDate(order.createdAt, "dd.MM HH:mm")}
                    </td>
                  </tr>
                ))}
                {!data?.recentOrders?.length && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">
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
