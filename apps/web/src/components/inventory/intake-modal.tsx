"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, PackagePlus } from "lucide-react";
import { useInventoryIntake, useInventorySetWarehouse } from "@/hooks/use-inventory";
import { cn } from "@/lib/utils";

const schema = z.object({
  quantity: z.coerce.number().int().min(0, "0 dan katta"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// mode "set" — ombordagi aniq sonni belgilash (boshlang'ich); "add" — ustiga qo'shish
export function IntakeModal({ current = 0, onClose }: { current?: number; onClose: () => void }) {
  const [mode, setMode] = useState<"set" | "add">("set");
  const intake = useInventoryIntake();
  const setWarehouse = useInventorySetWarehouse();
  const pending = intake.isPending || setWarehouse.isPending;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: mode === "set" ? current : 0 },
  });

  const onSubmit = async (data: FormData) => {
    if (mode === "set") {
      await setWarehouse.mutateAsync({ quantity: data.quantity, description: data.description });
    } else {
      if (data.quantity < 1) return;
      await intake.mutateAsync({ quantity: data.quantity, description: data.description });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-base">Ombordagi bo'sh tara</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rejim: aniq son / ustiga qo'shish */}
        <div className="flex gap-1 p-1 mx-5 mt-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {[
            { v: "set" as const, label: "Aniq sonni belgilash" },
            { v: "add" as const, label: "Ustiga qo'shish" },
          ].map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setMode(t.v)}
              className={cn(
                "flex-1 py-2 text-[13px] font-semibold rounded-lg transition-colors",
                mode === t.v
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {mode === "set" ? "Omborda hozir nechta bo'sh tara bor?" : "Necha ta tara qo'shilsin?"}
            </label>
            <input type="number" min={0} {...register("quantity")} autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>}
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              {mode === "set"
                ? `Boshlash uchun ombordagi jami bo'sh tara sonini kiriting (hozir: ${current} ta)`
                : "Yetkazib beruvchidan yangi tara sotib olsangiz — shu yerga qo'shing"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Izoh</label>
            <input type="text" {...register("description")} placeholder={mode === "set" ? "Masalan: boshlang'ich zaxira" : "Masalan: 100 ta yangi tara olindi"}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Bekor</button>
            <button type="submit" disabled={pending} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === "set" ? "Belgilash" : "Qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
