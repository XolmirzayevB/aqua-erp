"use client";

// Zakazni TAHRIRLASH modali — IKKI rejim (statusdan avtomatik aniqlanadi):
// 1) YOPILGAN (DELIVERED, 2026-07-17): 24 soat ichida tuzatish —
//    ombor, moliya (kirim/qarz), mijoz tarasi, hisobotlar tuzatiladi.
// 2) OCHIQ (2026-07-20, egasi so'rovi): yetkazishdan OLDIN tuzatish —
//    mijoz tarasi/ombor/summa qayta hisoblanadi (moliya hali yozilmagan),
//    haydovchiga xabar boradi.

import { useState } from "react";
import { X, Loader2, PencilLine, RefreshCw, Package, Minus, Plus, Check, Home } from "lucide-react";
import { useAdjustOrder, useUpdateOrder, Order } from "@/hooks/use-orders";
import { formatCurrency, cn } from "@/lib/utils";

interface Props {
  order: Pick<Order, "id" | "seq" | "status" | "refillCount" | "newBottles" | "refillPrice" | "newBottlePrice" | "totalAmount" | "paymentType"> & {
    customer: { name: string; bottlesOwned?: number };
  };
  onClose: () => void;
}

export function AdjustOrderModal({ order, onClose }: Props) {
  const [refill, setRefill] = useState(order.refillCount);
  const [newB, setNewB] = useState(order.newBottles);
  const [reason, setReason] = useState("");
  const adjust = useAdjustOrder();
  const update = useUpdateOrder();

  // Ochiq zakaz — PATCH /orders/:id (yetkazishdan oldin); yopilgan — /adjust
  const isOpenOrder = order.status !== "DELIVERED";
  const saving = isOpenOrder ? update.isPending : adjust.isPending;

  // "Uyida nechta tara bor?" (2026-07-20, egasi so'rovi) — mijoz tarasini ham
  // shu yerda aniqlashtirish mumkin. Ochiq zakazda BU ZAKAZDAN TASHQARI son
  // ko'rsatiladi (yaratishda owned ga +newBottles qilingan — ayirib qaytaramiz);
  // yopilganда — hozirgi (zakaz qo'shilgan) son.
  const knownOwned = order.customer.bottlesOwned;
  const ownedDefault =
    knownOwned == null ? null : isOpenOrder ? Math.max(0, knownOwned - order.newBottles) : knownOwned;
  const [owned, setOwned] = useState<number>(ownedDefault ?? 0);
  const ownedChanged = ownedDefault != null && owned !== ownedDefault;

  const refillPrice = Number(order.refillPrice);
  const newBottlePrice = Number(order.newBottlePrice);
  const newTotal = refill * refillPrice + newB * newBottlePrice;
  const changed = refill !== order.refillCount || newB !== order.newBottles || ownedChanged;
  const canSave = changed && refill + newB > 0;

  // TO'KIB OLISH: mijoz tarasidan ko'p to'ldirish — ortiqcha suv idishga
  // quyilib, tara darrov qaytadi (faqat ochiq zakazda ko'rsatamiz)
  const pourCount = isOpenOrder && ownedDefault != null ? Math.max(0, refill - owned) : 0;

  const handleSave = async () => {
    if (!canSave) return;
    const payload = {
      id: order.id,
      refillCount: refill,
      newBottles: newB,
      reason: reason.trim() || undefined,
      actualBottlesOwned: ownedChanged ? owned : undefined,
    };
    if (isOpenOrder) await update.mutateAsync(payload);
    else await adjust.mutateAsync(payload);
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

          {/* Uyida nechta tara — mijoz kartasi ham shu yerdan tuzatiladi */}
          {ownedDefault != null && (
            <div className="flex items-center gap-3 rounded-[14px] border border-amber-200/70 dark:border-amber-500/25 bg-amber-50/50 dark:bg-amber-500/[0.07] p-3">
              <span className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-none bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Home className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                  Uyida nechta tara bor?
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {isOpenOrder ? "bu zakazdan tashqari" : "hozirgi holati"}
                  {ownedChanged ? ` · ${ownedDefault} → ${owned}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-none">
                <button type="button" onClick={() => setOwned((c) => Math.max(0, c - 1))} disabled={owned <= 0}
                  className="w-10 h-10 rounded-[11px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 flex items-center justify-center active:scale-95 transition-all disabled:opacity-40">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-[19px] font-bold tabular-nums text-gray-900 dark:text-white">{owned}</span>
                <button type="button" onClick={() => setOwned((c) => c + 1)}
                  className="w-10 h-10 rounded-[11px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 flex items-center justify-center active:scale-95 transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TO'KIB OLISH belgisi — tara yetmasa ham zakaz bo'laveradi */}
          {pourCount > 0 && (
            <p className="text-[12.5px] leading-relaxed px-3.5 py-2.5 rounded-[12px] bg-sky-50 dark:bg-sky-500/10 border border-sky-200/70 dark:border-sky-500/25 text-sky-700 dark:text-sky-300">
              ♻️ <b>{pourCount} ta suv to&apos;kib olinadi</b> — mijoz tarasi {owned} ta,
              ortiqcha suv idishiga quyilib, tara darrov qaytariladi (izohga yoziladi).
            </p>
          )}

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
            {isOpenOrder ? (
              <>
                Saqlashda mijozdagi tara soni, ombor va summa avtomatik tuzatiladi
                (pul hisoblari yetkazilganda yoziladi). Haydovchi biriktirilgan
                bo&apos;lsa unga xabar boradi. Zakaz &quot;Tahrirlangan&quot; belgisini oladi.
              </>
            ) : (
              <>
                Saqlashda hammasi avtomatik tuzatiladi: ombor, mijozdagi tara soni,{" "}
                {order.paymentType === "DEBT" ? "mijoz qarzi" : order.paymentType === "FREE" ? "(bepul — moliyaga ta'sir yo'q)" : "moliya kirimlari"} va hisobotlar.
                Zakaz &quot;Tahrirlangan&quot; belgisini oladi.
              </>
            )}
          </p>

          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full h-[52px] rounded-[14px] bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[15.5px] font-bold shadow-glow transition-all flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}
