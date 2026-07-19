"use client";

// Xarajat kiritish oynasi (mobil-birinchi).
// - Haydovchi: o'z NAQD balansidan (sodda ko'rinish).
// - Operator/Admin (2026-07-19, egasi so'rovi): xarajat KIMNING PULIDAN
//   ketishini tanlaydi — o'zining naqd/kliki YOKI haydovchining puli
//   (haydovchi "o'zim yozmayman, operatorga aytaman" degan).
// Pul tanlangan balansdan AYIRILADI; balansda yetarli bo'lmasa xato chiqadi.
// Moliya bo'limiga EXPENSE tranzaksiya bo'lib tushadi (foydaga ta'sir qiladi).

import { useState } from "react";
import { X, Loader2, Wallet, Banknote, CreditCard, ChevronDown } from "lucide-react";
import { useAddExpense, useMyTodayExpenses } from "@/hooks/use-finance";
import { useBalances } from "@/hooks/use-balances";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/store/auth.store";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const CATEGORIES = ["Yoqilg'i", "Ovqat", "Ta'mirlash", "Boshqa"];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  OPERATOR: "Operator",
  DRIVER: "Haydovchi",
};

export function DriverExpenseModal({ onClose }: { onClose: () => void }) {
  const addExpense = useAddExpense();
  const { data: today } = useMyTodayExpenses();
  const { isDriver, isAdmin } = usePermissions();
  const me = useAuthStore((s) => s.user);
  const { data: balances } = useBalances();

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  // Pul manbasi: kimning balansidan (default — o'zim) va naqd/klik
  const [sourceUserId, setSourceUserId] = useState("");
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");

  const amount = Number(amountStr.replace(/\D/g, ""));

  const workers = balances?.data || [];
  const mine = workers.find((w) => w.id === me?.id);
  // Operator: o'zi + haydovchilar; Admin: hamma. Haydovchida tanlov yo'q.
  const sourceOptions = isDriver
    ? []
    : workers.filter((w) => w.id === me?.id || isAdmin || w.role === "DRIVER");
  const source = sourceUserId
    ? workers.find((w) => w.id === sourceUserId)
    : mine;
  const available = Number(
    (method === "CASH" ? source?.cashBalance : source?.clickBalance) ?? 0,
  );
  const overBudget = !!source && amount > available;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount < 1 || addExpense.isPending || overBudget) return;
    await addExpense.mutateAsync({
      amount,
      category,
      description: description.trim() || undefined,
      paymentMethod: method,
      sourceUserId: sourceUserId || undefined,
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
          {/* Kimning pulidan? — operator/admin tanlaydi (haydovchida ko'rinmaydi) */}
          {!isDriver && sourceOptions.length > 0 && (
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Kimning pulidan?</label>
              <div className="relative">
                <select
                  value={sourceUserId}
                  onChange={(e) => setSourceUserId(e.target.value)}
                  className="w-full h-[46px] px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-semibold appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">Mening pulimdan</option>
                  {sourceOptions
                    .filter((w) => w.id !== me?.id)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({ROLE_LABELS[w.role] || w.role})
                      </option>
                    ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Naqd yoki Klik — tanlangan odamning ikkala balansi ko'rinib turadi */}
          {!isDriver && source && (
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Qaysi puldan?</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: "CASH", label: "Naqd", icon: Banknote, bal: Number(source.cashBalance ?? 0), active: "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400" },
                  { v: "CARD", label: "Klik", icon: CreditCard, bal: Number(source.clickBalance ?? 0), active: "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" },
                ] as const).map((o) => (
                  <button key={o.v} type="button" onClick={() => setMethod(o.v)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border-2 text-left transition-all",
                      method === o.v ? o.active : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                    )}>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold">
                      <o.icon className="w-4 h-4" /> {o.label}
                    </span>
                    <span className="block text-[11.5px] mt-0.5 tabular-nums opacity-80">
                      bor: {formatCurrency(o.bal)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Haydovchiga — o'z naqd balansi shunchaki ko'rinib turadi */}
          {isDriver && mine && (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-green-50/70 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20">
              <span className="text-[13px] font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <Banknote className="w-4 h-4" /> Qo'limdagi naqd
              </span>
              <span className="text-[14px] font-bold tabular-nums text-gray-900 dark:text-white">
                {formatCurrency(Number(mine.cashBalance ?? 0))}
              </span>
            </div>
          )}

          {/* Kategoriya: tez tanlash chiplari YOKI o'zi qo'lda yozadi
              (masalan "dori" — egasi so'rovi bilan erkin matn qo'shildi) */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nimaga?</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
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
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="yoki o'zingiz yozing: dori, moyka..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
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
            {overBudget && !isDriver && (
              <p className="mt-1.5 text-[12.5px] font-medium text-red-500">
                {source?.id === me?.id ? "Balansingizda" : `${source?.name} balansida`} buncha {method === "CASH" ? "naqd" : "klik"} pul yo'q (bor: {formatCurrency(available)})
              </p>
            )}
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
            disabled={addExpense.isPending || !amount || (overBudget && !isDriver)}
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
