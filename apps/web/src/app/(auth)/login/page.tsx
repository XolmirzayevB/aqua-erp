"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Droplet, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { PhoneInput } from "@/components/shared/phone-input";
import { InstallPWA } from "@/components/shared/install-pwa";

const loginSchema = z.object({
  phone: z
    .string()
    .regex(/^\+998\d{9}$/, "Masalan: +998901234567"),
  password: z.string().min(6, "Kamida 6 ta belgi"),
});

type LoginForm = z.infer<typeof loginSchema>;

// Dizayn (AquaERP.dc.html) input uslubi: surface-2 fon, radius 11, fokusda ring
const inputCls =
  "w-full px-4 py-3 rounded-[11px] border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-900 transition-all text-sm";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { phone: "", password: "" } });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const res = await api.post("/auth/login", data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Xush kelibsiz, ${user.name}!`);
      router.push(
        user.role === "DRIVER" ? "/orders"
        : user.role === "OPERATOR" ? "/customers"
        : "/"
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message?.[0] || "Telefon yoki parol noto'g'ri";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white mb-4 shadow-glow">
            <Droplet className="w-8 h-8" />
          </div>
          <h1 className="text-[30px] font-bold text-gray-900 dark:text-white tracking-tight">
            AquaERP
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            19L yetkazib berish boshqaruv tizimi
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-panel border border-gray-100 dark:border-gray-800 p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 tracking-tight">
            Tizimga kirish
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Telefon raqam va parolni kiriting
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Phone */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Telefon raqam
              </label>
              <Controller name="phone" control={control} render={({ field }) => (
                <PhoneInput value={field.value} onChange={field.onChange} className={inputCls} />
              )} />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Parol
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[46px] px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-glow mt-2 cursor-pointer hover:-translate-y-px"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kirilmoqda...
                </>
              ) : (
                "Kirish"
              )}
            </button>
          </form>
        </div>

        {/* PWA install */}
        <div className="mt-4">
          <InstallPWA />
        </div>

        {/* Test accounts hint */}
        <div className="mt-6 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-card">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
            Test hisoblar:
          </p>
          <div className="space-y-1">
            {[
              { role: "Admin", phone: "+998901234567", pass: "Admin@123" },
              { role: "Haydovchi", phone: "+998901234570", pass: "Driver@123" },
            ].map((acc) => (
              <p key={acc.role} className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {acc.role}: {acc.phone} / {acc.pass}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
