"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, Phone, Truck, BarChart2, ToggleLeft, ToggleRight,
  CheckCircle, XCircle, Clock, Package,
} from "lucide-react";
import {
  useDriversList, useToggleDriverActive, useTodaySession,
  DriverFull,
} from "@/hooks/use-driver-sessions";
import { DriverForm } from "./driver-form";
import { SessionOpenModal } from "./session-open-modal";
import { SessionCloseModal } from "./session-close-modal";
import { formatDate, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function DriversPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: drivers = [], isLoading } = useDriversList();
  const toggle = useToggleDriverActive();

  const active = drivers.filter((d) => d.isActive);
  const inactive = drivers.filter((d) => !d.isActive);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Haydovchilar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {active.length} faol · {inactive.length} nofaol
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-blue-200 dark:shadow-blue-900/30"
        >
          <Plus className="w-4 h-4" />
          Yangi haydovchi
        </button>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Hali haydovchi qo'shilmagan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const { data: session } = useTodaySession(driver.id);

  const sessionStatus = session
    ? session.status === "OPEN"
      ? { label: "Ishlayapti", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", dot: "bg-green-500" }
      : { label: "Kun yopilgan", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", dot: "bg-gray-400" }
    : { label: "Boshmagan", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400", dot: "bg-yellow-500" };

  return (
    <>
    <div className={cn(
      "bg-white dark:bg-gray-900 rounded-2xl border p-5 flex flex-col gap-4 transition-all",
      driver.isActive
        ? "border-gray-100 dark:border-gray-800"
        : "border-gray-100 dark:border-gray-800 opacity-60"
    )}>
      {/* Top: avatar + info */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0",
          driver.isActive
            ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400"
            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
        )}>
          {driver.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/drivers/${driver.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {driver.name}
          </Link>
          <div className="flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400 font-mono">{formatPhone(driver.phone)}</span>
          </div>
        </div>
        {/* Active toggle */}
        <button
          onClick={onToggle}
          title={driver.isActive ? "Nofaol qilish" : "Faol qilish"}
          className="text-gray-400 hover:text-blue-500 transition-colors"
        >
          {driver.isActive
            ? <ToggleRight className="w-5 h-5 text-green-500" />
            : <ToggleLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{driver._count?.orders ?? 0}</p>
          <p className="text-xs text-gray-400">Jami buyurtma</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{driver._count?.driverSessions ?? 0}</p>
          <p className="text-xs text-gray-400">Ish kuni</p>
        </div>
      </div>

      {/* Today session status */}
      <div className="flex items-center justify-between">
        <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5", sessionStatus.color)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", sessionStatus.dot)} />
          {sessionStatus.label}
        </span>
        {session && session.status === "OPEN" && (
          <span className="text-xs text-gray-400">
            <Package className="w-3 h-3 inline mr-1" />
            {session.bottlesTaken - session.bottlesSold} qoldi
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {driver.isActive && !session && (
          <button
            onClick={() => setShowOpen(true)}
            className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
          >
            🚀 Kun boshlash
          </button>
        )}
        {driver.isActive && session?.status === "OPEN" && (
          <button
            onClick={() => setShowClose(true)}
            className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
          >
            🌙 Kun yopish
          </button>
        )}
        <Link
          href={`/drivers/${driver.id}`}
          className="flex items-center justify-center gap-1 flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Hisobot
        </Link>
      </div>
    </div>

      {/* Modals */}
      {showOpen && (
        <SessionOpenModal
          driverId={driver.id}
          driverName={driver.name}
          onClose={() => setShowOpen(false)}
        />
      )}
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
