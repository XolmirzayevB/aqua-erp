"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, Search, ChevronLeft, ChevronRight,
  Truck, MoreHorizontal, Eye, XCircle, CheckCircle, Navigation,
  CalendarDays, X, MapPin, Clock, PencilLine, Wallet, CreditCard,
} from "lucide-react";
import { useOrders, useCancelOrder, useConfirmCardPayment, isCardPending, cardTimeLeftLabel, Order } from "@/hooks/use-orders";
import { useSettings } from "@/hooks/use-settings";
import { OrderForm } from "./order-form";
import { AssignDriverModal } from "./assign-driver-modal";
import { DeliverModal } from "./deliver-modal";
import { AdjustOrderModal } from "./adjust-order-modal";
import { DriverExpenseModal } from "@/components/finance/driver-expense-modal";
import { StatusBadge } from "./status-badge";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { PAYMENT_TYPE_LABELS } from "@aqua/shared";
import { cn } from "@/lib/utils";
import {
  PageHeader, Avatar, Pill, SegmentTabs, btnPrimary, thClass, cardClass, rowBtnClass,
} from "@/components/shared/page-ui";
import type { Tone } from "@/components/shared/page-ui";
import { usePermissions } from "@/hooks/use-permissions";

// 2026-07-20 (egasi so'rovi): tablar soddalashtirildi — alohida Yangi/Jarayonda/
// Biriktirilgan o'rniga bitta "Yo'lda" (barcha ochiqlar) va "Haydovchi yuklash"
// (haydovchi hali biriktirilmagan ochiqlar — operator kimga berishni ko'radi).
const STATUS_FILTERS = [
  { value: "", label: "Barchasi" },
  { value: "OPEN", label: "Yo'lda" },
  { value: "DELIVERED", label: "Yetkazildi" },
  { value: "UNASSIGNED", label: "Haydovchi yuklash" },
  { value: "CANCELLED", label: "Bekor" },
];

// Haydovchi uchun soddalashtirilgan tablar: birinchi — unga biriktirilganlar.
// Yangi/Jarayonda unga tegishli emas (bunday zakazlar hali haydovchisiz).
const DRIVER_FILTERS = [
  { value: "ASSIGNED", label: "Biriktirilgan" },
  { value: "DELIVERED", label: "Yetkazildi" },
  { value: "", label: "Barchasi" },
];

// To'lov turi → pill toni (dizayn: To'langan=green, Qarz=red, boshqa=amber)
const PAYMENT_TONES: Record<string, Tone> = {
  CASH: "success",
  CARD: "primary",
  CLICK: "primary",
  DEBT: "danger",
  PARTIAL: "warning",
  FREE: "violet", // imtiyozli/bepul zakaz
};

// Zakazni tahrirlash mumkinmi: OCHIQ zakaz — istalgan payt (yetkazishdan
// oldin, 2026-07-20); YOPILGAN — yetkazilganidan 24 soat ichida.
function withinEditWindow(o: Order): boolean {
  if (["NEW", "PROCESSING", "ASSIGNED"].includes(o.status)) return true;
  return (
    o.status === "DELIVERED" &&
    !!o.deliveredAt &&
    Date.now() - new Date(o.deliveredAt).getTime() <= 24 * 3600 * 1000
  );
}

// Qolib ketgan zakaz qancha kechikkani: "2 kun 5 soat" / "7 soat"
function lateLabel(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days} kun${hours > 0 ? ` ${hours} soat` : ""}`;
  return `${Math.max(1, hours)} soat`;
}

export function OrdersTable() {
  const { isDriver, canCreateOrder, canDeliver, canManageOrders } = usePermissions();
  const filters = isDriver ? DRIVER_FILTERS : STATUS_FILTERS;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Haydovchi sahifani ochganda darrov O'ZIGA BIRIKTIRILGANLARNI ko'radi
  const [status, setStatus] = useState(isDriver ? "ASSIGNED" : "");
  // Kun tanlash — tanlansa faqat o'sha kuni YOZILGAN buyurtmalar ko'rinadi
  const [day, setDay] = useState("");
  // Hudud filtri — mijozlar sahifasidagidek chiplar
  const [zone, setZone] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [assignDriverId, setAssignDriverId] = useState<string | undefined>(undefined);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  // "Yetkazildi" → to'lov turini so'raydigan modal (admin uchun ham)
  const [deliverOrder, setDeliverOrder] = useState<Order | null>(null);
  // Yopilgan zakazni tahrirlash (24h ichida, operator/admin)
  const [adjustOrder, setAdjustOrder] = useState<Order | null>(null);
  // Xarajat kiritish — operator ham (haydovchi aytib turadi, operator yozadi)
  const [showExpense, setShowExpense] = useState(false);

  const { data: settings } = useSettings();
  const zones = settings?.zones || [];

  // "QOLIB KETGAN" — maxsus rejim: avvalgi kunlardan ochiq qolgan zakazlar,
  // eng ko'p kechikkani birinchi (backend overdue filtri)
  const isOverdueView = status === "OVERDUE";
  // "KLIK TASDIQLASH" — maxsus rejim: yetkazilgan, Karta (Click), tasdiqlanmagan.
  // Muddati (12h) tugashiga oz qolgani birinchi turadi.
  const isCardPendingView = status === "CARD_PENDING";
  const specialView = isOverdueView || isCardPendingView;
  // "Yo'lda" / "Haydovchi yuklash" — status emas, alohida backend filtrlari
  const isOpenView = status === "OPEN";
  const isUnassignedView = status === "UNASSIGNED";

  const { data, isLoading } = useOrders({
    search: debouncedSearch,
    status: specialView || isOpenView || isUnassignedView ? undefined : status || undefined,
    overdue: isOverdueView || undefined,
    cardPending: isCardPendingView || undefined,
    open: isOpenView || undefined,
    unassigned: isUnassignedView || undefined,
    zone: zone || undefined,
    dateFrom: !specialView && day ? day : undefined,
    dateTo: !specialView && day ? day : undefined,
    page,
    limit: 20,
  });

  // Banner/tab uchun doimiy hisob — nechta zakaz qolib ketgan
  const { data: overdueMeta } = useOrders({ overdue: true, limit: 1 });
  const overdueCount = overdueMeta?.meta?.total ?? 0;
  // Klik tasdiqlanmaganlar soni — tab/banner uchun (haydovchiga kerak emas)
  const { data: cardPendingMeta } = useOrders({ cardPending: true, limit: 1 });
  const cardPendingCount = cardPendingMeta?.meta?.total ?? 0;

  const cancelOrder = useCancelOrder();
  const confirmCard = useConfirmCardPayment();

  // Klik tasdiqlash — pul Click hisobiga kelganini operator KO'RIB bosadi
  const handleConfirmCard = async (order: Order) => {
    if (!confirm(
      `#${order.seq} — ${order.customer.name}\n${formatCurrency(order.totalAmount)} Klik (Click) hisobingizga KELGANINI tasdiqlaysizmi?\n\nTasdiqlagach bu pul moliyaga kirim bo'lib yoziladi.`
    )) return;
    await confirmCard.mutateAsync(order.id);
    setOpenMenu(null);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const handleQuickDeliver = (order: Order) => {
    setDeliverOrder(order);
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
        subtitle={meta ? `${meta.total} ta buyurtma${status ? ` · ${isOverdueView ? "Qolib ketgan" : isCardPendingView ? "Klik tasdiqlash kutilmoqda" : filters.find((f) => f.value === status)?.label}` : ""}` : "Yuklanmoqda..."}
      >
        {/* Xarajat — operator/admin (haydovchi o'z panelida kiritadi) */}
        {canCreateOrder && (
          <button onClick={() => setShowExpense(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[11px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[13.5px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            <Wallet className="w-4 h-4 flex-none" />
            Xarajat
          </button>
        )}
        {/* Zakazni faqat operator (yoki admin) yozadi */}
        {canCreateOrder && (
          <button onClick={() => setShowForm(true)} className={btnPrimary}>
            <Plus className="w-4 h-4 flex-none" />
            Yangi buyurtma
          </button>
        )}
      </PageHeader>

      {/* ⏰ QOLIB KETGAN zakazlar banneri — bor bo'lsa doim ko'rinib turadi */}
      {!isDriver && overdueCount > 0 && !isOverdueView && (
        <button
          onClick={() => { setStatus("OVERDUE"); setDay(""); setPage(1); }}
          className="w-full flex items-center gap-3 px-4 py-3 mb-3 rounded-2xl border-2 border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-left hover:border-red-300 dark:hover:border-red-800 transition-colors"
        >
          <span className="w-9 h-9 rounded-[11px] bg-red-100 dark:bg-red-500/15 flex items-center justify-center flex-none">
            <Clock className="w-[18px] h-[18px] text-red-600 dark:text-red-400" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-bold text-red-700 dark:text-red-400">
              {overdueCount} ta zakaz avvalgi kunlardan qolib ketgan
            </span>
            <span className="block text-[12.5px] text-red-500/80 dark:text-red-400/70 mt-0.5">
              Bosib ko'ring — eng ko'p kechikkani birinchi turadi
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-red-400 flex-none" />
        </button>
      )}

      {/* 💳 KLIK TASDIQLASH banneri — tasdiqlanmagan Klik zakazlari bor bo'lsa.
          12 soat ichida tasdiqlanmasa avto-nasiyaga o'tadi — operator unutmasin. */}
      {!isDriver && cardPendingCount > 0 && !isCardPendingView && (
        <button
          onClick={() => { setStatus("CARD_PENDING"); setDay(""); setPage(1); }}
          className="w-full flex items-center gap-3 px-4 py-3 mb-3 rounded-2xl border-2 border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/30 text-left hover:border-sky-300 dark:hover:border-sky-800 transition-colors"
        >
          <span className="w-9 h-9 rounded-[11px] bg-sky-100 dark:bg-sky-500/15 flex items-center justify-center flex-none">
            <CreditCard className="w-[18px] h-[18px] text-sky-600 dark:text-sky-400" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-bold text-sky-700 dark:text-sky-400">
              {cardPendingCount} ta zakazning Klik to'lovi tasdiqlanmagan
            </span>
            <span className="block text-[12.5px] text-sky-600/80 dark:text-sky-400/70 mt-0.5">
              Click hisobida pulni ko'rib tasdiqlang — 12 soatda tasdiqlanmasa nasiyaga o'tadi
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-sky-400 flex-none" />
        </button>
      )}

      {/* Hudud filtri — TEPADA, alohida qatorda (2026-07-20, egasi so'rovi:
          eng ko'p ishlatiladigan filtr, qulay joyda tursin) */}
      {!isDriver && zones.length > 0 && (
        <div className="mb-3">
          <div
            className={cn(
              "inline-flex items-center gap-2 h-10 pl-3 pr-2 rounded-[11px] border transition-colors",
              zone
                ? "border-blue-500/60 bg-blue-50/60 dark:bg-blue-500/10"
                : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
            )}
          >
            <MapPin className={cn("w-4 h-4 flex-none", zone ? "text-blue-600 dark:text-blue-400" : "text-gray-400")} />
            <select
              value={zone}
              onChange={(e) => { setZone(e.target.value); setPage(1); }}
              className={cn(
                "bg-transparent text-[13.5px] font-semibold focus:outline-none pr-1 cursor-pointer",
                zone ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-200"
              )}
            >
              <option value="">Barcha hududlar</option>
              {zones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Qidiruv + kun tanlash + status tablar — hudud ostida */}
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
        {/* Kun tanlash — o'sha kuni yozilgan buyurtmalar */}
        {!isDriver && (
          <div
            className={cn(
              "flex items-center gap-1.5 h-10 pl-3 pr-1.5 rounded-[11px] border transition-colors",
              day
                ? "border-blue-500/60 bg-blue-50/60 dark:bg-blue-500/10"
                : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
            )}
          >
            <CalendarDays className={cn("w-4 h-4 flex-none", day ? "text-blue-600 dark:text-blue-400" : "text-gray-400")} />
            <input
              type="date"
              value={day}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => { setDay(e.target.value); setPage(1); }}
              className="bg-transparent text-[13px] font-semibold text-gray-900 dark:text-white focus:outline-none w-[124px]"
            />
            {day && (
              <button
                onClick={() => { setDay(""); setPage(1); }}
                title="Kunni bekor qilish"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        <SegmentTabs
          options={[
            ...filters.map((f) => ({
              value: f.value,
              label: f.label,
              count: status === f.value ? meta?.total : undefined,
            })),
            // Qolib ketganlar tabi — faqat bor bo'lsa ko'rinadi
            ...(!isDriver && (overdueCount > 0 || isOverdueView)
              ? [{ value: "OVERDUE", label: "⏰ Qolib ketgan", count: overdueCount }]
              : []),
            // Klik tasdiqlash tabi — tasdiqlanmagan Klik zakazlari bor bo'lsa
            ...(!isDriver && (cardPendingCount > 0 || isCardPendingView)
              ? [{ value: "CARD_PENDING", label: "💳 Klik tasdiqlash", count: cardPendingCount }]
              : []),
          ]}
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
                  <span className="flex items-center gap-1.5">
                    {order.editedAt && (
                      <span title="Yopilgandan keyin tahrirlangan"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        <PencilLine className="w-3 h-3" /> Tahrirlangan
                      </span>
                    )}
                    {isCardPending(order) && (
                      <span title="Klik to'lovi hali tasdiqlanmagan"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-500/10 text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                        <CreditCard className="w-3 h-3" /> Klik kutilmoqda
                      </span>
                    )}
                    <StatusBadge status={order.status} />
                  </span>
                </div>

                {/* 2-qator: mijoz, telefon + vaqt; hudud pastda (ism yonida EMAS — egasi so'rovi) */}
                <Link
                  href={isDriver ? `/orders/${order.id}` : `/customers/${order.customerId}`}
                  className="block mt-1.5"
                >
                  <span className="block text-[14px] font-medium text-gray-900 dark:text-white truncate">
                    {order.customer.name}
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
                      {formatPhone(order.customer.phone)}
                    </span>
                    <span className="text-[11.5px] text-gray-400 dark:text-gray-500">
                      {formatDate(order.createdAt, "dd.MM HH:mm")}
                    </span>
                  </div>
                  {order.customer.zone && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11.5px] font-medium text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {order.customer.zone} hudud
                    </span>
                  )}
                  {/* Tanlangan yetkazish joyi (Apteka, Uy...) */}
                  {order.location && (
                    <span className="inline-flex items-center gap-1 mt-1 ml-2 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-[11.5px] font-semibold text-amber-700 dark:text-amber-400">
                      <MapPin className="w-3 h-3" />
                      {order.location.label}
                    </span>
                  )}
                  {/* Qolib ketgan — qancha kechikkani */}
                  {["NEW", "PROCESSING", "ASSIGNED"].includes(order.status) &&
                    Date.now() - new Date(order.createdAt).getTime() >= 86400000 && (
                      <span className="block mt-1 text-[11.5px] font-bold text-red-500 dark:text-red-400">
                        ⏰ {lateLabel(order.createdAt)} kechikdi
                      </span>
                    )}
                  {/* Klik tasdiqlanmagan — nasiyaga o'tishga qancha qoldi */}
                  {isCardPending(order) && (
                    <span className="block mt-1 text-[11.5px] font-bold text-sky-600 dark:text-sky-400">
                      💳 Klik: {cardTimeLeftLabel(order.deliveredAt)}
                    </span>
                  )}
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
                        onClick={() => handleQuickDeliver(order)}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Yetkazildi
                      </button>
                    )}
                    {/* Klik tasdiqlash — operator Click hisobida pulni ko'rib bosadi */}
                    {isCardPending(order) && canManageOrders && (
                      <button
                        onClick={() => handleConfirmCard(order)}
                        disabled={confirmCard.isPending}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        Klik tasdiqlash
                      </button>
                    )}
                    {/* Haydovchi tayinlash/ALMASHTIRISH — yetkazilmagan har qanday zakazda */}
                    {!isDriver && ["NEW", "PROCESSING", "ASSIGNED"].includes(order.status) && (
                      <button
                        onClick={() => { setAssignOrderId(order.id); setAssignDriverId(order.driverId); }}
                        className={cn(
                          "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold transition-colors",
                          order.driver
                            ? "border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        )}
                      >
                        <Truck className="w-4 h-4" />
                        {order.driver ? "Almashtirish" : "Biriktirish"}
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
                        <span className="block text-[13px] font-medium text-gray-900 dark:text-white whitespace-nowrap max-w-[170px] truncate">
                          {order.customer.name}
                        </span>
                        <div className="font-mono text-xs text-gray-400 dark:text-gray-500 mt-0.5 whitespace-nowrap">
                          {formatPhone(order.customer.phone)}
                        </div>
                      </Link>
                      {/* Hudud + lokatsiya — ism yonida emas, pastda (egasi so'rovi) */}
                      {(order.customer.zone || order.customer.locationLink || order.location) && (
                        <div className="flex items-center gap-2 mt-1 whitespace-nowrap">
                          {order.customer.zone && (
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-gray-500 dark:text-gray-400">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {order.customer.zone} hudud
                            </span>
                          )}
                          {/* Tanlangan yetkazish joyi (Apteka, Uy...) */}
                          {order.location && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-[11.5px] font-semibold text-amber-700 dark:text-amber-400">
                              <MapPin className="w-3 h-3" />
                              {order.location.label}
                            </span>
                          )}
                          {(order.location?.locationLink || order.customer.locationLink) && (
                            <a
                              href={order.location?.locationLink || order.customer.locationLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 hover:underline"
                            >
                              <Navigation className="w-3 h-3" />
                              Lokatsiya
                            </a>
                          )}
                        </div>
                      )}
                      {/* Qolib ketgan — qancha kechikkani */}
                      {["NEW", "PROCESSING", "ASSIGNED"].includes(order.status) &&
                        Date.now() - new Date(order.createdAt).getTime() >= 86400000 && (
                          <span className="block mt-1 text-[11.5px] font-bold text-red-500 dark:text-red-400 whitespace-nowrap">
                            ⏰ {lateLabel(order.createdAt)} kechikdi
                          </span>
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

                    {/* To'lov — ochiq zakazda hali tanlanmagan (haydovchi yetkazganda belgilaydi) */}
                    <td className="px-4 py-3">
                      {order.paymentType ? (
                        <>
                          <Pill tone={PAYMENT_TONES[order.paymentType] || "muted"}>
                            {PAYMENT_TYPE_LABELS[order.paymentType]}
                          </Pill>
                          {/* Klik holati: kutilmoqda (muddat bilan) yoki tasdiqlangan */}
                          {isCardPending(order) && (
                            <span className="block mt-1 text-[10.5px] font-semibold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                              💳 {cardTimeLeftLabel(order.deliveredAt)}
                            </span>
                          )}
                          {order.paymentType === "CARD" && order.cardConfirmedAt && (
                            <span className="block mt-1 text-[10.5px] font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                              ✓ Klik tasdiqlangan
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Holat */}
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                      {order.editedAt && (
                        <span title="Yopilgandan keyin tahrirlangan"
                          className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-600 dark:text-amber-400">
                          <PencilLine className="w-3 h-3" /> Tahrirlangan
                        </span>
                      )}
                    </td>

                    {/* Haydovchi — biriktirilgan bo'lsa ham bosib ALMASHTIRSA bo'ladi */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {order.driver ? (
                        !isDriver && order.status === "ASSIGNED" ? (
                          <button
                            onClick={() => { setAssignOrderId(order.id); setAssignDriverId(order.driverId); }}
                            title="Haydovchini almashtirish"
                            className="flex items-center gap-2 group/drv"
                          >
                            <Avatar name={order.driver.name} size={26} />
                            <span className="text-[12.5px] text-gray-500 dark:text-gray-400 group-hover/drv:text-blue-600 dark:group-hover/drv:text-blue-400 group-hover/drv:underline transition-colors">
                              {order.driver.name}
                            </span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Avatar name={order.driver.name} size={26} />
                            <span className="text-[12.5px] text-gray-500 dark:text-gray-400">{order.driver.name}</span>
                          </div>
                        )
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
                            onClick={() => handleQuickDeliver(order)}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-[9px] bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Yetkazildi
                          </button>
                        )}
                        {/* Klik tasdiqlash — operator Click hisobida pulni ko'rib bosadi */}
                        {isCardPending(order) && canManageOrders && (
                          <button
                            onClick={() => handleConfirmCard(order)}
                            disabled={confirmCard.isPending}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-[9px] bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Klik tasdiqlash
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
                                  onClick={() => handleQuickDeliver(order)}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Yetkazildi
                                </button>
                              )}
                              {/* Klik tasdiqlash — menyudan ham */}
                              {isCardPending(order) && canManageOrders && (
                                <button
                                  onClick={() => handleConfirmCard(order)}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  Klik tasdiqlash
                                </button>
                              )}
                              {/* Yopilgan zakazni tuzatish — mijoz sonini o'zgartirsa (24h) */}
                              {canManageOrders && withinEditWindow(order) && (
                                <button
                                  onClick={() => { setAdjustOrder(order); setOpenMenu(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                                >
                                  <PencilLine className="w-3.5 h-3.5" />
                                  Tahrirlash
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
      {/* Yetkazildi → to'lov turini tanlash (naqd/karta/nasiya) */}
      {deliverOrder && (
        <DeliverModal order={deliverOrder} onClose={() => setDeliverOrder(null)} />
      )}
      {/* Yopilgan zakazni tahrirlash (24h ichida) */}
      {adjustOrder && (
        <AdjustOrderModal order={adjustOrder} onClose={() => setAdjustOrder(null)} />
      )}
      {/* Xarajat kiritish (operator/admin) */}
      {showExpense && <DriverExpenseModal onClose={() => setShowExpense(false)} />}
    </div>
  );
}
