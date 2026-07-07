"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserPlus, Truck, BarChart2, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  useDriversList, useToggleDriverActive, useTodaySession,
  DriverFull,
} from "@/hooks/use-driver-sessions";
import { DriverForm } from "./driver-form";
import { SessionCloseModal } from "./session-close-modal";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PageHeader, Avatar, Pill, Ring, btnPrimary,
} from "@/components/shared/page-ui";

export function DriversPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: drivers = [], isLoading } = useDriversList();
  const toggle = useToggleDriverActive();

  const active = drivers.filter((d) => d.isActive);
  const inactive = drivers.filter((d) => !d.isActive);

  return (
    <div>
      <PageHeader
        title="Haydovchilar"
        subtitle={`${drivers.length} haydovchi · ${active.length} faol${inactive.length ? ` · ${inactive.length} nofaol` : ""}`}
      >
        <button onClick={() => setShowForm(true)} className={btnPrimary}>
          <UserPlus className="w-4 h-4 flex-none" />
          Haydovchi qo'shish
        </button>
      </PageHeader>

      {/* Kartalar */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Hali haydovchi qo'shilmagan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              onToggle={() => toggle.mutate(driver.id)}
            />
          ))}
        </div>
      )}

      {showForm && <DriverForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

function DriverCard({ driver, onToggle }: { driver: DriverFull; onToggle: () => void }) {
  const [showClose, setShowClose] = useState(false);
  const { data: session } = useTodaySession(driver.id);

  const isOpen = session?.status === "OPEN";
  const sold = session?.bottlesSold ?? 0;
  const taken = session?.bottlesTaken ?? 0;
  const pct = taken > 0 ? Math.min(1, sold / taken) : 0;

  return (
    <>
      <div className={cn(
        "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-panel transition-all duration-200 hover:-translate-y-[3px] hover:shadow-card-hover hover:border-gray-200 dark:hover:border-gray-700",
        !driver.isActive && "opacity-60"
      )}>
        {/* Avatar + ism + holat */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar name={driver.name} size={46} />
          <div className="flex-1 min-w-0">
            <Link
              href={`/drivers/${driver.id}`}
              className="block text-[15px] font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {driver.name}
            </Link>
            <div className="font-mono text-[12.5px] text-gray-400 dark:text-gray-500 mt-0.5">
              {formatPhone(driver.phone)}
            </div>
          </div>
          {!driver.isActive ? (
            <Pill tone="muted" dot>Nofaol</Pill>
          ) : isOpen ? (
            <Pill tone="success" dot pulse>Ishlayapti</Pill>
          ) : (
            <Pill tone="success" dot>Faol</Pill>
          )}
        </div>

        {/* Halqa + statlar */}
        <div className="flex items-center gap-4 mb-4">
          <Ring
            pct={pct}
            size={64}
            thick={6}
            colorClass={pct >= 1 ? "text-green-500" : isOpen ? "text-blue-600 dark:text-blue-400" : "text-gray-300 dark:text-gray-700"}
          >
            <span className="text-[13px] font-bold text-gray-900 dark:text-white tabular-nums">
              {Math.round(pct * 100)}%
            </span>
          </Ring>
          <div className="flex-1 grid grid-cols-2 gap-x-2.5 gap-y-3">
            <div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Bugun sotildi</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white tabular-nums mt-0.5">
                {session ? `${sold} / ${taken}` : "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Jami buyurtma</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white tabular-nums mt-0.5">
                {driver._count?.orders ?? 0}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Inkassatsiya (bugun)</div>
              <div className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums mt-0.5">
                {session ? formatCurrency(session.cashCollected || 0) : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Pastki qator: ish kunlari + amallar */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-300 dark:border-gray-700 pt-3.5">
          <div className="text-[12.5px] text-gray-500 dark:text-gray-400 font-medium">
            {driver._count?.driverSessions ?? 0} ish kuni
          </div>
          <div className="flex items-center gap-1.5">
            {driver.isActive && isOpen && (
              <button
                onClick={() => setShowClose(true)}
                className="inline-flex items-center h-8 px-3 rounded-[9px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
              >
                Kun yopish
              </button>
            )}
            <Link
              href={`/drivers/${driver.id}`}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-[9px] bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Hisobot
            </Link>
            <button
              onClick={onToggle}
              title={driver.isActive ? "Nofaol qilish" : "Faol qilish"}
              className="text-gray-400 hover:text-blue-500 transition-colors flex-none"
            >
              {driver.isActive
                ? <ToggleRight className="w-5 h-5 text-green-500" />
                : <ToggleLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Modallar */}
      {showClose && session && (
        <SessionCloseModal
          driverId={driver.id}
          driverName={driver.name}
          session={session}
          onClose={() => setShowClose(false)}
        />
      )}
    </>
  );
}
