"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, MapPin, Package, Wallet, Edit,
  ShoppingCart, CreditCard, TrendingUp, Banknote, Navigation, AlertCircle,
  Plus, Trash2, Loader2, X,
} from "lucide-react";
import {
  useCustomer, useCustomerStats, useCustomerOrders,
  useCustomerPayments, useUpdateCustomer,
  useAddLocation, useUpdateLocation, useDeleteLocation, CustomerLocation,
} from "@/hooks/use-customers";
import { CustomerForm } from "./customer-form";
import { PaymentModal } from "./payment-modal";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, PAYMENT_TYPE_LABELS, OrderStatus } from "@aqua/shared";
import { Avatar, Pill, thClass, cardClass, btnPrimary, btnSecondary } from "@/components/shared/page-ui";
import type { Tone } from "@/components/shared/page-ui";
import { usePermissions } from "@/hooks/use-permissions";

// Buyurtma holati → pill toni (dizayn xaritasi)
const STATUS_TONE: Record<string, Tone> = {
  NEW: "violet",
  PROCESSING: "warning",
  ASSIGNED: "primary",
  DELIVERED: "success",
  CANCELLED: "danger",
};

interface Props { id: string }

export function CustomerDetail({ id }: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"orders" | "payments">("orders");

  const { readOnly } = usePermissions();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: stats } = useCustomerStats(id);
  const { data: orders } = useCustomerOrders(id, ordersPage);
  const { data: payments } = useCustomerPayments(id, paymentsPage);
  const updateCustomer = useUpdateCustomer();

  const handleUpdate = async (data: any) => {
    await updateCustomer.mutateAsync({ id, data });
    setShowEdit(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse max-w-5xl">
        <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  if (!customer) return <div className="text-gray-400 text-center py-20">Mijoz topilmadi</div>;

  const balance = Number(customer.balance);
  const bottlesOwed = customer.bottlesOwned;

  return (
    <div className="space-y-4 md:space-y-5 max-w-5xl">
      {/* Sarlavha: orqaga + ism; amallar mobilda pastga tushadi */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/customers"
          className="w-9 h-9 flex items-center justify-center rounded-[11px] border border-gray-100 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-none"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
              {customer.name}
            </h1>
            {customer.zone && <Pill tone="primary">Hudud {customer.zone}</Pill>}
            {!customer.isActive && <Pill tone="muted">Nofaol</Pill>}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Qo'shilgan: {formatDate(customer.createdAt)} · {customer.createdBy.name}
          </p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowPayment(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-[13.5px] font-semibold transition-colors whitespace-nowrap"
            >
              <Banknote className="w-4 h-4 flex-none" />
              To'lov qabul qilish
            </button>
            <button onClick={() => setShowEdit(true)} className={cn(btnSecondary, "flex-1 sm:flex-none justify-center")}>
              <Edit className="w-4 h-4 flex-none" />
              Tahrirlash
            </button>
          </div>
        )}
      </div>

      {/* Balans / tara / xarid — mobilda ham 3 ta yonma-yon ixcham karta */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <StatMini
          label="Joriy balans"
          value={
            <span className={balance < 0 ? "text-red-500" : balance > 0 ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}>
              {balance < 0 ? "−" : balance > 0 ? "+" : ""}
              {formatCurrency(Math.abs(balance))}
            </span>
          }
          icon={Wallet}
          tone="primary"
        />
        <StatMini
          label="Tara (uyida)"
          value={
            <span className={bottlesOwed > 0 ? "text-amber-600 dark:text-amber-300" : "text-gray-900 dark:text-white"}>
              {bottlesOwed} ta
            </span>
          }
          icon={Package}
          tone="warning"
        />
        <StatMini
          label="Umumiy xarid"
          value={<span className="text-gray-900 dark:text-white">{formatCurrency(stats?.totalSpent ?? 0)}</span>}
          icon={TrendingUp}
          tone="success"
        />
      </div>

      {/* Mijoz ma'lumotlari kartasi */}
      <div className={cn(cardClass, "p-4 md:p-5")}>
        <div className="flex items-start gap-3 md:gap-4">
          <Avatar name={customer.name} size={48} />
          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <InfoRow icon={Phone} label="Asosiy telefon" value={formatPhone(customer.phone)} mono />
            {customer.phone2 && (
              <InfoRow icon={Phone} label="Qo'shimcha telefon" value={formatPhone(customer.phone2)} mono />
            )}
            <InfoRow icon={MapPin} label="Manzil" value={customer.address} className="sm:col-span-2" />
            {customer.notes && (
              <InfoRow icon={AlertCircle} label="Izoh" value={customer.notes} className="sm:col-span-2" />
            )}
          </div>
        </div>
        {customer.locationLink && (
          <a
            href={customer.locationLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 w-full sm:w-auto sm:inline-flex px-4 h-10 rounded-[11px] bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Lokatsiyani ochish (Google Maps)
          </a>
        )}
      </div>

      {/* QO'SHIMCHA MANZILLAR (Uy, Apteka...) — zakaz yozilganda tanlanadi */}
      <LocationsCard customerId={id} locations={customer.locations || []} readOnly={readOnly} />

      {/* Buyurtma holatlari xulosasi — mobilda gorizontal aylanadigan chiplar */}
      {stats?.orderStats && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
            <div
              key={status}
              className="flex items-center gap-2.5 bg-white dark:bg-gray-900 rounded-[14px] border border-gray-100 dark:border-gray-800 px-3.5 py-2.5 shadow-card flex-none"
            >
              <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                {stats.orderStats[status] ?? 0}
              </span>
              <Pill tone={STATUS_TONE[status] || "muted"} className="!text-[11px]">{label}</Pill>
            </div>
          ))}
        </div>
      )}

      {/* Tablar: buyurtmalar / to'lovlar */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          {[
            { key: "orders", label: "Buyurtmalar", icon: ShoppingCart },
            { key: "payments", label: "To'lovlar", icon: CreditCard },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={cn(
                "flex items-center gap-2 px-4 md:px-5 py-3.5 text-[13px] font-semibold transition-all border-b-2 -mb-px",
                activeTab === key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Buyurtmalar tab */}
        {activeTab === "orders" && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr>
                    <th className={cn(thClass, "pl-5")}>#</th>
                    <th className={cn(thClass, "text-center")}>Soni</th>
                    <th className={cn(thClass, "text-right")}>Summa</th>
                    <th className={thClass}>To'lov</th>
                    <th className={thClass}>Haydovchi</th>
                    <th className={thClass}>Holat</th>
                    <th className={cn(thClass, "pr-5")}>Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {(orders?.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm border-t border-gray-400/70 dark:border-gray-600">
                        Buyurtmalar yo'q
                      </td>
                    </tr>
                  ) : (
                    (orders?.data || []).map((order: any, i: number) => (
                      <tr key={order.id} className="border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 pl-5 py-3">
                          <Link href={`/orders/${order.id}`} className="font-mono text-[13px] font-bold text-blue-600 dark:text-blue-400 hover:underline tabular-nums">
                            #{order.seq ?? (orders?.meta ? (orders.meta.page - 1) * orders.meta.limit : 0) + i + 1}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center text-[13.5px] font-semibold text-gray-900 dark:text-white tabular-nums">
                          {order.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-[13.5px] font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {/* Ochiq zakazda to'lov hali tanlanmagan (yetkazishda tanlanadi) */}
                          {order.paymentType
                            ? PAYMENT_TYPE_LABELS[order.paymentType as keyof typeof PAYMENT_TYPE_LABELS]
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {order.driver?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Pill tone={STATUS_TONE[order.status] || "muted"}>
                            {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                          </Pill>
                        </td>
                        <td className="px-4 pr-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(order.createdAt, "dd.MM.yyyy HH:mm")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination meta={orders?.meta} page={ordersPage} setPage={setOrdersPage} />
          </div>
        )}

        {/* To'lovlar tab */}
        {activeTab === "payments" && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr>
                    <th className={cn(thClass, "pl-5")}>Summa</th>
                    <th className={thClass}>To'lov turi</th>
                    <th className={thClass}>Izoh</th>
                    <th className={cn(thClass, "pr-5")}>Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {(payments?.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-gray-400 text-sm border-t border-gray-400/70 dark:border-gray-600">
                        To'lovlar tarixi yo'q
                      </td>
                    </tr>
                  ) : (
                    (payments?.data || []).map((payment: any) => (
                      <tr key={payment.id} className="border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 pl-5 py-3 text-[13.5px] font-bold text-green-600 dark:text-green-400 tabular-nums whitespace-nowrap">
                          +{formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {payment.method === "CASH" ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                            {payment.method === "CASH" ? "Naqd" : "Karta"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                          {payment.notes ?? "—"}
                        </td>
                        <td className="px-4 pr-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(payment.createdAt, "dd.MM.yyyy HH:mm")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination meta={payments?.meta} page={paymentsPage} setPage={setPaymentsPage} />
          </div>
        )}
      </div>

      {/* Modallar */}
      {showEdit && (
        <CustomerForm
          title="Mijozni tahrirlash"
          defaultValues={customer}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
          isLoading={updateCustomer.isPending}
        />
      )}
      {showPayment && (
        <PaymentModal
          customerId={customer.id}
          customerName={customer.name}
          currentBalance={balance}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}

// ── QO'SHIMCHA MANZILLAR kartasi (Uy, Apteka, Do'kon...) ──────────────────
// Zakaz yozilganda operator shulardan birini tanlaydi; haydovchi o'sha joyga boradi.
function LocationsCard({
  customerId, locations, readOnly,
}: {
  customerId: string; locations: CustomerLocation[]; readOnly: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const addLocation = useAddLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const handleDelete = async (loc: CustomerLocation) => {
    if (!confirm(`"${loc.label}" manzilini o'chirmoqchimisiz?`)) return;
    await deleteLocation.mutateAsync({ customerId, locationId: loc.id });
  };

  return (
    <div className={cn(cardClass, "p-4 md:p-5")}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <div>
          <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">Qo'shimcha manzillar</h3>
          <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
            Mijoz bir nechta joyga suv aytadi (uy, apteka...) — zakazda tanlanadi
          </p>
        </div>
        {!readOnly && !adding && (
          <button
            onClick={() => { setAdding(true); setEditId(null); }}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] border border-gray-100 dark:border-gray-800 text-[13px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex-none"
          >
            <Plus className="w-4 h-4" /> Qo'shish
          </button>
        )}
      </div>

      {locations.length === 0 && !adding && (
        <p className="text-[13px] text-gray-400 dark:text-gray-500 py-3">
          Hozircha qo'shimcha manzil yo'q — faqat asosiy manzil ishlatiladi.
        </p>
      )}

      <div className="mt-2 space-y-2">
        {locations.map((loc) =>
          editId === loc.id ? (
            <LocationForm
              key={loc.id}
              initial={loc}
              pending={updateLocation.isPending}
              onCancel={() => setEditId(null)}
              onSave={async (data) => {
                await updateLocation.mutateAsync({ customerId, locationId: loc.id, data });
                setEditId(null);
              }}
            />
          ) : (
            <div
              key={loc.id}
              className="flex items-center gap-3 px-3.5 py-3 rounded-[13px] border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40"
            >
              <span className="w-9 h-9 rounded-[10px] bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-none">
                <MapPin className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">{loc.label}</p>
                {(loc.address || loc.locationLink) && (
                  <p className="text-[12.5px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {loc.address || "Faqat lokatsiya havolasi"}
                  </p>
                )}
              </div>
              {loc.locationLink && (
                <a
                  href={loc.locationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Xaritada ochish"
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors flex-none"
                >
                  <Navigation className="w-4 h-4" />
                </a>
              )}
              {!readOnly && (
                <>
                  <button
                    onClick={() => { setEditId(loc.id); setAdding(false); }}
                    title="Tahrirlash"
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-none"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(loc)}
                    title="O'chirish"
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-none"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )
        )}

        {adding && (
          <LocationForm
            pending={addLocation.isPending}
            onCancel={() => setAdding(false)}
            onSave={async (data) => {
              await addLocation.mutateAsync({ customerId, data });
              setAdding(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Manzil qo'shish/tahrirlash mini-formasi
function LocationForm({
  initial, pending, onSave, onCancel,
}: {
  initial?: CustomerLocation;
  pending: boolean;
  onSave: (data: { label: string; address?: string; locationLink?: string }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [link, setLink] = useState(initial?.locationLink ?? "");
  const inputCls =
    "w-full h-11 px-3.5 rounded-[11px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[13.5px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all";

  return (
    <div className="p-3.5 rounded-[13px] border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-500/5 space-y-2.5">
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Joy nomi (masalan: Apteka)" className={inputCls} autoFocus />
      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Manzil (ixtiyoriy)" className={inputCls} />
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Google Maps havolasi (ixtiyoriy)" className={inputCls} />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="h-9 px-3.5 rounded-[10px] text-[13px] font-semibold text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition-colors inline-flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Bekor
        </button>
        <button
          onClick={() => onSave({ label: label.trim(), address: address.trim() || undefined, locationLink: link.trim() || undefined })}
          disabled={label.trim().length < 1 || pending}
          className="h-9 px-4 rounded-[10px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors inline-flex items-center gap-1.5"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Saqlash
        </button>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon, label, value, className = "", mono = false,
}: {
  icon: any; label: string; value: string; className?: string; mono?: boolean;
}) {
  return (
    <div className={className}>
      <p className="text-[11.5px] text-gray-400 dark:text-gray-500 font-medium mb-0.5">{label}</p>
      <div className="flex items-start gap-1.5 min-w-0">
        <Icon className="w-3.5 h-3.5 text-gray-400 flex-none mt-0.5" />
        <p className={cn(
          "text-[13.5px] text-gray-900 dark:text-gray-100 font-medium break-words",
          mono && "font-mono whitespace-nowrap"
        )}>
          {value}
        </p>
      </div>
    </div>
  );
}

// Ixcham stat karta — mobilda 3 ta yonma-yon sig'adi
function StatMini({
  label, value, icon: Icon, tone,
}: {
  label: string; value: React.ReactNode; icon: any; tone: Tone;
}) {
  const toneCls: Record<Tone, string> = {
    primary: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300",
    violet: "bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300",
    success: "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400",
    warning: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300",
    danger: "bg-red-50 dark:bg-red-500/15 text-red-500 dark:text-red-400",
    muted: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  };
  return (
    <div className="bg-white dark:bg-gray-900 rounded-[14px] border border-gray-100 dark:border-gray-800 p-3 md:p-4 shadow-card min-w-0">
      <span className={cn("w-8 h-8 md:w-9 md:h-9 rounded-[10px] inline-flex items-center justify-center mb-2", toneCls[tone])}>
        <Icon className="w-4 h-4" />
      </span>
      <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{label}</p>
      <p className="text-[14px] md:text-lg font-bold tracking-tight tabular-nums mt-0.5 break-words leading-tight">
        {value}
      </p>
    </div>
  );
}

function Pagination({ meta, page, setPage }: { meta: any; page: number; setPage: (p: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="px-5 py-3 border-t border-gray-400/70 dark:border-gray-600 flex items-center justify-between">
      <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} / {meta.total}
      </p>
      <div className="flex gap-1">
        <button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1.5 text-xs font-semibold rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          ← Oldingi
        </button>
        <button
          disabled={page >= meta.totalPages}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1.5 text-xs font-semibold rounded-[9px] border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Keyingi →
        </button>
      </div>
    </div>
  );
}
