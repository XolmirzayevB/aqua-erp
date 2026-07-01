"use client";

import { useForm, Controller } from "react-hook-form";
import { PhoneInput } from "@/components/shared/phone-input";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { X, Loader2, Eye, EyeOff } from "lucide-react";
import { User } from "@/hooks/use-users";
import { ROLE_LABELS, Role } from "@aqua/shared";

const schema = z.object({
  name: z.string().min(2, "Kamida 2 ta belgi"),
  phone: z.string().regex(/^\+998\d{9}$/, "Masalan: +998901234567"),
  password: z.string().min(6, "Kamida 6 ta belgi").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MANAGER", "OPERATOR", "DRIVER"]),
});

type FormData = z.infer<typeof schema>;

interface Props {
  user?: User;
  onSubmit: (data: FormData) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export function UserForm({ user, onSubmit, onClose, isLoading }: Props) {
  const [showPass, setShowPass] = useState(false);
  const isEdit = !!user;

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(isEdit ? schema : schema.extend({ password: z.string().min(6) })),
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "+998",
      role: user?.role || "OPERATOR",
      password: "",
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">
            {isEdit ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ism familiya *</label>
            <input {...register("name")} placeholder="Dilshod Karimov"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Telefon *</label>
            <Controller name="phone" control={control} render={({ field }) => (
              <PhoneInput value={field.value} onChange={field.onChange}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            )} />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rol *</label>
            <div className="grid grid-cols-2 gap-2">
              {(["ADMIN", "MANAGER", "OPERATOR", "DRIVER"] as const).map((r) => (
                <label key={r} className="cursor-pointer">
                  <input type="radio" value={r} {...register("role")} className="peer sr-only" />
                  <div className="py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/40 peer-checked:text-blue-700 dark:peer-checked:text-blue-400 transition-all hover:border-gray-300">
                    {ROLE_LABELS[r as Role]}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Parol {isEdit ? "(o'zgartirish uchun)" : "*"}
            </label>
            <div className="relative">
              <input
                {...register("password")}
                type={showPass ? "text" : "password"}
                placeholder={isEdit ? "Bo'sh qoldiring..." : "Kamida 6 ta belgi"}
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Bekor
            </button>
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
