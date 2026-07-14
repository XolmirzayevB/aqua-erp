"use client";

// Yangi buyurtma — KATTA, ochiq dizayn (egasi bergan mockup asosida, 2026-07-13).
// - Mijoz: yozib qidiriladigan combobox (ism/telefon), tanlangach karta ko'rinishida.
// - Tara soni: katta − / + stepper (mahsulot tanlash YO'Q — bitta mahsulot: 19L suv).
// - Sana/vaqt/manzil maydonlari YO'Q (egasi so'rovi).
// - To'lov turi: segment (Naqd / Karta / Nasiya), aktiv = oq pill.
// - Jami to'lov: katta panel, taqsimot (almashtirish/yangi tara) bilan.
// - Yangi mijoz rejimi: ism, telefon, "Hudud" dropdown (faqat hudud nomi).

import { useState } from "react";
import {
  X, Loader2, Search, User, UserPlus, Package, ShoppingBag,
  Minus, Plus, Check, ChevronDown,
} from "lucide-react";
import { useCreateOrder } from "@/hooks/use-orders";
import { useDrivers } from "@/hooks/use-drivers";
import { useCustomers, useCreateCustomer, Customer } from "@/hooks/use-customers";
import { useSettings } from "@/hooks/use-settings";
import { PhoneInput } from "@/components/shared/phone-input";
import { formatCurrency, formatPhone, cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/page-ui";

interface Props { onClose: () => void; defaultCustomer?: Customer | null }

// Katta input uslubi — formaning barcha maydonlari bir xil bo'yda
const bigInput =
  "w-full h-[52px] px-4 rounded-[14px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-[15px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:bg-white dark:focus:bg-gray-900 transition-all";

const label15 = "block text-[14.5px] font-semibold text-gray-800 dark:text-gray-200 mb-2";

export function OrderForm({ onClose, defaultCustomer }: Props) {
  const [mode, setMode] = useState<"existing" | "new">("existing");

  // Mavjud mijoz — yozib qidiriladigan combobox
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(defaultCustomer ?? null);

  // Yangi mijoz
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
  const { data: customersData } = useCustomers({ search: query, limit: 8 });

  const drivers = driversData || [];
  const customers = customersData?.data || [];
  const zones = settings?.zones || [];
  const refillPrice = settings?.refillPrice ?? 12000;
  const newBottlePrice = settings?.newBottlePrice ?? 45000;

  const owned = mode === "existing" ? (selected?.bottlesOwned ?? 0) : 0;
  const refillCount = Math.min(deliverCount, owned);
  const newBottles = Math.max(0, deliverCount - owned);
  const total = refillCount * refillPrice + newBottles * newBottlePrice;

  // Backend manzilga kamida 3 belgi talab qiladi — formada ham shuni tekshiramiz
  // (aks holda "address must be longer than or equal to 3 characters" xatosi chiqadi)
  const newCustomerValid =
    newName.trim().length >= 2 &&
    /^\+998\d{9}$/.test(newPhone) &&
    newAddress.trim().length >= 3;
  const canSubmit = deliverCount > 0 && (mode === "existing" ? !!selected : newCustomerValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    let customerId = selected?.id;
    if (mode === "new") {
      const created = await createCustomer.mutateAsync({
        name: newName.trim(),
        phone: newPhone,
        zone: newZone || undefined,
        address: newAddress.trim(),
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

  const isPending = createOrder.isPending || createCustomer.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-t-[20px] md:rounded-[20px] shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[94vh] overflow-y-auto">
        {/* Sarlavha — ikonka tile + nom + izoh */}
        <div className="flex items-center gap-3.5 px-6 md:px-7 py-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-20">
          <div className="w-11 h-11 rounded-[13px] bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center flex-none">
            <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[19px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">Yangi buyurtma</h2>
            <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5">Mijoz va tara sonini kiriting</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-none">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 md:px-7 py-6 space-y-6">
          {/* Mijoz rejimi */}
          <div className="grid grid-cols-2 gap-1 p-1.5 bg-gray-50 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-800 rounded-2xl">
            {[
              { v: "existing", label: "Mavjud mijoz", icon: User },
              { v: "new", label: "Yangi mijoz", icon: UserPlus },
            ].map(({ v, label, icon: Icon }) => (
              <button key={v} type="button" onClick={() => setMode(v as any)}
                className={cn(
                  "flex items-center justify-center gap-2 h-11 rounded-[12px] text-[14.5px] font-semibold transition-all",
                  mode === v
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-card"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                )}>
                <Icon className="w-[17px] h-[17px]" /> {label}
              </button>
            ))}
          </div>

          {/* ── MAVJUD MIJOZ — yozib qidiriladigan combobox ── */}
          {mode === "existing" && (
            <div>
              <label className={label15}>Mijoz</label>

              {selected && !open ? (
                /* Tanlangan mijoz — karta ko'rinishida */
                <div className="flex items-center gap-3 h-[64px] px-4 rounded-[14px] border-2 border-blue-500/60 bg-blue-50/50 dark:bg-blue-500/10">
                  <Avatar name={selected.name} size={38} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">{selected.name}</p>
                    <p className="text-[12.5px] text-gray-500 dark:text-gray-400 font-mono">
                      {formatPhone(selected.phone)}{selected.zone ? ` · ${selected.zone} hudud` : ""}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[12.5px] font-semibold text-gray-500 dark:text-gray-400 flex-none">
                    <Package className="w-4 h-4" /> {owned} ta
                  </span>
                  <button type="button" onClick={() => { setSelected(null); setQuery(""); setOpen(true); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-colors flex-none" title="Boshqa mijoz tanlash">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Qidiruv maydoni + natijalar */
                <div className="relative">
                  <Search className="w-[18px] h-[18px] text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    autoFocus={open}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder="Mijozni tanlang yoki yozib qidiring..."
                    className={cn(bigInput, "pl-11 pr-10")}
                  />
                  <ChevronDown className="w-[18px] h-[18px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />

                  {open && (
                    <div className="absolute top-full mt-2 left-0 right-0 z-30 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-[14px] shadow-card-hover overflow-hidden">
                      <div className="max-h-[264px] overflow-y-auto">
                        {customers.length === 0 ? (
                          <p className="text-center text-[13.5px] text-gray-400 py-6">Topilmadi</p>
                        ) : customers.map((c) => (
                          <button key={c.id} type="button"
                            onMouseDown={(e) => { e.preventDefault(); setSelected(c); setOpen(false); setQuery(""); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                            <Avatar name={c.name} size={34} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                              <p className="text-[12px] text-gray-400 font-mono">{formatPhone(c.phone)}{c.zone ? ` · ${c.zone}` : ""}</p>
                            </div>
                            <span className="text-[12px] text-gray-400 flex items-center gap-1 flex-none">
                              <Package className="w-3.5 h-3.5" />{c.bottlesOwned}
                            </span>
                          </button>
                        ))}
                      </div>
                      <button type="button"
                        onMouseDown={(e) => { e.preventDefault(); setMode("new"); setOpen(false); }}
                        className="w-full flex items-center justify-center gap-2 py-3 text-[13.5px] font-semibold text-blue-600 dark:text-blue-400 bg-gray-50/70 dark:bg-gray-800/40 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors border-t border-gray-100 dark:border-gray-800">
                        <UserPlus className="w-4 h-4" /> Yangi mijoz qo'shish
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Qarz ogohlantirishi */}
              {selected && Number(selected.balance) < 0 && (
                <p className="mt-2 text-[13px] font-medium text-red-600 dark:text-red-400">
                  ⚠ Mijozda {formatCurrency(Math.abs(Number(selected.balance)))} qarz bor
                </p>
              )}
            </div>
          )}

          {/* ── YANGI MIJOZ ── */}
          {mode === "new" && (
            <div className="space-y-4">
              <div>
                <label className={label15}>Ism familiya</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Alisher Nazarov" className={bigInput} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={label15}>Telefon</label>
                  <PhoneInput value={newPhone} onChange={setNewPhone} className={bigInput} />
                </div>
                <div>
                  <label className={label15}>Hudud</label>
                  <div className="relative">
                    <select value={newZone} onChange={(e) => setNewZone(e.target.value)}
                      className={cn(bigInput, "appearance-none pr-10 cursor-pointer")}>
                      <option value="">Tanlanmagan</option>
                      {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                    <ChevronDown className="w-[18px] h-[18px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className={label15}>Manzil</label>
                <input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="5-kvartal, 23-uy" className={bigInput} />
              </div>
              <p className="text-[12.5px] text-gray-400">Yangi mijozga barcha taralar "yangi tara" narxida sotiladi. Lokatsiya havolasini keyin mijoz sahifasida qo'shish mumkin.</p>
            </div>
          )}

          {/* ── TARA SONI — katta stepper ── */}
          <div>
            <label className={label15}>Nechta tara?</label>
            <div className="flex items-center gap-3">
              {/* Funksional yangilash — tez ketma-ket bosilganda ham har bosish sanaladi */}
              <button type="button" onClick={() => setDeliverCount((c) => Math.max(1, c - 1))}
                disabled={deliverCount <= 1}
                className="w-[56px] h-[56px] rounded-[14px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-40 flex-none">
                <Minus className="w-5 h-5" />
              </button>
              <input
                inputMode="numeric"
                value={deliverCount}
                onChange={(e) => setDeliverCount(Math.max(1, parseInt(e.target.value.replace(/\D/g, "")) || 1))}
                className="flex-1 h-[56px] text-center rounded-[14px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-[28px] font-bold tabular-nums focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all"
              />
              <button type="button" onClick={() => setDeliverCount((c) => c + 1)}
                className="w-[56px] h-[56px] rounded-[14px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all flex-none">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── TO'LOV TURI — segment (mockup'dagidek aktiv = oq pill) ── */}
          <div>
            <label className={label15}>To'lov turi</label>
            <div className="grid grid-cols-3 gap-1 p-1.5 bg-gray-50 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-800 rounded-2xl">
              {[
                { value: "CASH", label: "Naqd" },
                { value: "CARD", label: "Karta" },
                { value: "DEBT", label: "Nasiya" },
              ].map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setPaymentType(value as any)}
                  className={cn(
                    "h-12 rounded-[12px] text-[15px] font-semibold transition-all",
                    paymentType === value
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-card border border-gray-100 dark:border-gray-700"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  )}>
                  {label}
                </button>
              ))}
            </div>
            {paymentType === "DEBT" && (
              <p className="mt-2 text-[13px] font-medium text-amber-600 dark:text-amber-400">
                Nasiya — summa mijoz qarziga yoziladi, to'lov keyin qabul qilinadi
              </p>
            )}
          </div>

          {/* ── Haydovchi + Izoh ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label15}>Haydovchi <span className="font-normal text-gray-400">(ixtiyoriy)</span></label>
              <div className="relative">
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)}
                  className={cn(bigInput, "appearance-none pr-10 cursor-pointer")}>
                  <option value="">Keyin biriktiriladi</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown className="w-[18px] h-[18px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={label15}>Izoh <span className="font-normal text-gray-400">(ixtiyoriy)</span></label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Qo'shimcha ma'lumot..." className={bigInput} />
            </div>
          </div>

          {/* ── JAMI TO'LOV — mockup'dagidek katta panel ── */}
          <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-400 dark:text-gray-500">Jami to'lov</p>
              <p className="text-[13px] text-gray-600 dark:text-gray-300 mt-0.5 leading-snug">
                {refillCount > 0 && <span>{refillCount} × almashtirish ({formatCurrency(refillPrice)})</span>}
                {refillCount > 0 && newBottles > 0 && <span className="text-gray-300 dark:text-gray-600"> + </span>}
                {newBottles > 0 && <span>{newBottles} × yangi tara ({formatCurrency(newBottlePrice)})</span>}
              </p>
            </div>
            <p className="text-[26px] md:text-[30px] font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap flex-none">
              {formatCurrency(total)}
            </p>
          </div>

          {/* ── Tugmalar — mockup'dagidek o'ngда ── */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="h-[52px] px-6 rounded-[14px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-[15px] font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Bekor qilish
            </button>
            <button type="submit" disabled={!canSubmit || isPending}
              className="h-[52px] px-6 rounded-[14px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[15px] font-semibold shadow-glow transition-all hover:-translate-y-px disabled:hover:translate-y-0 flex items-center gap-2">
              {isPending ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Check className="w-[18px] h-[18px]" />}
              {mode === "new" ? "Mijoz qo'shib, buyurtma yaratish" : "Buyurtma yaratish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
