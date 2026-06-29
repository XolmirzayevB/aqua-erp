"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Banknote, CreditCard } from "lucide-react";
import { useCreateTransaction } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "SALARY", "SUPPLIER_PAYMENT"]),
  amount: z.coerce.number().min(1, "Summa kiriting"),
  paymentMethod: z.enum(["CASH", "CARD"]),
  category: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const TYPE_OPTIONS = [
  { value: "INCOME", label: "Kirim", emoji: "📥", color: "green" },
  { value: "EXPENSE", label: "Xarajat", emoji: "📤", color: "red" },
  { value: "SALARY", label: "Ish haqi", emoji: "👤", color: "purple" },
  { value: "SUPPLIER_PAYMENT", label: "Yetkazib beruvchi", emoji: "🏭", color: "orange" },
];

const COMMON_CATEGORIES: Record<string, string[]> = {
  INCOME: ["Suv sotuvi", "Boshqa"],
  EXPENSE: ["Yoqilg'i", "Ta'mirlash", "Ijara", "Kommunal", "Boshqa"],
  SALARY: ["Haydovchi", "Operator", "Menejer", "Boshqa"],
  SUPPLIER_PAYMENT: ["Suv xaridi", "Tara xaridi", "Boshqa"],
};

export function TransactionModal({ onClose }: { onClose: () => void }) {
  const create = useCreateTransaction();
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "EXPENSE", paymentMethod: "CASH" },
  });

  const type = watch("type");
  const amount = watch("amount") || 0;

  const onSubmit = async (data: FormData) => {
    await create.mutateAsync(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">Yangi tranzaksiya</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Turi *</label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { field.onChange(opt.value); setValue("category", ""); }}
                      className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                        field.value === opt.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Summa (so'm) *</label>
            <input type="number" min={1} {...register("amount")} placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            {amount > 0 && <p className="mt-1 text-xs text-gray-400">{formatCurrency(amount)}</p>}
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">To'lov turi</label>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "CASH", label: "Naqd", icon: Banknote },
                    { value: "CARD", label: "Karta", icon: CreditCard },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        field.value === value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kategoriya</label>
            <input list="categories" {...register("category")} placeholder="Tanlang yoki yozing..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            <datalist id="categories">
              {(COMMON_CATEGORIES[type] || []).map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Izoh</label>
            <textarea {...register("description")} rows={2} placeholder="Qo'shimcha ma'lumot..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Bekor
            </button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
