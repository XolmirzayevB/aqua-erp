"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X, MapPin } from "lucide-react";
import { Customer } from "@/hooks/use-customers";
import { useSettings } from "@/hooks/use-settings";
import { PhoneInput } from "@/components/shared/phone-input";

const schema = z.object({
  name: z.string().min(2, "Kamida 2 ta belgi"),
  phone: z.string().regex(/^\+998\d{9}$/, "To'liq raqam kiriting"),
  // Qo'shimcha telefon — ixtiyoriy: bo'sh yoki faqat "+998" bo'lsa ham qabul qilinadi
  phone2: z.string().optional().refine(
    (v) => !v || v === "+998" || /^\+998\d{9}$/.test(v),
    "To'liq raqam kiriting yoki bo'sh qoldiring"
  ),
  zone: z.string().optional().or(z.literal("")),
  address: z.string().min(3, "Manzil kiriting"),
  locationLink: z.string().url("Havola noto'g'ri").optional().or(z.literal("")),
  bottlesOwned: z.coerce.number().int().min(0).default(0),
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputCls} ${className}`} {...props} />;
}

export function CustomerForm({ defaultValues, onSubmit, onClose, isLoading, title }: Props) {
  const { data: settings } = useSettings();
  const zones = settings?.zones || ["A", "B", "C", "D", "G"];

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name || "",
      phone: defaultValues?.phone || "",
      phone2: defaultValues?.phone2 || "",
      zone: defaultValues?.zone || "",
      address: defaultValues?.address || "",
      locationLink: defaultValues?.locationLink || "",
      bottlesOwned: defaultValues?.bottlesOwned ?? 0,
      notes: defaultValues?.notes || "",
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => onSubmit({ ...data, phone2: data.phone2 && /^\+998\d{9}$/.test(data.phone2) ? data.phone2 : "" }))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Ism familiya *" error={errors.name?.message}>
                <Input {...register("name")} placeholder="Alisher Nazarov" />
              </Field>
            </div>
            <Field label="Telefon *" error={errors.phone?.message}>
              <Controller name="phone" control={control} render={({ field }) => (
                <PhoneInput value={field.value} onChange={field.onChange} className={inputCls} />
              )} />
            </Field>
            <Field label="Qo'shimcha telefon (ixtiyoriy)" error={errors.phone2?.message}>
              <Controller name="phone2" control={control} render={({ field }) => (
                <PhoneInput value={field.value || ""} onChange={field.onChange} className={inputCls} />
              )} />
            </Field>

            {/* Zone selector */}
            <div className="col-span-2">
              <Field label="Hudud" error={errors.zone?.message}>
                <Controller name="zone" control={control} render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {zones.map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => field.onChange(field.value === z ? "" : z)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                          field.value === z
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        Hudud {z}
                      </button>
                    ))}
                  </div>
                )} />
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Manzil *" error={errors.address?.message}>
                <Input {...register("address")} placeholder="5-kvartal, 23-uy" />
              </Field>
            </div>

            {/* Existing bottles (paper migration) */}
            <div className="col-span-2">
              <Field label="Mijozdagi tara soni" error={errors.bottlesOwned?.message}>
                <Input {...register("bottlesOwned")} type="number" min={0} placeholder="0" />
                <p className="text-xs text-gray-400 mt-1">Agar mijozda allaqachon tara bo'lsa (daftardan ko'chirayotganda) — shu yerga yozing. Yangi mijoz uchun 0 qoldiring.</p>
              </Field>
            </div>

            {/* Location link */}
            <div className="col-span-2">
              <Field label="Lokatsiya havolasi (Google Maps)" error={errors.locationLink?.message}>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input {...register("locationLink")} placeholder="https://maps.google.com/..." className="pl-9" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Telefonда joylashuvni ulashib, havolani shu yerga qo'ying — haydovchi bosib boradi</p>
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Izoh" error={errors.notes?.message}>
                <textarea {...register("notes")} placeholder="Qo'shimcha ma'lumot..." rows={2} className={`${inputCls} resize-none`} />
              </Field>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Bekor qilish</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
