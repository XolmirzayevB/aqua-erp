"use client";

import { useState } from "react";
import { X, Loader2, AlertTriangle, PackageX } from "lucide-react";
import { useInventoryMove } from "@/hooks/use-inventory";

export function MoveStockModal({ emptyCount, onClose }: { emptyCount: number; onClose: () => void }) {
  const [destination, setDestination] = useState<"BROKEN" | "LOST">("BROKEN");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");
  const move = useInventoryMove();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return;
    await move.mutateAsync({ destination, quantity: qty, description });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <PackageX className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-base">Tara o'tkazish</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Mavjud bo'sh tara: <span className="font-bold">{emptyCount} ta</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Qayerga o'tkazish</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "BROKEN", label: "🔨 Singan" },
                { value: "LOST", label: "❓ Yo'qolgan" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDestination(value as any)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    destination === value
                      ? "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Soni *</label>
            <input
              type="number" min={1} max={emptyCount} value={quantity}
              onChange={(e) => setQuantity(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Izoh</label>
            <input
              type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sabab..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Bekor
            </button>
            <button type="submit" disabled={move.isPending} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {move.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              O'tkazish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
