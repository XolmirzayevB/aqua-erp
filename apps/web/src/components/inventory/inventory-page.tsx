"use client";

import { useState } from "react";
import {
  Package, Archive, Hammer, HelpCircle, PackagePlus,
  PackageX, ArrowDownCircle, ArrowUpCircle, RefreshCw,
  ChevronLeft, ChevronRight, History,
} from "lucide-react";
import { useInventory, useInventoryHistory } from "@/hooks/use-inventory";
import { IntakeModal } from "./intake-modal";
import { MoveStockModal } from "./move-stock-modal";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  FULL_BOTTLE:   { label: "To'la butilka", icon: Package, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
  EMPTY_BOTTLE:  { label: "Bo'sh tara", icon: Archive, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
  BROKEN_BOTTLE: { label: "Singan tara", icon: Hammer, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
  LOST_BOTTLE:   { label: "Yo'qolgan tara", icon: HelpCircle, color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800" },
};

const ACTION_LABELS: Record<string, string> = {
  INTAKE: "Qabul",
  DELIVERY: "Yetkazib berish",
  RETURN: "Qaytarish",
  ADJUSTMENT: "Tuzatish",
  BROKEN: "Singan",
  LOST: "Yo'qolgan",
};

export function InventoryPage() {
  const [showIntake, setShowIntake] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const { data: inv, isLoading, refetch } = useInventory();
  const { data: history } = useInventoryHistory(historyPage);

  const cards = [
    { type: "FULL_BOTTLE", value: inv?.fullBottles ?? 0 },
    { type: "EMPTY_BOTTLE", value: inv?.emptyBottles ?? 0 },
    { type: "BROKEN_BOTTLE", value: inv?.brokenBottles ?? 0 },
    { type: "LOST_BOTTLE", value: inv?.lostBottles ?? 0 },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Ombor</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Jami aylanma tara: {inv ? inv.totalBottles : "—"} ta
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowMove(true)} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <PackageX className="w-4 h-4" />
            Singan/Yo'qolgan
          </button>
          <button onClick={() => setShowIntake(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-blue-200 dark:shadow-blue-900/30">
            <PackagePlus className="w-4 h-4" />
            Qabul qilish
          </button>
        </div>
      </div>

      {/* Soddalashtirilgan: Omborda / Mijozlarda / Jami */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-600 rounded-2xl p-5 text-white">
          <Package className="w-7 h-7 mb-2 opacity-80" />
          <p className="text-4xl font-bold">{isLoading ? "—" : inv?.warehouseBottles ?? 0}</p>
          <p className="text-sm text-blue-100 mt-1">Omborda tara</p>
        </div>
        <div className="bg-green-600 rounded-2xl p-5 text-white">
          <Archive className="w-7 h-7 mb-2 opacity-80" />
          <p className="text-4xl font-bold">{isLoading ? "—" : inv?.customerBottles ?? 0}</p>
          <p className="text-sm text-green-100 mt-1">Mijozlarda tara</p>
        </div>
        <div className="bg-gray-800 dark:bg-gray-700 rounded-2xl p-5 text-white">
          <RefreshCw className="w-7 h-7 mb-2 opacity-80" />
          <p className="text-4xl font-bold">{isLoading ? "—" : inv?.totalCirculation ?? 0}</p>
          <p className="text-sm text-gray-300 mt-1">Jami aylanmadagi tara</p>
        </div>
      </div>

      {/* Batafsil (to'la/bo'sh/singan/yo'qolgan) */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Ombor tafsiloti</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ type, value }) => {
          const meta = TYPE_META[type];
          return (
            <div key={type} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-3", meta.bg)}>
                <meta.icon className={cn("w-5 h-5", meta.color)} />
              </div>
              <p className={cn("text-3xl font-bold", isLoading ? "animate-pulse text-gray-300" : "text-gray-900 dark:text-white")}>
                {isLoading ? "—" : value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{meta.label}</p>
            </div>
          );
        })}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl px-4 py-3 flex items-start gap-2">
        <Package className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <strong>Avtomatik hisob:</strong> Haydovchi kun boshlaganda butilkalar ombordan chiqadi, kun yopilganda
          sotilmagan butilkalar va qaytarilgan taralar omborga qaytadi. Bu yerda faqat qo'lda qabul va tuzatishlar qilinadi.
        </p>
      </div>

      {/* History */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <History className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Harakatlar tarixi</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              {["Tur", "Amal", "Miqdor", "Izoh", "Sana"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!history?.data?.length ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">Harakatlar yo'q</td></tr>
            ) : history.data.map((action) => {
              const meta = TYPE_META[action.inventory.type];
              const isPositive = action.quantity > 0;
              return (
                <tr key={action.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-5 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full", meta?.bg, meta?.color)}>
                      <meta.icon className="w-3 h-3" />
                      {meta?.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs">{ACTION_LABELS[action.actionType] || action.actionType}</td>
                  <td className="px-5 py-3">
                    <span className={cn("inline-flex items-center gap-1 font-semibold", isPositive ? "text-green-600 dark:text-green-400" : "text-red-500")}>
                      {isPositive ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                      {isPositive ? "+" : ""}{action.quantity}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">{action.description || "—"}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(action.createdAt, "dd.MM.yyyy HH:mm")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {history?.meta && history.meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(historyPage - 1) * history.meta.limit + 1}–{Math.min(historyPage * history.meta.limit, history.meta.total)} / {history.meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setHistoryPage(historyPage - 1)} disabled={historyPage <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs text-gray-500">{historyPage} / {history.meta.totalPages}</span>
              <button onClick={() => setHistoryPage(historyPage + 1)} disabled={historyPage >= history.meta.totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showIntake && <IntakeModal onClose={() => setShowIntake(false)} />}
      {showMove && <MoveStockModal emptyCount={inv?.emptyBottles ?? 0} onClose={() => setShowMove(false)} />}
    </div>
  );
}
