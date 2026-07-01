"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, Search, Filter, ChevronLeft, ChevronRight,
  Truck, MoreHorizontal, Eye, XCircle, CheckCircle,
  Phone, MapPin, Navigation,
} from "lucide-react";
import { useOrders, useCancelOrder, useUpdateOrderStatus } from "@/hooks/use-orders";
import { OrderForm } from "./order-form";
import { AssignDriverModal } from "./assign-driver-modal";
import { StatusBadge } from "./status-badge";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { PAYMENT_TYPE_LABELS } from "@aqua/shared";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

const STATUS_FILTERS = [
  { value: "", label: "Barchasi" },
  { value: "NEW", label: "Yangi" },
  { value: "PROCESSING", label: "Jarayonda" },
  { value: "ASSIGNED", label: "Biriktirilgan" },
  { value: "DELIVERED", label: "Yetkazildi" },
  { value: "CANCELLED", label: "Bekor" },
];

export function OrdersTable() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [assignDriverId, setAssignDriverId] = useState<string | undefined>(undefined);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const userRole = useAuthStore((s) => s.user?.role);
  const isDriver = userRole === "DRIVER";

  const { data, isLoading } = useOrders({
    search: debouncedSearch,
    status: status || undefined,
    page,
    limit: 20,
  });

  const cancelOrder = useCancelOrder();
  const updateStatus = useUpdateOrderStatus();

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const handleQuickDeliver = async (id: string) => {
    await updateStatus.mutateAsync({ id, status: "DELIVERED" });
    setOpenMenu(null);
  };

  const handleCancel = async (id: string, orderNumber: string) => {
    if (!confirm(`"${orderNumber}" buyurtmani bekor qilmoqchimisiz?`)) return;
    await cancelOrder.mutateAsync(id);
    setOpenMenu(null);
  };

  const orders = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Buyurtmalar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {meta ? `Jami: ${meta.total} ta buyurtma` : "Yuklanmoqda..."}
          </p>
        </div>
        {!isDriver && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-blue-200 dark:shadow-blue-900/30"
          >
            <Plus className="w-4 h-4" />
            Yangi buyurtma
          </button>
        )}
      </div>

      {/* Search + Status filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buyurtma #, mijoz nomi yoki telefon..."
            className="bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                status === f.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                {["#", "Mijoz", "Soni / Narx", "Summa", "To'lov", "Haydovchi", "Status", "Vaqt", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <p className="text-gray-400 dark:text-gray-500">Buyurtma topilmadi</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group"
                  >
                    {/* Order number */}
                    <td className="px-4 py-3">
                      <Link href={`/orders/${order.id}`} className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                        {order.orderNumber}
                      </Link>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <Link href={`/customers/${order.customerId}`} className="block hover:opacity-80 transition-opacity">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{order.customer.name}</p>
                          {order.customer.zone && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-semibold">{order.customer.zone}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400 font-mono">{formatPhone(order.customer.phone)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400 truncate max-w-[140px]">{order.customer.address}</span>
                        </div>
                      </Link>
                      {order.customer.locationLink && (
                        <a href={order.customer.locationLink} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 px-2 py-1 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                          <Navigation className="w-3 h-3" />
                          Lokatsiya
                        </a>
                      )}
                    </td>

                    {/* Qty — to'ldirish / yangi taqsimot */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{order.quantity} ta</p>
                      {order.refillCount > 0 && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">{order.refillCount} to'ldirish</p>
                      )}
                      {order.newBottles > 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400">{order.newBottles} yangi tara</p>
                      )}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </td>

                    {/* Payment */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        order.paymentType === "CASH" ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" :
                        order.paymentType === "CARD" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" :
                        "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
                      )}>
                        {PAYMENT_TYPE_LABELS[order.paymentType]}
                      </span>
                    </td>

                    {/* Driver */}
                    <td className="px-4 py-3">
                      {order.driver ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{order.driver.name}</p>
                      ) : (
                        <button
                          onClick={() => { setAssignOrderId(order.id); setAssignDriverId(undefined); }}
                          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Truck className="w-3 h-3" />
                          Biriktirish
                        </button>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(order.createdAt, "dd.MM HH:mm")}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {/* To'g'ridan-to'g'ri "Yetkazildi" (haydovchi uchun, telefonda ham ko'rinadi) */}
                        {order.status === "ASSIGNED" && (
                          <button
                            onClick={() => handleQuickDeliver(order.id)}
                            disabled={updateStatus.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Yetkazildi
                          </button>
                        )}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === order.id ? null : order.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {openMenu === order.id && (
                          <div className="absolute right-0 top-9 z-20 w-44 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
                            <Link
                              href={`/orders/${order.id}`}
                              onClick={() => setOpenMenu(null)}
                              className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ko'rish
                            </Link>
                            {order.status === "ASSIGNED" && (
                              <button
                                onClick={() => handleQuickDeliver(order.id)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Yetkazildi
                              </button>
                            )}
                            {["NEW", "PROCESSING", "ASSIGNED"].includes(order.status) && (
                              <button
                                onClick={() => { setAssignOrderId(order.id); setAssignDriverId(order.driverId); setOpenMenu(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                Haydovchi
                              </button>
                            )}
                            {["NEW", "PROCESSING", "ASSIGNED"].includes(order.status) && (
                              <button
                                onClick={() => handleCancel(order.id, order.orderNumber)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Bekor qilish
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} / {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(meta.totalPages, 7) }).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors",
                      page === p ? "bg-blue-600 text-white" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= meta.totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && <OrderForm onClose={() => setShowForm(false)} />}
      {assignOrderId && (
        <AssignDriverModal
          orderId={assignOrderId}
          currentDriverId={assignDriverId}
          onClose={() => setAssignOrderId(null)}
        />
      )}
    </div>
  );
}
