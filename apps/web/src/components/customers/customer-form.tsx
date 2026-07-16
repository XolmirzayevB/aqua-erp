"use client";

// Mijoz qo'shish/tahrirlash — KATTA, ochiq dizayn (egasi mockup'i asosida, 2026-07-13).
// - Hudud: dropdown, tepasida "Hudud" yozuvi, variantlar FAQAT hudud nomi (A, B...).
// - "Daftardan ko'chirish" (mijozdagi tara) — alohida ajralib turadigan panel, stepper bilan.
// - Katta maydonlar, qizil (brend) primary tugma.

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X, MapPin, UserPlus, ChevronDown, Minus, Plus, NotebookPen, Check } from "lucide-react";
import { Customer } from "@/hooks/use-customers";
import { useSettings } from "@/hooks/use-settings";
import { PhoneInput } from "@/components/shared/phone-input";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Kamida 2 ta belgi"),
  phone: z.string().regex(/^\+998\d{9}$/, "To'liq raqam kiriting"),
  // Qo'shimcha telefon — ixtiyoriy: bo'sh yoki faqat "+998" bo'lsa ham qabul qilinadi
  phone2: z.string().optional().refine(
    (v) => !v || v === "+998" || /^\+998\d{9}$/.test(v),
    "To'liq raqam kiriting yoki bo'sh qoldiring"
  ),
  zone: z.string().optional().or(z.literal("")),
  // Mijoz turi: tez tanlash (Uy/Do'kon/Ofis) yoki qo'lda erkin matn
  customerType: z.string().max(60).optional().or(z.literal("")),
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

// Katta input uslubi (buyurtma formasi bilan bir xil)
const bigInput =
  "w-full h-[52px] px-4 rounded-[14px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-[15px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:bg-white dark:focus:bg-gray-900 transition-all";

const label15 = "block text-[14.5px] font-semibold text-gray-800 dark:text-gray-200 mb-2";

function Field({ label, error, hint, optional, children }: {
  label: string; error?: string; hint?: string; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className={label15}>
        {label}{optional && <span className="font-normal text-gray-400"> (ixtiyoriy)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-[12.5px] text-gray-400">{hint}</p>}
      {error && <p className="mt-1.5 text-[12.5px] font-medium text-red-500">{error}</p>}
    </div>
  );
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
      customerType: defaultValues?.customerType || "",
      address: defaultValues?.address || "",
      locationLink: defaultValues?.locationLink || "",
      bottlesOwned: defaultValues?.bottlesOwned ?? 0,
      notes: defaultValues?.notes || "",
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-t-[20px] md:rounded-[20px] shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[94vh] overflow-y-auto">
        {/* Sarlavha — ikonka tile + nom */}
        <div className="flex items-center gap-3.5 px-6 md:px-7 py-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-20">
          <div className="w-11 h-11 rounded-[13px] bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center flex-none">
            <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[19px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">{title}</h2>
            <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5">Ism, telefon va hududni kiriting</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-none">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => onSubmit({ ...data, phone2: data.phone2 && /^\+998\d{9}$/.test(data.phone2) ? data.phone2 : "" }))}
          className="px-6 md:px-7 py-6 space-y-5"
        >
          <Field label="Ism familiya" error={errors.name?.message}>
            <input {...register("name")} placeholder="Alisher Nazarov" className={bigInput} />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Telefon" error={errors.phone?.message}>
              <Controller name="phone" control={control} render={({ field }) => (
                <PhoneInput value={field.value} onChange={field.onChange} className={bigInput} />
              )} />
            </Field>
            <Field label="Qo'shimcha telefon" optional error={errors.phone2?.message}>
              <Controller name="phone2" control={control} render={({ field }) => (
                <PhoneInput value={field.value || ""} onChange={field.onChange} className={bigInput} />
              )} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hudud — dropdown, variantlar faqat hudud nomi */}
            <Field label="Hudud" error={errors.zone?.message}>
              <Controller name="zone" control={control} render={({ field }) => (
                <div className="relative">
                  <select
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    className={cn(bigInput, "appearance-none pr-10 cursor-pointer")}
                  >
                    <option value="">Tanlanmagan</option>
                    {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                  <ChevronDown className="w-[18px] h-[18px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )} />
            </Field>

            <Field label="Manzil" error={errors.address?.message}>
              <input {...register("address")} placeholder="5-kvartal, 23-uy" className={bigInput} />
            </Field>
          </div>

          {/* Mijoz turi — tez tanlash chiplari + qo'lda yozish (egasi so'rovi 2026-07-16) */}
          <Controller name="customerType" control={control} render={({ field }) => (
            <Field label="Nima uchun oladi?" optional>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {["Uy", "Do'kon", "Ofis"].map((t) => (
                  <button key={t} type="button" onClick={() => field.onChange(field.value === t ? "" : t)}
                    className={cn(
                      "h-10 px-4 rounded-[11px] border-2 text-[13.5px] font-semibold transition-all",
                      field.value === t
                        ? "border-blue-500/70 bg-blue-50/60 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
                        : "border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700"
                    )}>
                    {t}
                  </button>
                ))}
              </div>
              <input
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder="yoki o'zingiz yozing: maktab, oshxona..."
                className={bigInput}
              />
            </Field>
          )} />

          {/* Daftardan ko'chirish — ajralib turadigan panel + stepper */}
          <Controller name="bottlesOwned" control={control} render={({ field }) => {
            const val = Number(field.value) || 0;
            return (
              <div className={cn(
                "rounded-2xl border p-4 transition-colors",
                val > 0
                  ? "border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5"
                  : "border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40"
              )}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-[11px] bg-amber-100/70 dark:bg-amber-500/15 flex items-center justify-center flex-none">
                    <NotebookPen className="w-[18px] h-[18px] text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-[14.5px] font-semibold text-gray-800 dark:text-gray-200">Mijozdagi tara (daftardan)</p>
                    <p className="text-[12.5px] text-gray-400 mt-0.5">Daftardan ko'chirayotganda — mijozda allaqachon nechta tara bo'lsa. Yangi mijozga 0.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <button type="button" onClick={() => field.onChange(Math.max(0, val - 1))}
                      disabled={val <= 0}
                      className="w-11 h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-40">
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      inputMode="numeric"
                      value={val}
                      onChange={(e) => field.onChange(Math.max(0, parseInt(e.target.value.replace(/\D/g, "")) || 0))}
                      className="w-16 h-11 text-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[19px] font-bold tabular-nums focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all"
                    />
                    <button type="button" onClick={() => field.onChange(val + 1)}
                      className="w-11 h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          }} />

          <Field
            label="Lokatsiya havolasi"
            optional
            error={errors.locationLink?.message}
            hint="Telefonda joylashuvni ulashib, havolani shu yerga qo'ying — haydovchi bosib boradi"
          >
            <div className="relative">
              <MapPin className="w-[18px] h-[18px] text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input {...register("locationLink")} placeholder="https://maps.google.com/..." className={cn(bigInput, "pl-11")} />
            </div>
          </Field>

          <Field label="Izoh" optional error={errors.notes?.message}>
            <textarea {...register("notes")} placeholder="Qo'shimcha ma'lumot..." rows={2}
              className="w-full px-4 py-3.5 rounded-[14px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-[15px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:bg-white dark:focus:bg-gray-900 transition-all resize-none" />
          </Field>

          {/* Tugmalar — o'ngda */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="h-[52px] px-6 rounded-[14px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-[15px] font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Bekor qilish
            </button>
            <button type="submit" disabled={isLoading}
              className="h-[52px] px-6 rounded-[14px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[15px] font-semibold shadow-glow transition-all hover:-translate-y-px disabled:hover:translate-y-0 flex items-center gap-2">
              {isLoading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Check className="w-[18px] h-[18px]" />}
              Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
