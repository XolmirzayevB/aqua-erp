"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useCreateDriver } from "@/hooks/use-driver-sessions";

const schema = z.object({
  name: z.string().min(2, "Kamida 2 ta belgi"),
  phone: z.string().regex(/^\+998\d{9}$/, "Masalan: +998901234570"),
  password: z.string().min(6, "Kamida 6 ta belgi"),
  vehicle: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { onClose: () => void }

export function DriverForm({ onClose }: Props) {
  const [showPass, setShowPass] = useState(false);
  const create = useCreateDriver();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "+998" },
  });

  const onSubmit = async (data: FormData) => {
    await create.mutateAsync(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">Yangi haydovchi</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {[
            { name: "name", label: "Ism familiya *", placeholder: "Jasur Toshmatov", type: "text" },
            { name: "phone", label: "Telefon *", placeholder: "+998901234570", type: "tel" },
            { name: "vehicle", label: "Mashina (ixtiyoriy)", placeholder: "Nexia 3 — 01A123BC", type: "text" },
          ].map(({ name, label, placeholder, type }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                {...register(name as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {(errors as any)[name] && <p className="mt-1 text-xs text-red-500">{(errors as any)[name].message}</p>}
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Parol *</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Kamida 6 ta belgi"
                {...register("password")}
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Bekor
            </button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Qo'shish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
