"use client";

// YOPILGAN zakazni TAHRIRLASH modali (2026-07-17, egasi so'rovi).
// Haydovchi yetkazgach mijoz "4 ta kifoya" / "yana 1 yangi tara" desa —
// operator/admin 24 soat ichida shu yerdan tuzatadi.
// Ta'siri HAMMA joyga: ombor, moliya (kirim/qarz), mijoz tarasi, hisobotlar.

import { useState } from "react";
import { X, Loader2, PencilLine, RefreshCw, Package, Minus, Plus, Check } from "lucide-react";
import { useAdjustOrder, Order } from "@/hooks/use-orders";
import { formatCurrency, cn } from "@/lib/utils";

interface Props {
  order: Pick<Order, "id" | "seq" | "refillCount" | "newBottles" | "refillPrice" | "newBottlePrice" | "totalAmount" | "paymentType"> & {
    customer: { name: string };
  };
  onClose: () => void;
}

export function AdjustOrderModal({ order, onClose }: Props) {
  const [refill, setRefill] = useState(order.refillCount);
  const [newB, setNewB] = useState(order.newBottles);
  const [reason, setReason] = useState("");
  const adjust = useAdjustOrder();

  const refillPrice = Number(order.refillPrice);
  const newBottlePrice = Number(order.newBottlePrice);
  const newTotal = refill * refillPrice + newB * newBottlePrice;
  const changed = refill !== order.refillCount || newB !== order.newBottles;
  const canSave = changed && refill + newB > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await adjust.mutateAsync({
      id: order.id,
      refillCount: refill,
      newBottles: newB,
      reason: reason.trim() || undefined,
    });
    onClose();
  };

  const row = (
    label: string, icon: any, value: number, setValue: (f: (c: number) => number) => void, price: number, tone: string
  ) => {
    const Icon = icon;
    return (
      <div className="flex items-center gap-3 rounded-[14px] border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-3">
        <span className={`w-9 h-9 rounded-[11px] flex items-center justify-center flex-none ${tone}`}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-gray-800 dark:text-gray-200 leading-tight">{label}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{formatCurrency(price)} dan</p>
        </div>
        <div className="flex items-center gap-1.5 flex-none">
          <button type="button" onClick={() => setValue((c) => Math.max(0, c - 1))} disabled={value <= 0}
            className="w-10 h-10 rounded-[11px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 flex items-center justify-center active:scale-95 transition-all disabled:opacity-40">
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-10 text-center text-[19px] font-bold tabular-nums text-gray-900 dark:text-white">{value}</span>
          <button type="button" onClick={() => setValue((c) => c + 1)}
            className="w-10 h-10 rounded-[11px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 flex items-center justify-center active:scale-95 transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-[20px] md:rounded-[20px] shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[94vh] overflow-y-auto">
        {/* Sarlavha */}
        <div className="flex items-center gap-3.5 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-11 h-11 rounded-[13px] bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center flex-none">
            <PencilLine className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
              #{order.seq} — Tahrirlash
            </h2>
            <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
              {order.customer.name} · hozir: {order.refillCount} to'ldirish + {order.newBottles} yangi
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-none">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3.5">
          {row("To'ldirish (almashtirish)", RefreshCw, refill, setRefill, refillPrice,
            "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400")}
          {row("Yangi tara", Package, newB, setNewB, newBottlePrice,
            "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400")}

          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sabab (ixtiyoriy): mijoz 4 ta kifoya dedi..."
            className="w-full h-11 px-3.5 rounded-[12px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-[13.5px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
          />

          {/* Yangi summa + ta'sir izohi */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-[14px] bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            <div className="min-w-0">
              <p className="text-[12px] text-gray-400">Yangi summa</p>
              <p className={cn("text-[12px] mt-0.5",
                newTotal !== Number(order.totalAmount) ? "text-amber-600 dark:text-amber-400 font-medium" : "text-gray-400")}>
                {newTotal !== Number(order.totalAmount)
                  ? `avval ${formatCurrency(Number(order.totalAmount))} edi`
                  : "summa o'zgarmaydi"}
              </p>
            </div>
            <p className="text-[22px] font-bold text-gray-900 dark:text-white tabular-nums flex-none">
              {formatCurrency(newTotal)}
            </p>
          </div>

          <p className="text-[12px] text-gray-400 leading-relaxed">
            Saqlashda hammasi avtomatik tuzatiladi: ombor, mijozdagi tara soni,{" "}
            {order.paymentType === "DEBT" ? "mijoz qarzi" : order.paymentType === "FREE" ? "(bepul — moliyaga ta'sir yo'q)" : "moliya kirimlari"} va hisobotlar.
            Zakaz "Tahrirlangan" belgisini oladi.
          </p>

          <button
            onClick={handleSave}
            disabled={!canSave || adjust.isPending}
            className="w-full h-[52px] rounded-[14px] bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[15.5px] font-bold shadow-glow transition-all flex items-center justify-center gap-2"
          >
            {adjust.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}
