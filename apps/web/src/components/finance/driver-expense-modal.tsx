"use client";

// Haydovchi uchun SODDA xarajat kiritish oynasi (mobil-birinchi).
// Kategoriya — tez tanlash chiplari (benzin, ovqat, remont...), summa, izoh.
// Pastda bugungi kiritilgan xarajatlar ro'yxati — haydovchi tekshirib turadi.
// Moliya bo'limiga EXPENSE tranzaksiya bo'lib tushadi (foydaga ta'sir qiladi).

import { useState } from "react";
import { X, Loader2, Wallet } from "lucide-react";
import { useAddExpense, useMyTodayExpenses } from "@/hooks/use-finance";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const CATEGORIES = ["Yoqilg'i", "Ovqat", "Ta'mirlash", "Boshqa"];

export function DriverExpenseModal({ onClose }: { onClose: () => void }) {
  const addExpense = useAddExpense();
  const { data: today } = useMyTodayExpenses();

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");

  const amount = Number(amountStr.replace(/\D/g, ""));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount < 1) return;
    await addExpense.mutateAsync({
      amount,
      category,
      description: description.trim() || undefined,
    });
    setAmountStr("");
    setDescription("");
  };

  // Summa maydonida raqamlarni 10 000 ko'rinishida ajratib ko'rsatamiz
  const onAmountChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 12);
    setAmountStr(digits ? new Intl.NumberFormat("uz-UZ").format(Number(digits)) : "");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white text-[16px] flex items-center gap-2">
            <Wallet className="w-4.5 h-4.5 text-red-500" />
            Xarajat kiritish
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Kategoriya chiplari */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nimaga?</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border text-[13.5px] font-semibold transition-all",
                    category === c
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Summa */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Summa (so'm)</label>
            <input
              value={amountStr}
              onChange={(e) => onAmountChange(e.target.value)}
              inputMode="numeric"
              placeholder="50 000"
              className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Izoh */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Izoh (ixtiyoriy)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Masalan: benzin 10 litr"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={addExpense.isPending || !amount}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {addExpense.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Xarajatni saqlash
          </button>
        </form>

        {/* Bugungi xarajatlar — tekshirish uchun */}
        {today && today.data.length > 0 && (
          <div className="px-5 pb-5">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Bugungi xarajatlarim</p>
              <p className="text-[13px] font-bold text-red-600 dark:text-red-400 tabular-nums">{formatCurrency(today.total)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {today.data.map((x) => (
                <div key={x.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-gray-50/60 dark:bg-gray-800/30">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {x.category || "Xarajat"}
                      {(() => {
                        // "(haydovchi)" texnik belgisi — admin uchun; haydovchining o'ziga ko'rsatilmaydi
                        const d = (x.description || "").replace(/\s*\(haydovchi\)\s*$/, "").trim();
                        return d ? <span className="font-normal text-gray-400"> · {d}</span> : null;
                      })()}
                    </p>
                    <p className="text-[11px] text-gray-400">{formatDate(x.createdAt, "HH:mm")}</p>
                  </div>
                  <span className="text-[13px] font-bold text-red-600 dark:text-red-400 tabular-nums flex-none">
                    −{formatCurrency(Number(x.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
