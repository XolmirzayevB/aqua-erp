"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Package, Archive } from "lucide-react";
import { useOpenSession } from "@/hooks/use-driver-sessions";

const schema = z.object({
  bottlesTaken: z.coerce.number().int().min(0),
  emptyTaken: z.coerce.number().int().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { driverId: string; driverName: string; onClose: () => void }

export function SessionOpenModal({ driverId, driverName, onClose }: Props) {
  const open = useOpenSession(driverId);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { bottlesTaken: 50, emptyTaken: 0 },
  });

  const onSubmit = async (data: FormData) => {
    await open.mutateAsync(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-base">🌅 Kun boshlash</h2>
            <p className="text-xs text-gray-500 mt-0.5">{driverName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  To'la butilka
                </div>
              </label>
              <input type="number" min={0} {...register("bottlesTaken")}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              {errors.bottlesTaken && <p className="mt-1 text-xs text-red-500">{errors.bottlesTaken.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Archive className="w-3.5 h-3.5 text-orange-500" />
                  Bo'sh tara
                </div>
              </label>
              <input type="number" min={0} {...register("emptyTaken")}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
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
            <button type="submit" disabled={open.isPending} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {open.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "🚀"}
              Boshlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
