"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, Search, ChevronLeft, ChevronRight,
  Truck, MoreHorizontal, Eye, XCircle, CheckCircle, Navigation,
} from "lucide-react";
import { useOrders, useCancelOrder, useUpdateOrderStatus } from "@/hooks/use-orders";
import { OrderForm } from "./order-form";
import { AssignDriverModal } from "./assign-driver-modal";
import { StatusBadge } from "./status-badge";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { PAYMENT_TYPE_LABELS } from "@aqua/shared";
import { cn } from "@/lib/utils";
import {
  PageHeader, Avatar, Pill, SegmentTabs, btnPrimary, thClass, cardClass, rowBtnClass,
} from "@/components/shared/page-ui";
import type { Tone } from "@/components/shared/page-ui";
import { usePermissions } from "@/hooks/use-permissions";

const STATUS_FILTERS = [
  { value: "", label: "Barchasi" },
  { value: "NEW", label: "Yangi" },
  { value: "PROCESSING", label: "Jarayonda" },
  { value: "ASSIGNED", label: "Biriktirilgan" },
  { value: "DELIVERED", label: "Yetkazildi" },
  { value: "CANCELLED", label: "Bekor" },
];

// To'lov turi → pill toni (dizayn: To'langan=green, Qarz=red, boshqa=amber)
const PAYMENT_TONES: Record<string, Tone> = {
  CASH: "success",
  CARD: "primary",
  CLICK: "primary",
  DEBT: "danger",
  PARTIAL: "warning",
};

export function OrdersTable() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [assignDriverId, setAssignDriverId] = useState<string | undefined>(undefined);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { isDriver, canCreateOrder, canDeliver } = usePermissions();

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

  const handleCancel = async (id: string, seq: number) => {
    if (!confirm(`#${seq} buyurtmani bekor qilmoqchimisiz?`)) return;
    await cancelOrder.mutateAsync(id);
    setOpenMenu(null);
  };

  const orders = data?.data || [];
  const meta = data?.meta;

  // Sahifalash — mobil kartalar va jadval ostida bir xil ishlatiladi
  const pagination = meta && meta.totalPages > 1 ? (
    <div className="px-5 py-3 border-t border-gray-400/70 dark:border-gray-600 flex items-center justify-between">
      <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} / {meta.total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                "w-8 h-8 flex items-center justify-center rounded-[9px] text-xs font-semibold transition-colors tabular-nums",
                page === p
                  ? "bg-blue-600 text-white"
                  : "border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= meta.totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div>
      <PageHeader
        title="Buyurtmalar"
        subtitle={meta ? `${meta.total} ta buyurtma${status ? ` · ${STATUS_FILTERS.find((f) => f.value === status)?.label}` : ""}` : "Yuklanmoqda..."}
      >
        {/* Zakazni faqat operator (yoki admin) yozadi */}
        {canCreateOrder && (
          <button onClick={() => setShowForm(true)} className={btnPrimary}>
            <Plus className="w-4 h-4 flex-none" />
            Yangi buyurtma
          </button>
        )}
      </PageHeader>

      {/* Qidiruv + status tablar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2.5 h-10 px-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[11px] flex-1 min-w-[200px] max-w-sm focus-within:border-blue-300 dark:focus-within:border-blue-700 transition-colors">
          <Search className="w-4 h-4 text-gray-400 flex-none" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="№ raqam, mijoz yoki telefon..."
            className="bg-transparent text-[13.5px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none w-full"
          />
        </div>
        <SegmentTabs
          options={STATUS_FILTERS.map((f) => ({
            value: f.value,
            label: f.label,
            count: status === f.value ? meta?.total : undefined,
          }))}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
        />
      </div>

      {/* MOBIL: har buyurtma ALOHIDA karta — oralarida bo'shliq, aniq ajralib turadi */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn(cardClass, "p-4")}>
                <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-2" />
                <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </>
        ) : orders.length === 0 ? (
          <p className={cn(cardClass, "px-5 py-12 text-center text-gray-400 dark:text-gray-500")}>Buyurtma topilmadi</p>
        ) : (
          <>
            {orders.map((order) => (
              <div key={order.id} className={cn(cardClass, "p-4 border-gray-200 dark:border-gray-700 shadow-card")}>
                {/* 1-qator: raqam + holat */}
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-mono text-[15px] font-bold text-blue-600 dark:text-blue-400 tabular-nums"
                  >
                    #{order.seq}
                  </Link>
                  <StatusBadge status={order.status} />
                </div>

                {/* 2-qator: mijoz + hudud, telefon + vaqt */}
                <Link
                  href={isDriver ? `/orders/${order.id}` : `/customers/${order.customerId}`}
                  className="block mt-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-gray-900 dark:text-white truncate">
                      {order.customer.name}
                    </span>
                    {order.customer.zone && (
                      <Pill tone="primary" className="!text-[11px] !py-0.5">{order.customer.zone}</Pill>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
                      {formatPhone(order.customer.phone)}
                    </span>
                    <span className="text-[11.5px] text-gray-400 dark:text-gray-500">
                      {formatDate(order.createdAt, "dd.MM HH:mm")}
                    </span>
                  </div>
                </Link>

                {/* 3-qator: tara/summa + asosiy tugma */}
                <div className="flex items-center justify-between gap-2 mt-2.5">
                  <div className="text-[13px] text-gray-700 dark:text-gray-300">
                    <span className="font-semibold tabular-nums">{order.quantity} ta</span>
                    <span className="text-gray-300 dark:text-gray-600"> · </span>
                    <span className="font-bold tabular-nums">{formatCurrency(order.totalAmount)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {order.customer.locationLink && (
                      <a
                        href={order.customer.locationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-[9px] border border-gray-100 dark:border-gray-800 text-green-600 dark:text-green-400"
                      >
                        <Navigation className="w-4 h-4" />
                      </a>
                    )}
                    {order.status === "ASSIGNED" && canDeliver && (
                      <button
                        onClick={() => handleQuickDeliver(order.id)}
                        disabled={updateStatus.isPending}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Yetkazildi
                      </button>
                    )}
                    {!isDriver && !order.driver && ["NEW", "PROCESSING"].includes(order.status) && (
                      <button
                        onClick={() => { setAssignOrderId(order.id); setAssignDriverId(undefined); }}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold transition-colors"
                      >
                        <Truck className="w-4 h-4" />
                        Biriktirish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        {pagination && <div className={cn(cardClass, "overflow-hidden [&>div]:border-t-0")}>{pagination}</div>}
      </div>

      {/* Jadval (planshet/kompyuter) */}
      <div className={cn(cardClass, "overflow-hidden hidden md:block")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr>
                <th className={cn(thClass, "pl-5")}>Buyurtma</th>
                <th className={thClass}>Mijoz</th>
                <th className={cn(thClass, "text-center")}>Tara</th>
                <th className={cn(thClass, "text-right")}>Summa</th>
                <th className={thClass}>To'lov</th>
                <th className={thClass}>Holat</th>
                <th className={thClass}>Haydovchi</th>
                <th className={cn(thClass, "pr-5")}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-400/70 dark:border-gray-600">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <p className="text-gray-400 dark:text-gray-500">Buyurtma topilmadi</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Buyurtma: oddiy sanoq raqam + vaqt */}
                    <td className="px-4 pl-5 py-3 whitespace-nowrap">
                      <Link
                        href={`/orders/${order.id}`}
                        title={order.orderNumber}
                        className="font-mono text-[14px] font-bold text-blue-600 dark:text-blue-400 hover:underline tabular-nums"
                      >
                        #{order.seq}
                      </Link>
                      <div className="text-[11.5px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatDate(order.createdAt, "dd.MM HH:mm")}
                      </div>
                    </td>

                    {/* Mijoz — haydovchi /customers ga kira olmaydi, shuning uchun
                        haydovchida buyurtma tafsilotiga (mijoz ma'lumoti u yerda) yo'naltiramiz */}
                    <td className="px-4 py-3">
                      <Link href={isDriver ? `/orders/${order.id}` : `/customers/${order.customerId}`} className="block hover:opacity-80 transition-opacity">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-gray-900 dark:text-white whitespace-nowrap max-w-[150px] truncate">
                            {order.customer.name}
                          </span>
                          {order.customer.zone && (
                            <Pill tone="primary" className="!text-[11px] !py-0.5">{order.customer.zone}</Pill>
                          )}
                        </div>
                        <div className="font-mono text-xs text-gray-400 dark:text-gray-500 mt-0.5 whitespace-nowrap">
                          {formatPhone(order.customer.phone)}
                        </div>
                      </Link>
                      {order.customer.locationLink && (
                        <a
                          href={order.customer.locationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-green-600 dark:text-green-400 hover:underline"
                        >
                          <Navigation className="w-3 h-3" />
                          Lokatsiya
                        </a>
                      )}
                    </td>

                    {/* Tara: soni + taqsimot */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="text-[13.5px] font-semibold text-gray-900 dark:text-white tabular-nums">
                        {order.quantity}
                      </span>
                      {(order.refillCount > 0 || order.newBottles > 0) && (
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {order.refillCount > 0 && <span className="text-blue-600 dark:text-blue-400">{order.refillCount} to'ldirish</span>}
                          {order.refillCount > 0 && order.newBottles > 0 && " · "}
                          {order.newBottles > 0 && <span className="text-green-600 dark:text-green-400">{order.newBottles} yangi</span>}
                        </div>
                      )}
                    </td>

                    {/* Summa */}
                    <td className="px-4 py-3 text-right text-[13.5px] font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                      {formatCurrency(order.totalAmount)}
                    </td>

                    {/* To'lov */}
                    <td className="px-4 py-3">
                      <Pill tone={PAYMENT_TONES[order.paymentType] || "muted"}>
                        {PAYMENT_TYPE_LABELS[order.paymentType]}
                      </Pill>
                    </td>

                    {/* Holat */}
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Haydovchi */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {order.driver ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={order.driver.name} size={26} />
                          <span className="text-[12.5px] text-gray-500 dark:text-gray-400">{order.driver.name}</span>
                        </div>
                      ) : !isDriver && ["NEW", "PROCESSING"].includes(order.status) ? (
                        <button
                          onClick={() => { setAssignOrderId(order.id); setAssignDriverId(undefined); }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Biriktirish
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Amallar */}
                    <td className="px-4 pr-5 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {/* "Yetkazildi"ni faqat haydovchi (yoki admin) bosadi */}
                        {order.status === "ASSIGNED" && canDeliver && (
                          <button
                            onClick={() => handleQuickDeliver(order.id)}
                            disabled={updateStatus.isPending}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-[9px] bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-60"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Yetkazildi
                          </button>
                        )}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === order.id ? null : order.id)}
                            className={rowBtnClass}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenu === order.id && (
                            <div className="absolute right-0 top-9 z-20 w-44 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-card-hover overflow-hidden">
                              <Link
                                href={`/orders/${order.id}`}
                                onClick={() => setOpenMenu(null)}
                                className="flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Ko'rish
                              </Link>
                              {order.status === "ASSIGNED" && canDeliver && (
                                <button
                                  onClick={() => handleQuickDeliver(order.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Yetkazildi
                                </button>
                              )}
                              {/* Haydovchi/tayinlash/bekor — operator/admin ishi (haydovchi emas) */}
                              {!isDriver && ["NEW", "PROCESSING", "ASSIGNED"].includes(order.status) && (
                                <button
                                  onClick={() => { setAssignOrderId(order.id); setAssignDriverId(order.driverId); setOpenMenu(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  Haydovchi
                                </button>
                              )}
                              {!isDriver && ["NEW", "PROCESSING", "ASSIGNED"].includes(order.status) && (
                                <button
                                  onClick={() => handleCancel(order.id, order.seq)}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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

        {pagination}
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
