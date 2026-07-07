"use client";

import { useState } from "react";
import { X, Loader2, Truck, Check } from "lucide-react";
import { useAssignDriver } from "@/hooks/use-orders";
import { useDrivers } from "@/hooks/use-drivers";
import { formatPhone } from "@/lib/utils";

interface Props {
  orderId: string;
  currentDriverId?: string;
  onClose: () => void;
}

export function AssignDriverModal({ orderId, currentDriverId, onClose }: Props) {
  const [selectedId, setSelectedId] = useState(currentDriverId || "");
  const { data: drivers = [] } = useDrivers();
  const assign = useAssignDriver();

  const handleSubmit = async () => {
    if (!selectedId) return;
    await assign.mutateAsync({ id: orderId, driverId: selectedId });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-base">Haydovchi biriktirish</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
          {drivers.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">Haydovchilar topilmadi</p>
          ) : drivers.map((driver) => (
            <button
              key={driver.id}
              type="button"
              onClick={() => setSelectedId(driver.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                selectedId === driver.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                  : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-sm flex-shrink-0">
                {driver.name[0]}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{driver.name}</p>
                <p className="text-xs text-gray-400">{formatPhone(driver.phone)}</p>
              </div>
              {selectedId === driver.id && (
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-300 dark:border-gray-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Bekor
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedId || assign.isPending}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {assign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Biriktirish
          </button>
        </div>
      </div>
    </div>
  );
}
