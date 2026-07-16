"use client";

import { useRouter } from "next/navigation";
import { Bell, Sun, Moon, LogOut, Search, Menu, Droplet, Calendar } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { formatDate } from "@/lib/utils";

// Dizayn: 40px, radius 11, hoshiyali icon tugma
const iconBtn =
  "w-10 h-10 rounded-[11px] flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      // refreshToken yuboriladi — serverda FAQAT shu qurilma sessiyasi o'chadi
      // (bir hisob bilan boshqa qurilmada kirgan odam chiqib ketmaydi)
      await api.post("/auth/logout", {
        refreshToken: useAuthStore.getState().refreshToken,
      });
    } catch {}
    logout();
    toast.success("Tizimdan chiqildi");
    // replace — chiqib bo'lgach orqaga bosib dashboard'ga qaytib bo'lmaydi
    router.replace("/login");
  };

  return (
    <header className="h-16 sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-4 md:px-7 flex items-center justify-between flex-shrink-0 gap-3">
      {/* Chap: menyu (mobil) + sana chipi */}
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick} aria-label="Menyu" className={`md:hidden flex-shrink-0 ${iconBtn}`}>
          <Menu className="w-[19px] h-[19px]" />
        </button>
        {/* Mobil logo */}
        <div className="md:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-rose-400 flex items-center justify-center">
            <Droplet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">AquaERP</span>
        </div>
        {/* Sana chipi — faqat katta ekranda */}
        <div className="hidden md:flex items-center gap-2 h-10 px-3 rounded-[11px] bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
          <Calendar className="w-[15px] h-[15px] text-gray-500 dark:text-gray-400" />
          <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatDate(new Date(), "d-MMMM, yyyy")}
          </span>
        </div>
      </div>

      {/* O'ng: qidiruv + tugmalar + user */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden lg:flex items-center gap-2 w-[300px] h-10 px-3 rounded-[11px] bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-900 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all">
          <Search className="w-4 h-4 text-gray-400 flex-none" />
          <input
            type="search"
            placeholder="Qidirish…"
            className="bg-transparent text-[13.5px] text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none w-full"
          />
          <kbd className="text-[11px] font-semibold text-gray-400 border border-gray-100 dark:border-gray-700 rounded-md px-1.5 py-px flex-none">
            ⌘K
          </kbd>
        </div>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Mavzuni almashtirish"
          className={iconBtn}
        >
          {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>

        <button aria-label="Bildirishnomalar" className={`relative ${iconBtn}`}>
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2.5 w-[7px] h-[7px] bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
        </button>

        <div className="hidden sm:block w-px h-[26px] bg-gray-100 dark:bg-gray-800 mx-1" />

        {/* User chip */}
        {user && (
          <div className="hidden sm:flex items-center gap-2.5 h-10 pl-1 pr-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <span className="w-8 h-8 rounded-[9px] bg-blue-600 text-white text-[12.5px] font-bold flex items-center justify-center flex-none">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden md:block text-left">
              <span className="block text-[12.5px] font-semibold text-gray-900 dark:text-white leading-tight">
                {user.name.split(" ")[0]}
              </span>
              <span className="block text-[10.5px] text-gray-400 dark:text-gray-500">{user.role}</span>
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          aria-label="Chiqish"
          title="Chiqish"
          className={`${iconBtn} hover:!bg-red-50 dark:hover:!bg-red-500/10 hover:!text-red-500`}
        >
          <LogOut className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}
