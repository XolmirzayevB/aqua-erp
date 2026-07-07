"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, MapPin, Package, DollarSign,
  Truck, CheckCircle, XCircle, Clock, User,
  ChevronRight, Banknote, CreditCard, FileText, Navigation,
} from "lucide-react";
import { useOrder, useUpdateOrderStatus, useAssignDriver } from "@/hooks/use-orders";
import { AssignDriverModal } from "./assign-driver-modal";
import { StatusBadge } from "./status-badge";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { PAYMENT_TYPE_LABELS, ORDER_STATUS_LABELS, OrderStatus } from "@aqua/shared";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

// Which statuses can transition to which
const NEXT_ACTIONS: Record<string, { status: string; label: string; color: string; icon: any }[]> = {
  NEW:        [{ status: "PROCESSING", label: "Jarayonga olish", color: "bg-yellow-500 hover:bg-yellow-600", icon: Clock }],
  PROCESSING: [{ status: "DELIVERED", label: "Yetkazildi", color: "bg-green-600 hover:bg-green-700", icon: CheckCircle }],
  ASSIGNED:   [{ status: "DELIVERED", label: "Yetkazildi", color: "bg-green-600 hover:bg-green-700", icon: CheckCircle }],
  DELIVERED:  [],
  CANCELLED:  [],
};

const CANCEL_ALLOWED = ["NEW", "PROCESSING", "ASSIGNED"];

interface Props { id: string }

export function OrderDetail({ id }: Props) {
  const [showAssign, setShowAssign] = useState(false);
  const { canManageOrders, canDeliver, isDriver } = usePermissions();
  const { data: order, isLoading } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse max-w-4xl">
        <div className="h-8 w-40 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        <div className="h-56 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  if (!order) return <div className="text-gray-400 text-center py-20">Buyurtma topilmadi</div>;

  // Rolga ko'ra amallarni filtrlaymiz:
  // - "Yetkazildi" (DELIVERED) — faqat haydovchi/admin
  // - "Jarayonga olish" (PROCESSING) — operator/admin
  const nextActions = (NEXT_ACTIONS[order.status] || []).filter((a) =>
    a.status === "DELIVERED" ? canDeliver : canManageOrders
  );
  const canCancel = canManageOrders && CANCEL_ALLOWED.includes(order.status);
  const canAssign = canManageOrders && ["NEW", "PROCESSING", "ASSIGNED"].includes(order.status);

  const handleAction = async (status: string) => {
    await updateStatus.mutateAsync({ id, status });
  };

  const handleCancel = async () => {
    if (!confirm("Buyurtmani bekor qilmoqchimisiz?")) return;
    await updateStatus.mutateAsync({ id, status: "CANCELLED" });
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back + header (mobilda tugmalar pastki qatorga tushadi) */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/orders"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-none"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">#{order.seq}</h1>
            <StatusBadge status={order.status} size="md" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {formatDate(order.createdAt, "dd MMMM yyyy, HH:mm")} · {order.createdBy.name} · <span className="font-mono">{order.orderNumber}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {canAssign && (
            <button
              onClick={() => setShowAssign(true)}
              className="flex flex-1 sm:flex-initial items-center justify-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Truck className="w-4 h-4" />
              {order.driver ? "Haydovchi o'zgartirish" : "Haydovchi biriktirish"}
            </button>
          )}
          {nextActions.map((action) => (
            <button
              key={action.status}
              onClick={() => handleAction(action.status)}
              disabled={updateStatus.isPending}
              className={cn("flex flex-1 sm:flex-initial items-center justify-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition-colors shadow-sm", action.color)}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </button>
          ))}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={updateStatus.isPending}
              className="flex flex-1 sm:flex-initial items-center justify-center gap-2 px-3 py-2 border border-red-200 dark:border-red-900/50 text-red-500 text-sm font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Bekor
            </button>
          )}
        </div>
      </div>

      {/* Main grid — mobilda bitta ustun, md+ da 3 ustun */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Order info */}
        <div className="md:col-span-2 space-y-4">
          {/* Customer card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Mijoz</h3>
            {(() => {
              // Haydovchi /customers ga kira olmaydi — u uchun karta oddiy (link emas)
              const Wrap: any = isDriver ? "div" : Link;
              const wrapProps = isDriver ? {} : { href: `/customers/${order.customerId}` };
              return (
                <Wrap {...wrapProps} className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-sm flex-shrink-0">
                    {order.customer.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{order.customer.name}</p>
                      {order.customer.zone && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-semibold">Hudud {order.customer.zone}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone className="w-3 h-3" />{formatPhone(order.customer.phone)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />{order.customer.address}
                      </span>
                    </div>
                  </div>
                  {!isDriver && <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </Wrap>
              );
            })()}
            {/* Lokatsiya — haydovchi uchun navigatsiya */}
            {order.customer.locationLink && (
              <a href={order.customer.locationLink} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
                <Navigation className="w-4 h-4" />
                Lokatsiyani ochish (Google Maps)
              </a>
            )}
            {order.customer.balance !== undefined && Number(order.customer.balance) < 0 && (
              <div className="mt-3 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50">
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  Umumiy qarz: <span className="font-bold">{formatCurrency(Math.abs(Number(order.customer.balance)))}</span>
                </p>
              </div>
            )}
          </div>

          {/* Driver card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Haydovchi</h3>
            {order.driver ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-sm flex-shrink-0">
                  {order.driver.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{order.driver.name}</p>
                  {order.driver.phone && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Phone className="w-3 h-3" />{formatPhone(order.driver.phone)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <p className="text-sm">Haydovchi biriktirilmagan</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Izoh</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Right: summary */}
        <div className="space-y-4">
          {/* Financial summary */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Moliya</h3>
            <div className="space-y-2">
              {order.refillCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">To'ldirish (almashtirish)</span>
                  <span className="font-medium text-gray-900 dark:text-white">{order.refillCount} × {formatCurrency(order.refillPrice)}</span>
                </div>
              )}
              {order.newBottles > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Yangi tara</span>
                  <span className="font-medium text-gray-900 dark:text-white">{order.newBottles} × {formatCurrency(order.newBottlePrice)}</span>
                </div>
              )}
              <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Jami</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">To'lov turi</span>
                <span className={cn("font-medium", order.paymentType === "DEBT" ? "text-orange-600" : "text-green-600")}>
                  {PAYMENT_TYPE_LABELS[order.paymentType]}
                </span>
              </div>
              {order.bottlesReturned > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Qaytarilgan tara</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{order.bottlesReturned} ta</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Vaqt</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Yaratildi</span>
                <span className="text-gray-900 dark:text-white text-xs">{formatDate(order.createdAt, "dd.MM.yyyy HH:mm")}</span>
              </div>
              {order.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Yetkazildi</span>
                  <span className="text-green-600 dark:text-green-400 text-xs">{formatDate(order.deliveredAt, "dd.MM.yyyy HH:mm")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAssign && (
        <AssignDriverModal
          orderId={order.id}
          currentDriverId={order.driverId}
          onClose={() => setShowAssign(false)}
        />
      )}
    </div>
  );
}
