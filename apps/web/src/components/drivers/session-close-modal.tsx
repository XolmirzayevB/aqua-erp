"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Package, Archive, Banknote, CreditCard } from "lucide-react";
import { useCloseSession, DriverSession } from "@/hooks/use-driver-sessions";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
  bottlesSold: z.coerce.number().int().min(0),
  emptyReturned: z.coerce.number().int().min(0),
  cashCollected: z.coerce.number().min(0),
  cardCollected: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { driverId: string; driverName: string; session: DriverSession; onClose: () => void }

export function SessionCloseModal({ driverId, driverName, session, onClose }: Props) {
  const close = useCloseSession(driverId);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bottlesSold: session.bottlesTaken,
      emptyReturned: session.emptyTaken,
      cashCollected: 0,
      cardCollected: 0,
    },
  });

  const sold = watch("bottlesSold") || 0;
  const cash = watch("cashCollected") || 0;
  const card = watch("cardCollected") || 0;
  const unsold = Math.max(0, session.bottlesTaken - sold);

  const onSubmit = async (data: FormData) => {
    await close.mutateAsync(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-base">🌙 Kun yopish</h2>
            <p className="text-xs text-gray-500 mt-0.5">{driverName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Session info */}
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-blue-500 dark:text-blue-400">Olingan butilka</p>
              <p className="font-bold text-blue-800 dark:text-blue-300 text-base">{session.bottlesTaken} ta</p>
            </div>
            <div>
              <p className="text-blue-500 dark:text-blue-400">Olingan bo'sh tara</p>
              <p className="font-bold text-blue-800 dark:text-blue-300 text-base">{session.emptyTaken} ta</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-1.5">
                <Package className="w-3.5 h-3.5 text-green-500" /> Sotilgan butilka
              </label>
              <input type="number" min={0} max={session.bottlesTaken} {...register("bottlesSold")}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-green-500 transition-all" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-1.5">
                <Archive className="w-3.5 h-3.5 text-orange-500" /> Qaytarilgan tara
              </label>
              <input type="number" min={0} {...register("emptyReturned")}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-500" /> Naqd pul
              </label>
              <input type="number" min={0} {...register("cashCollected")} placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-500" /> Karta pul
              </label>
              <input type="number" min={0} {...register("cardCollected")} placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Sotilmagan butilka</span>
              <span className={unsold > 0 ? "text-orange-500 font-medium" : "text-gray-700 dark:text-gray-300"}>{unsold} ta qaytadi</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-1">
              <span className="text-gray-700 dark:text-gray-300">Jami topshiriq</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(Number(cash) + Number(card))}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Izoh</label>
            <input type="text" {...register("notes")} placeholder="Ixtiyoriy..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Bekor
            </button>
            <button type="submit" disabled={close.isPending} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {close.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "🌙"}
              Kun yopish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
