"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useRealtimeNotifications } from "@/hooks/use-notifications";
import { usePushSubscription } from "@/hooks/use-push";

// Rol → ruxsat etilgan sahifalar va "uy" sahifa.
// Ilova "/" dan ochilganda (APK/PWA start_url) har rol o'z sahifasiga tushadi.
const ROLE_ROUTES: Record<string, { home: string; allowed: string[] }> = {
  ADMIN: { home: "/", allowed: [] }, // bo'sh = hamma sahifa ochiq
  MANAGER: { home: "/", allowed: ["/", "/customers", "/inventory", "/finance", "/debts", "/reports", "/analytics"] },
  OPERATOR: { home: "/customers", allowed: ["/customers", "/orders", "/debts"] },
  DRIVER: { home: "/orders", allowed: ["/orders", "/route"] },
};

function isPathAllowed(role: string | undefined, pathname: string): boolean {
  const conf = role ? ROLE_ROUTES[role] : undefined;
  if (!conf) return true;
  if (conf.allowed.length === 0) return true; // admin
  return conf.allowed.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useRealtimeNotifications();
  usePushSubscription();

  // Mount'dan keyin zustand localStorage'dan o'qib bo'lgan bo'ladi
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace("/login");
  }, [hydrated, isAuthenticated, router]);

  // Rolga mos kelmagan sahifa ochilsa — o'z sahifasiga yo'naltiramiz
  // (masalan haydovchi ilovani qayta ochsa "/" emas, /orders ko'rsin)
  const role = user?.role;
  const pathAllowed = isPathAllowed(role, pathname);
  useEffect(() => {
    if (hydrated && isAuthenticated && role && !pathAllowed) {
      router.replace(ROLE_ROUTES[role]?.home ?? "/");
    }
  }, [hydrated, isAuthenticated, role, pathname, pathAllowed, router]);

  // Hydration tugaguncha kutamiz (refresh'da login'ga otib yubormaslik uchun)
  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  // Yo'naltirish tugaguncha noto'g'ri sahifa "yalt" etib ko'rinmasin
  if (!pathAllowed) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-7">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
