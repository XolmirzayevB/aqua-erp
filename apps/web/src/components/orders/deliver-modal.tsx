"use client";

// "Yetkazildi" bosilganda chiqadigan TO'LOV TANLASH modali (2026-07-16).
// Haydovchi zakazni yopayotganda pul qanday kelganini belgilaydi:
// Naqd / Karta (Click) / Nasiya. Operator zakaz yozganda to'lov TANLAMAYDI —
// bu haydovchining ishi (egasi so'rovi).
// Eski zakazlarda to'lov avvaldan belgilangan bo'lsa — faqat tasdiq so'raladi.

import { useState } from "react";
import { X, Loader2, CheckCircle, Banknote, CreditCard, NotebookPen } from "lucide-react";
import { useUpdateOrderStatus, Order } from "@/hooks/use-orders";
import { formatCurrency, cn } from "@/lib/utils";

interface Props {
  order: Pick<Order, "id" | "seq" | "totalAmount" | "paymentType"> & {
    customer: { name: string };
  };
  onClose: () => void;
  onDone?: () => void;
}

const OPTIONS = [
  { value: "CASH", label: "Naqd", desc: "Pul qo'lda olindi", icon: Banknote, active: "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400" },
  { value: "CARD", label: "Karta / Click", desc: "Kartaga o'tkazildi", icon: CreditCard, active: "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  { value: "DEBT", label: "Nasiya", desc: "Qarzga yozildi", icon: NotebookPen, active: "border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" },
] as const;

export function DeliverModal({ order, onClose, onDone }: Props) {
  // Eski zakazda to'lov avvaldan bor — o'zgartirib bo'lmaydi, faqat tasdiqlanadi
  const locked = !!order.paymentType;
  const [payment, setPayment] = useState<"CASH" | "CARD" | "DEBT">(order.paymentType || "CASH");
  const updateStatus = useUpdateOrderStatus();

  const handleConfirm = async () => {
    await updateStatus.mutateAsync({
      id: order.id,
      status: "DELIVERED",
      // Belgilangan bo'lsa yubormaymiz (backend o'zgartirishga ruxsat bermaydi)
      ...(locked ? {} : { paymentType: payment }),
    });
    onDone?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-[20px] md:rounded-[20px] shadow-2xl border border-gray-100 dark:border-gray-800">
        {/* Sarlavha */}
        <div className="flex items-center gap-3.5 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-11 h-11 rounded-[13px] bg-green-50 dark:bg-green-500/15 flex items-center justify-center flex-none">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
              #{order.seq} — Yetkazildi
            </h2>
            <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
              {order.customer.name} · {formatCurrency(order.totalAmount)}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-none">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-[14.5px] font-semibold text-gray-800 dark:text-gray-200">
            To'lov qanday bo'ldi?
          </p>

          {/* To'lov variantlari — katta, barmoq bilan oson bosiladigan */}
          <div className="space-y-2.5">
            {OPTIONS.map(({ value, label, desc, icon: Icon, active }) => {
              const disabled = locked && value !== order.paymentType;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPayment(value)}
                  className={cn(
                    "w-full flex items-center gap-3.5 px-4 h-[62px] rounded-[14px] border-2 text-left transition-all",
                    payment === value
                      ? active
                      : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700",
                    disabled && "opacity-35 cursor-not-allowed"
                  )}
                >
                  <Icon className="w-6 h-6 flex-none" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15.5px] font-bold leading-tight">{label}</span>
                    <span className="block text-[12.5px] opacity-70 mt-0.5">{desc}</span>
                  </span>
                  <span
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none",
                      payment === value ? "border-current" : "border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {payment === value && <span className="w-2.5 h-2.5 rounded-full bg-current" />}
                  </span>
                </button>
              );
            })}
          </div>

          {locked && (
            <p className="text-[12.5px] text-gray-400">
              Bu zakazda to'lov turi avvaldan belgilangan — faqat tasdiqlaysiz.
            </p>
          )}
          {!locked && payment === "DEBT" && (
            <p className="text-[13px] font-medium text-amber-600 dark:text-amber-400">
              {formatCurrency(order.totalAmount)} mijoz qarziga yoziladi — pul keyin olinadi
            </p>
          )}

          {/* Tasdiqlash */}
          <button
            onClick={handleConfirm}
            disabled={updateStatus.isPending}
            className="w-full h-[54px] rounded-[14px] bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-[16px] font-bold shadow-glow transition-all flex items-center justify-center gap-2"
          >
            {updateStatus.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            Yetkazildi deb belgilash
          </button>
        </div>
      </div>
    </div>
  );
}
