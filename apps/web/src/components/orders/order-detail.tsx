"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, MapPin, Package, DollarSign,
  Truck, CheckCircle, XCircle, Clock, User,
  ChevronRight, Banknote, CreditCard, FileText, Navigation, PencilLine,
} from "lucide-react";
import { useOrder, useUpdateOrderStatus, useAssignDriver, useConfirmCardPayment, isCardPending, cardTimeLeftLabel } from "@/hooks/use-orders";
import { AssignDriverModal } from "./assign-driver-modal";
import { DeliverModal } from "./deliver-modal";
import { AdjustOrderModal } from "./adjust-order-modal";
import { PaymentModal } from "@/components/customers/payment-modal";
import { StatusBadge } from "./status-badge";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { directionsUrl } from "@/lib/nav";
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
  const [showPayment, setShowPayment] = useState(false);
  // "Yetkazildi" → to'lov turini tanlash modali
  const [showDeliver, setShowDeliver] = useState(false);
  // Yopilgan zakazni tahrirlash (24h ichida, operator/admin)
  const [showAdjust, setShowAdjust] = useState(false);
  const { canManageOrders, canDeliver, canCollectDebt, isDriver } = usePermissions();
  const { data: order, isLoading } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const confirmCard = useConfirmCardPayment();
  const router = useRouter();

  // Qayerdan kelgan bo'lsa — orqaga o'sha yerga qaytamiz (?from=route → marshrut)
  const [backHref, setBackHref] = useState("/orders");
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("from") === "route") {
      setBackHref("/route");
    }
  }, []);

  // Orqaga: history bo'lsa router.back() — yangi yozuv QO'SHMAYDI (aks holda
  // ro'yxat↔tafsilot orasida stack o'sib boradi); to'g'ridan kirilgan bo'lsa href.
  const goBack = (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };

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
  // Yopilgan zakazni tahrirlash: operator/admin, yetkazilganidan 24 soat ichida
  const canAdjust =
    canManageOrders &&
    order.status === "DELIVERED" &&
    !!order.deliveredAt &&
    Date.now() - new Date(order.deliveredAt).getTime() <= 24 * 3600 * 1000;

  const handleAction = async (status: string) => {
    // "Yetkazildi" — avval to'lov turi so'raladi (modal)
    if (status === "DELIVERED") {
      setShowDeliver(true);
      return;
    }
    await updateStatus.mutateAsync({ id, status });
  };

  const handleCancel = async () => {
    if (!confirm("Buyurtmani bekor qilmoqchimisiz?")) return;
    await updateStatus.mutateAsync({ id, status: "CANCELLED" });
  };

  // Klik tasdiqlash — operator Click hisobida pulni KO'RIB bosadi
  const handleConfirmCard = async () => {
    if (!confirm(
      `#${order.seq} — ${order.customer.name}\n${formatCurrency(order.totalAmount)} Klik (Click) hisobingizga KELGANINI tasdiqlaysizmi?\n\nTasdiqlagach bu pul moliyaga kirim bo'lib yoziladi.`
    )) return;
    await confirmCard.mutateAsync(id);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back + header (mobilda tugmalar pastki qatorga tushadi) */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          onClick={goBack}
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
          {/* Yopilgan zakazni tuzatish — mijoz yetkazishda sonini o'zgartirsa */}
          {canAdjust && (
            <button
              onClick={() => setShowAdjust(true)}
              className="flex flex-1 sm:flex-initial items-center justify-center gap-2 px-3 py-2 border border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 text-sm font-medium rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
            >
              <PencilLine className="w-4 h-4" />
              Tahrirlash
            </button>
          )}
        </div>
      </div>

      {/* 💳 KLIK TASDIQLANMAGAN — muddat bilan ogohlantirish + tasdiqlash tugmasi */}
      {isCardPending(order) && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-sky-50 dark:bg-sky-500/10 border-2 border-sky-200 dark:border-sky-500/30">
          <CreditCard className="w-5 h-5 text-sky-600 dark:text-sky-400 flex-none" />
          <div className="flex-1 min-w-[180px]">
            <p className="text-[13.5px] font-bold text-sky-700 dark:text-sky-400">
              Klik to'lovi hali tasdiqlanmagan · {cardTimeLeftLabel(order.deliveredAt)}
            </p>
            <p className="text-[12.5px] text-sky-600/80 dark:text-sky-400/70 mt-0.5">
              Click hisobida {formatCurrency(order.totalAmount)} kelganini ko'rib tasdiqlang — 2 kunda tasdiqlanmasa zakaz nasiyaga o'tadi
            </p>
          </div>
          {canManageOrders && (
            <button
              onClick={handleConfirmCard}
              disabled={confirmCard.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Klik tasdiqlash
            </button>
          )}
        </div>
      )}

      {/* ✓ Klik tasdiqlangan belgisi */}
      {order.paymentType === "CARD" && order.cardConfirmedAt && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
          <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400 flex-none" />
          <p className="text-[13px] font-medium text-green-700 dark:text-green-400">
            Klik to'lovi TASDIQLANGAN · {formatDate(order.cardConfirmedAt, "dd.MM HH:mm")} — kirim moliyaga yozilgan
          </p>
        </div>
      )}

      {/* Tahrirlangan belgisi — kim va qachon tuzatgani ko'rinib turadi */}
      {order.editedAt && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
          <PencilLine className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-none" />
          <p className="text-[13px] font-medium text-amber-700 dark:text-amber-400">
            Bu zakaz yopilgandan keyin TAHRIRLANGAN
            {order.editedBy?.name ? ` — ${order.editedBy.name}` : ""} · {formatDate(order.editedAt, "dd.MM HH:mm")}
          </p>
        </div>
      )}

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
                    {/* Tanlangan yetkazish joyi (Apteka, Uy...) — asosiy manzildan FARQLI */}
                    {order.location && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-[12px] font-semibold text-amber-700 dark:text-amber-400">
                        <MapPin className="w-3.5 h-3.5" />
                        Yetkazish joyi: {order.location.label}
                        {order.location.address ? ` — ${order.location.address}` : ""}
                      </span>
                    )}
                  </div>
                  {!isDriver && <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </Wrap>
              );
            })()}
            {/* Lokatsiya — haydovchi uchun navigatsiya (Google Maps ILOVASIDA ochiladi).
                Tanlangan lokatsiya (Apteka...) bo'lsa O'SHA joyga yo'naltiradi. */}
            {(() => {
              const nav = order.location
                ? directionsUrl(order.location.lat, order.location.lng, order.location.locationLink)
                : directionsUrl(order.customer.lat, order.customer.lng, order.customer.locationLink);
              return nav ? (
                <a href={nav} target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
                  <Navigation className="w-4 h-4" />
                  Yo'l ko'rsatish (Google Maps)
                </a>
              ) : null;
            })()}
            {order.customer.balance !== undefined && Number(order.customer.balance) < 0 && (
              <div className="mt-3 flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50">
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  Umumiy qarz: <span className="font-bold">{formatCurrency(Math.abs(Number(order.customer.balance)))}</span>
                </p>
                {/* Haydovchi/operator yetkazganда qarzni shu yerdan qabul qiladi */}
                {canCollectDebt && (
                  <button
                    onClick={() => setShowPayment(true)}
                    className="flex-none inline-flex items-center gap-1.5 h-8 px-3 rounded-[9px] bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold transition-colors"
                  >
                    <Banknote className="w-4 h-4" />
                    Qarz to'lovi
                  </button>
                )}
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
                {order.paymentType ? (
                  <span className={cn("font-medium", order.paymentType === "DEBT" ? "text-orange-600" : "text-green-600")}>
                    {PAYMENT_TYPE_LABELS[order.paymentType]}
                  </span>
                ) : (
                  <span className="font-medium text-gray-400">Yetkazilganda tanlanadi</span>
                )}
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
      {showPayment && (
        <PaymentModal
          customerId={order.customerId}
          customerName={order.customer.name}
          currentBalance={Number(order.customer.balance ?? 0)}
          onClose={() => setShowPayment(false)}
        />
      )}
      {/* Yetkazildi → to'lov turini tanlash (naqd/karta/nasiya) */}
      {showDeliver && (
        <DeliverModal order={order} onClose={() => setShowDeliver(false)} />
      )}
      {/* Yopilgan zakazni tahrirlash (24h ichida) */}
      {showAdjust && (
        <AdjustOrderModal order={order} onClose={() => setShowAdjust(false)} />
      )}
    </div>
  );
}
