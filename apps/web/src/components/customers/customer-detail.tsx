"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, MapPin, Package, DollarSign, Edit,
  ShoppingCart, CreditCard, Clock, CheckCircle, XCircle,
  TrendingDown, Plus, Banknote, ExternalLink, AlertCircle,
} from "lucide-react";
import {
  useCustomer, useCustomerStats, useCustomerOrders,
  useCustomerPayments, useUpdateCustomer,
} from "@/hooks/use-customers";
import { CustomerForm } from "./customer-form";
import { PaymentModal } from "./payment-modal";
import { formatCurrency, formatDate, formatPhone, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, PAYMENT_TYPE_LABELS, OrderStatus } from "@aqua/shared";

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  PROCESSING: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
  ASSIGNED: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
  DELIVERED: "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400",
};

interface Props { id: string }

export function CustomerDetail({ id }: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"orders" | "payments">("orders");

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
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  if (!customer) return <div className="text-gray-400 text-center py-20">Mijoz topilmadi</div>;

  const bottlesOwed = customer.bottlesOwned;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link
          href="/customers"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{customer.name}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Qo'shilgan: {formatDate(customer.createdAt)} · {customer.createdBy.name} tomonidan
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowPayment(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Banknote className="w-4 h-4" />
            To'lov qabul qilish
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Tahrirlash
          </button>
        </div>
      </div>

      {/* Main info grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Customer card */}
        <div className="col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xl flex-shrink-0">
              {getInitials(customer.name)}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3">
              <InfoRow icon={Phone} label="Asosiy telefon" value={formatPhone(customer.phone)} />
              {customer.phone2 && (
                <InfoRow icon={Phone} label="Qo'shimcha" value={formatPhone(customer.phone2)} />
              )}
              {customer.zone && (
                <InfoRow icon={MapPin} label="Hudud" value={`Hudud ${customer.zone}`} />
              )}
              <InfoRow icon={MapPin} label="Manzil" value={customer.address} className="col-span-2" />
              {customer.notes && (
                <InfoRow icon={AlertCircle} label="Izoh" value={customer.notes} className="col-span-2" />
              )}
              {customer.locationLink && (
                <div className="col-span-2">
                  <a
                    href={customer.locationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Lokatsiyani ochish (Google Maps)
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="space-y-3">
          <StatMini
            label="Joriy balans"
            value={
              <span className={customer.balance < 0 ? "text-red-500" : customer.balance > 0 ? "text-green-600" : "text-gray-700 dark:text-gray-300"}>
                {customer.balance < 0 ? "-" : customer.balance > 0 ? "+" : ""}
                {formatCurrency(Math.abs(Number(customer.balance)))}
              </span>
            }
            icon={<DollarSign className="w-4 h-4" />}
            color="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600"
          />
          <StatMini
            label="Taralar (uyida)"
            value={<span className={bottlesOwed > 0 ? "text-orange-600" : "text-gray-700 dark:text-gray-300"}>{bottlesOwed} ta</span>}
            icon={<Package className="w-4 h-4" />}
            color="bg-orange-50 dark:bg-orange-950/30 text-orange-600"
          />
          <StatMini
            label="Umumiy xarid"
            value={formatCurrency(stats?.totalSpent ?? 0)}
            icon={<TrendingDown className="w-4 h-4" />}
            color="bg-green-50 dark:bg-green-950/30 text-green-600"
          />
        </div>
      </div>

      {/* Order status summary */}
      {stats?.orderStats && (
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
            <div key={status} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.orderStats[status] ?? 0}
              </p>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block", STATUS_STYLE[status])}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          {[
            { key: "orders", label: "Buyurtmalar tarixi", icon: ShoppingCart },
            { key: "payments", label: "To'lovlar tarixi", icon: CreditCard },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2",
                activeTab === key
                  ? "border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Orders tab */}
        {activeTab === "orders" && (
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  {["#", "Soni", "Summa", "To'lov", "Haydovchi", "Status", "Sana"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(orders?.data || []).length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">Buyurtmalar yo'q</td></tr>
                ) : (
                  (orders?.data || []).map((order: any, i: number) => (
                    <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="px-5 py-3 text-sm font-semibold text-gray-400">{(orders?.meta ? (orders.meta.page - 1) * orders.meta.limit : 0) + i + 1}</td>
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{order.quantity} ta</td>
                      <td className="px-5 py-3 text-gray-900 dark:text-white">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {PAYMENT_TYPE_LABELS[order.paymentType as keyof typeof PAYMENT_TYPE_LABELS]}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{order.driver?.name ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={cn("text-xs px-2 py-1 rounded-full font-medium", STATUS_STYLE[order.status])}>
                          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(order.createdAt, "dd.MM.yyyy HH:mm")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination meta={orders?.meta} page={ordersPage} setPage={setOrdersPage} />
          </div>
        )}

        {/* Payments tab */}
        {activeTab === "payments" && (
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  {["Summa", "To'lov turi", "Izoh", "Sana"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(payments?.data || []).length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400 text-sm">To'lovlar tarixi yo'q</td></tr>
                ) : (
                  (payments?.data || []).map((payment: any) => (
                    <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="px-5 py-3 font-semibold text-green-600 dark:text-green-400">
                        +{formatCurrency(payment.amount)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                          {payment.method === "CASH" ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                          {payment.method === "CASH" ? "Naqd" : "Karta"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{payment.notes ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(payment.createdAt, "dd.MM.yyyy HH:mm")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination meta={payments?.meta} page={paymentsPage} setPage={setPaymentsPage} />
          </div>
        )}
      </div>

      {/* Modals */}
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
          currentBalance={Number(customer.balance)}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, className = "" }: { icon: any; label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <div className="flex items-start gap-1.5">
        <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-800 dark:text-gray-200">{value}</p>
      </div>
    </div>
  );
}

function StatMini({ label, value, sub, icon, color }: { label: string; value: React.ReactNode; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-base font-bold">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Pagination({ meta, page, setPage }: { meta: any; page: number; setPage: (p: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} / {meta.total}
      </p>
      <div className="flex gap-1">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          ← Oldingi
        </button>
        <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Keyingi →
        </button>
      </div>
    </div>
  );
}
