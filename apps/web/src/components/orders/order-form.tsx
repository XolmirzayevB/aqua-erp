"use client";

import { useState } from "react";
import { X, Loader2, Search, User, UserPlus, Package, Droplets } from "lucide-react";
import { useCreateOrder } from "@/hooks/use-orders";
import { useDrivers } from "@/hooks/use-drivers";
import { useCustomers, useCreateCustomer, Customer } from "@/hooks/use-customers";
import { useSettings } from "@/hooks/use-settings";
import { PhoneInput } from "@/components/shared/phone-input";
import { formatCurrency, formatPhone } from "@/lib/utils";

interface Props { onClose: () => void; defaultCustomer?: Customer | null }

export function OrderForm({ onClose, defaultCustomer }: Props) {
  // Mijoz rejimi: mavjud yoki yangi
  const [mode, setMode] = useState<"existing" | "new">(defaultCustomer ? "existing" : "existing");

  // Mavjud mijoz
  const [customerSearch, setCustomerSearch] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(defaultCustomer ?? null);

  // Yangi mijoz maydonlari
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newZone, setNewZone] = useState("");
  const [newAddress, setNewAddress] = useState("");

  // Buyurtma
  const [deliverCount, setDeliverCount] = useState(1);
  const [paymentType, setPaymentType] = useState<"CASH" | "CARD" | "DEBT">("CASH");
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");

  const createOrder = useCreateOrder();
  const createCustomer = useCreateCustomer();
  const { data: settings } = useSettings();
  const { data: driversData } = useDrivers();
  const { data: customersData } = useCustomers({ search: customerSearch, limit: 8 });

  const drivers = driversData || [];
  const customers = customersData?.data || [];
  const zones = settings?.zones || [];
  const refillPrice = settings?.refillPrice ?? 12000;
  const newBottlePrice = settings?.newBottlePrice ?? 45000;

  // Mijozdagi tara soni (yangi mijoz = 0)
  const owned = mode === "existing" ? (selected?.bottlesOwned ?? 0) : 0;

  // Avtomatik ajratish: egasidagicha almashtirish, ortig'i — yangi tara
  const refillCount = Math.min(deliverCount, owned);
  const newBottles = Math.max(0, deliverCount - owned);
  const total = refillCount * refillPrice + newBottles * newBottlePrice;

  const newCustomerValid = newName.trim().length >= 2 && /^\+998\d{9}$/.test(newPhone);
  const canSubmit =
    deliverCount > 0 &&
    (mode === "existing" ? !!selected : newCustomerValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    let customerId = selected?.id;

    // Yangi mijoz bo'lsa — avval yaratamiz
    if (mode === "new") {
      const created = await createCustomer.mutateAsync({
        name: newName.trim(),
        phone: newPhone,
        zone: newZone || undefined,
        address: newAddress.trim() || "—",
      } as any);
      customerId = created.id;
    }

    if (!customerId) return;

    await createOrder.mutateAsync({
      customerId,
      refillCount,
      newBottles,
      paymentType,
      driverId: driverId || undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  const selectCustomer = (c: Customer) => {
    setSelected(c);
    setShowDrop(false);
    setCustomerSearch("");
  };

  const isPending = createOrder.isPending || createCustomer.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">Yangi buyurtma</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Mijoz rejimi tanlovi */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button type="button" onClick={() => setMode("existing")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === "existing" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
              <User className="w-4 h-4" /> Mavjud mijoz
            </button>
            <button type="button" onClick={() => setMode("new")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === "new" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
              <UserPlus className="w-4 h-4" /> Yangi mijoz
            </button>
          </div>

          {/* MAVJUD MIJOZ */}
          {mode === "existing" && (
            <div>
              <div className="relative">
                <div className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2 cursor-pointer" onClick={() => setShowDrop(true)}>
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {selected ? <span className="text-sm text-gray-900 dark:text-white">{selected.name}</span> : <span className="text-sm text-gray-400">Mijozni qidiring...</span>}
                </div>
                {showDrop && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                      <input autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Ism yoki telefon..." className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none" />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {customers.length === 0 ? <p className="text-center text-sm text-gray-400 py-4">Topilmadi</p> : customers.map((c) => (
                        <button key={c.id} type="button" onClick={() => selectCustomer(c)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                            <p className="text-xs text-gray-400">{formatPhone(c.phone)}{c.zone ? ` · ${c.zone}` : ""}</p>
                          </div>
                          <span className="text-xs text-gray-400 flex items-center gap-1"><Package className="w-3 h-3" />{c.bottlesOwned}</span>
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setShowDrop(false)} className="w-full py-2 text-xs text-gray-500 border-t border-gray-400/70 dark:border-gray-600">Yopish</button>
                  </div>
                )}
              </div>
              {selected && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-xs">
                  <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-700 dark:text-blue-400">Mijozda <b>{owned} ta</b> tara bor
                    {Number(selected.balance) < 0 && <span className="ml-2 text-red-500">· Qarz: {formatCurrency(Math.abs(Number(selected.balance)))}</span>}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* YANGI MIJOZ */}
          {mode === "new" && (
            <div className="space-y-3 p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ism *" className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <PhoneInput value={newPhone} onChange={setNewPhone} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Manzil" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {zones.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {zones.map((z) => (
                    <button key={z} type="button" onClick={() => setNewZone(newZone === z ? "" : z)} className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${newZone === z ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>Hudud {z}</button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400">Yangi mijoz — barcha taralar "yangi tara" sifatida sotiladi.</p>
            </div>
          )}

          {/* NECHA TARA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-blue-600" /> Necha tara suv olib boriladi?
            </label>
            <div className="flex items-center gap-2 max-w-[220px]">
              <button type="button" onClick={() => setDeliverCount(Math.max(1, deliverCount - 1))} className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-lg hover:bg-gray-50 dark:hover:bg-gray-800">−</button>
              <input type="number" min={1} value={deliverCount} onChange={(e) => setDeliverCount(Math.max(1, parseInt(e.target.value) || 1))} className="w-full text-center px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={() => setDeliverCount(deliverCount + 1)} className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-lg hover:bg-gray-50 dark:hover:bg-gray-800">+</button>
            </div>

            {/* Avtomatik taqsimot */}
            <div className="mt-3 space-y-1.5 text-sm">
              {refillCount > 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <span className="text-blue-700 dark:text-blue-400">🔄 {refillCount} ta almashtirish × {formatCurrency(refillPrice)}</span>
                  <span className="font-medium text-blue-700 dark:text-blue-400">{formatCurrency(refillCount * refillPrice)}</span>
                </div>
              )}
              {newBottles > 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/30">
                  <span className="text-green-700 dark:text-green-400">🆕 {newBottles} ta yangi tara × {formatCurrency(newBottlePrice)}</span>
                  <span className="font-medium text-green-700 dark:text-green-400">{formatCurrency(newBottles * newBottlePrice)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Jami */}
          <div className="px-4 py-3 rounded-xl bg-gray-900 dark:bg-gray-800 text-white flex items-center justify-between">
            <span className="text-sm font-medium">Jami summa</span>
            <span className="text-2xl font-bold">{formatCurrency(total)}</span>
          </div>

          {/* To'lov turi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">To'lov turi</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ value: "CASH", label: "💵 Naqd" }, { value: "CARD", label: "💳 Karta" }, { value: "DEBT", label: "📋 Nasiya" }].map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setPaymentType(value as any)} className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${paymentType === value ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"}`}>{label}</button>
              ))}
            </div>
          </div>

          {/* Haydovchi + izoh */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Haydovchi</label>
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tanlash (ixtiyoriy)</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Izoh</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ixtiyoriy..." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Bekor</button>
            <button type="submit" disabled={!canSubmit || isPending} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === "new" ? "Mijoz qo'shib, buyurtma yaratish" : "Buyurtma yaratish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
