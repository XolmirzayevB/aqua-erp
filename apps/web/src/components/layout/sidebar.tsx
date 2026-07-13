"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ShoppingBag, Truck, Warehouse,
  Wallet, Coins, FileText, BarChart3, ScrollText, Settings, Droplet, Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { Role } from "@aqua/shared";

// Dizayn (AquaERP.dc.html) bo'yicha guruhlangan menyu
const NAV_GROUPS = [
  {
    title: "Asosiy",
    items: [
      { href: "/", label: "Boshqaruv paneli", icon: LayoutDashboard, roles: [Role.ADMIN, Role.MANAGER] },
      { href: "/customers", label: "Mijozlar", icon: Users, roles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR] },
      // Buyurtmalar: menejer ko'rmaydi (operator zakaz yozadi, haydovchi yetkazadi)
      { href: "/orders", label: "Buyurtmalar", icon: ShoppingBag, roles: [Role.ADMIN, Role.OPERATOR, Role.DRIVER] },
      // Marshrut xaritasi — haydovchining bugungi yo'nalishi
      { href: "/route", label: "Marshrut", icon: Map, roles: [Role.DRIVER] },
      // Haydovchilar: faqat admin (menejer ko'rmaydi)
      { href: "/drivers", label: "Haydovchilar", icon: Truck, roles: [Role.ADMIN] },
    ],
  },
  {
    title: "Ombor & Moliya",
    items: [
      { href: "/inventory", label: "Ombor", icon: Warehouse, roles: [Role.ADMIN, Role.MANAGER] },
      { href: "/finance", label: "Moliya", icon: Wallet, roles: [Role.ADMIN, Role.MANAGER] },
      { href: "/debts", label: "Qarzdorlik", icon: Coins, roles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.DRIVER] },
    ],
  },
  {
    title: "Hisobot",
    items: [
      { href: "/reports", label: "Hisobotlar", icon: FileText, roles: [Role.ADMIN, Role.MANAGER] },
      { href: "/analytics", label: "Tahlil", icon: BarChart3, roles: [Role.ADMIN, Role.MANAGER] },
    ],
  },
  {
    title: "Tizim",
    items: [
      { href: "/audit", label: "Audit jurnali", icon: ScrollText, roles: [Role.ADMIN] },
      { href: "/settings", label: "Sozlamalar", icon: Settings, roles: [Role.ADMIN] },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  MANAGER: "Menejer",
  OPERATOR: "Operator",
  DRIVER: "Haydovchi",
};

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => !user?.role || item.roles.includes(user.role as Role)),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Backdrop — faqat mobilda, ochiq bo'lsa */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden" onClick={onClose} />
      )}

      {/* Yorug' surface panel — dizayndagidek */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-[268px] md:w-[248px] flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col p-3 transition-transform duration-300 md:translate-x-0",
          open ? "translate-x-0 shadow-card-hover" : "-translate-x-full md:shadow-none"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 h-[52px]">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-glow flex-none">
            <Droplet className="w-[19px] h-[19px] text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">AquaERP</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">19L yetkazib berish</p>
          </div>
        </div>

        {/* Nav — guruhlangan */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1 mt-0.5">
          {groups.map((group) => (
            <div key={group.title} className="mb-1.5">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-500 px-3 pt-3 pb-1.5">
                {group.title}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    // replace: bo'limlar orasida yurish history'da TO'PLANMAYDI —
                    // orqaga tugmasi har bosilgan sahifani bittalab aylanib yurmaydi.
                    // Ichki sahifalar (buyurtma/mijoz tafsiloti) esa push bo'lib qoladi,
                    // ulardan orqaga bosilsa ro'yxatga qaytadi.
                    replace
                    onClick={onClose}
                    className={cn(
                      "relative flex items-center gap-[11px] px-3 py-2.5 md:py-2 rounded-[11px] text-[13.5px] transition-colors duration-150 select-none",
                      active
                        ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 font-semibold"
                        : "text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-100/70 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    {/* Rail — aktiv indikator */}
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-[3px] bg-blue-600 dark:bg-blue-400 transition-all duration-200",
                        active ? "h-[18px]" : "h-0"
                      )}
                    />
                    <item.icon className="w-[18px] h-[18px] flex-none" />
                    <span className="flex-1 min-w-0 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User karta */}
        {user && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-1">
            <div className="flex items-center gap-2.5 w-full p-2 rounded-xl hover:bg-gray-100/70 dark:hover:bg-gray-800 transition-colors">
              <span className="w-[34px] h-[34px] rounded-[10px] bg-blue-600 text-white text-[13px] font-bold inline-flex items-center justify-center flex-none">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-[13px] font-semibold text-gray-900 dark:text-white truncate leading-tight">{user.name}</span>
                <span className="block text-[11px] text-gray-400 dark:text-gray-500">{ROLE_LABELS[user.role] || user.role}</span>
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
