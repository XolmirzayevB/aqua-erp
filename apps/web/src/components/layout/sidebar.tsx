"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ShoppingCart, Truck, Warehouse,
  DollarSign, CreditCard, BarChart3, Settings, Droplets,
  Bell, FileText, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { Role } from "@aqua/shared";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR] },
  { href: "/customers", label: "Mijozlar", icon: Users, roles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR] },
  { href: "/orders", label: "Buyurtmalar", icon: ShoppingCart, roles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.DRIVER] },
  { href: "/drivers", label: "Haydovchilar", icon: Truck, roles: [Role.ADMIN, Role.MANAGER] },
  { href: "/inventory", label: "Ombor", icon: Warehouse, roles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR] },
  { href: "/finance", label: "Moliya", icon: DollarSign, roles: [Role.ADMIN, Role.MANAGER] },
  { href: "/debts", label: "Qarzdorlik", icon: CreditCard, roles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR] },
  { href: "/reports", label: "Hisobotlar", icon: BarChart3, roles: [Role.ADMIN, Role.MANAGER] },
  { href: "/analytics", label: "Analytics", icon: TrendingUp, roles: [Role.ADMIN, Role.MANAGER] },
  { href: "/audit", label: "Audit Log", icon: FileText, roles: [Role.ADMIN] },
  { href: "/settings", label: "Sozlamalar", icon: Settings, roles: [Role.ADMIN] },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const visibleItems = navItems.filter(
    (item) => !user?.role || item.roles.includes(user.role as Role)
  );

  return (
    <aside className="w-60 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">AquaERP</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">19L Suv Tizimi</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {visibleItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-blue-600 dark:text-blue-400" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-semibold text-xs flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
