"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
import { Customer } from "@/hooks/use-customers";

const schema = z.object({
  name: z.string().min(2, "Kamida 2 ta belgi"),
  phone: z.string().regex(/^\+998\d{9}$/, "Masalan: +998901234567"),
  phone2: z.string().regex(/^\+998\d{9}$/, "Noto'g'ri format").optional().or(z.literal("")),
  address: z.string().min(5, "Kamida 5 ta belgi"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<Customer>;
  onSubmit: (data: FormData) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  title: string;
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
      {...props}
    />
  );
}

export function CustomerForm({ defaultValues, onSubmit, onClose, isLoading, title }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name || "",
      phone: defaultValues?.phone || "",
      phone2: defaultValues?.phone2 || "",
      address: defaultValues?.address || "",
      notes: defaultValues?.notes || "",
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Ism familiya *" error={errors.name?.message}>
                <Input {...register("name")} placeholder="Alisher Nazarov" />
              </Field>
            </div>
            <Field label="Telefon *" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="+998901234567" type="tel" />
            </Field>
            <Field label="Qo'shimcha telefon" error={errors.phone2?.message}>
              <Input {...register("phone2")} placeholder="+998901234568" type="tel" />
            </Field>
            <div className="col-span-2">
              <Field label="Manzil *" error={errors.address?.message}>
                <Input {...register("address")} placeholder="Yunusobod 5-kv, 23-uy" />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Izoh" error={errors.notes?.message}>
                <textarea
                  {...register("notes")}
                  placeholder="Qo'shimcha ma'lumot..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </Field>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
