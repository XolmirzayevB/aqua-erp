"use client";

// Yangi buyurtma — KATTA, ochiq dizayn (egasi bergan mockup asosida, 2026-07-13).
// - Mijoz: yozib qidiriladigan combobox (ism/telefon), tanlangach karta ko'rinishida.
// - Tara soni: katta − / + stepper (mahsulot tanlash YO'Q — bitta mahsulot: 19L suv).
// - Sana/vaqt/manzil maydonlari YO'Q (egasi so'rovi).
// - TO'LOV TURI YO'Q (2026-07-16): to'lovni haydovchi YETKAZGANDA tanlaydi.
// - LOKATSIYA TANLASH (2026-07-16): mijozning bir nechta manzili bo'lsa
//   (Uy, Apteka...) operator qaysi joyga ekanini tanlaydi; yangi joy ham
//   shu yerdan qo'shiladi.
// - Jami to'lov: katta panel, taqsimot (almashtirish/yangi tara) bilan.
// - Yangi mijoz rejimi: ism, telefon, "Hudud" dropdown (faqat hudud nomi).

import { useState, useEffect } from "react";
import {
  X, Loader2, Search, User, UserPlus, Package, ShoppingBag,
  Minus, Plus, Check, ChevronDown, MapPin, Home, RefreshCw,
} from "lucide-react";
import { useCreateOrder } from "@/hooks/use-orders";
import { useDrivers } from "@/hooks/use-drivers";
import { useCustomers, useCreateCustomer, useAddLocation, Customer } from "@/hooks/use-customers";
import { useSettings } from "@/hooks/use-settings";
import { PhoneInput } from "@/components/shared/phone-input";
import { formatCurrency, formatPhone, cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/page-ui";

interface Props { onClose: () => void; defaultCustomer?: Customer | null }

// Bitta tara-turi uchun katta − / + stepper (to'ldirish yoki yangi tara).
// Funksional yangilash — tez ketma-ket bosishda ham har bosish sanaladi.
function QtyStepper({
  label, hint, icon: Icon, value, onChange, min = 0, max, tone,
}: {
  label: string; hint: string; icon: any; value: number;
  onChange: (updater: (c: number) => number) => void;
  min?: number; max?: number; tone: "blue" | "green";
}) {
  const atMax = max !== undefined && value >= max;
  const toneCls = tone === "blue"
    ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
    : "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400";
  return (
    <div className="rounded-[16px] border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-3.5">
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-none ${toneCls}`}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-semibold text-gray-800 dark:text-gray-200 leading-tight">{label}</p>
          <p className="text-[11.5px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{hint}</p>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <button type="button" onClick={() => onChange((c) => Math.max(min, c - 1))}
            disabled={value <= min}
            className="w-[46px] h-[46px] rounded-[13px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-40 flex-none">
            <Minus className="w-[18px] h-[18px]" />
          </button>
          <input
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              let n = parseInt(e.target.value.replace(/\D/g, "")) || 0;
              if (max !== undefined) n = Math.min(n, max);
              onChange(() => Math.max(min, n));
            }}
            className="w-[58px] h-[46px] text-center rounded-[13px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[22px] font-bold tabular-nums focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all"
          />
          <button type="button" onClick={() => onChange((c) => (max !== undefined ? Math.min(max, c + 1) : c + 1))}
            disabled={atMax}
            className="w-[46px] h-[46px] rounded-[13px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-40 flex-none">
            <Plus className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // Buyurtma — TO'LDIRISH va YANGI TARA alohida boshqariladi (2026-07-16).
  // Sabab: avval bitta "nechta tara" kiritilib avtomatik ajratilardi (to'ldirish
  // maksimal qilib olinardi). Endi operator aniq belgilaydi: masalan mijozda 3 ta
  // bo'lsa ham "1 to'ldirish + 3 yangi" yozish mumkin.
  const [refillCount, setRefillCount] = useState(0);
  const [newBottles, setNewBottles] = useState(1);
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");

  // Lokatsiya tanlash: "" = asosiy manzil, aks holda CustomerLocation.id
  const [locationId, setLocationId] = useState("");
  const [addingLoc, setAddingLoc] = useState(false);
  const [locLabel, setLocLabel] = useState("");
  const [locAddress, setLocAddress] = useState("");
  const [locLink, setLocLink] = useState("");

  const createOrder = useCreateOrder();
  const createCustomer = useCreateCustomer();
  const addLocation = useAddLocation();
  const { data: settings } = useSettings();
  const { data: driversData } = useDrivers();
  const { data: customersData } = useCustomers({ search: query, limit: 8 });

  const drivers = driversData || [];
  const customers = customersData?.data || [];
  const zones = settings?.zones || [];
  const refillPrice = settings?.refillPrice ?? 12000;
  const newBottlePrice = settings?.newBottlePrice ?? 45000;

  // UYIDAGI TARA ANIQLASHTIRISH (2026-07-17, egasi so'rovi): daftar noaniq —
  // operator zakaz olayotganda mijozdan "uyingizda nechta tara bor?" deb so'raydi
  // va shu yerda tuzatadi. O'zgartirilgan bo'lsa backend mijoz kartasini yangilaydi.
  const [ownedInput, setOwnedInput] = useState(0);
  const savedOwned = selected?.bottlesOwned ?? 0; // tizimda (daftardan) yozilgani
  const ownedCorrected = mode === "existing" && !!selected && ownedInput !== savedOwned;

  const owned = mode === "existing" ? ownedInput : 0;
  // To'ldirish mijozdagi taradan oshmasin (son pasaytirilganda ham xavfsiz)
  const refillCapped = Math.min(refillCount, owned);
  const total = refillCapped * refillPrice + newBottles * newBottlePrice;

  // Mijoz tanlanganda: uyidagi son tizimdagidan boshlanadi; tarasi bor bo'lsa
  // "1 to'ldirish", aks holda "1 yangi tara". Operator keyin o'zgartiradi.
  useEffect(() => {
    const base = selected?.bottlesOwned ?? 0;
    setOwnedInput(base);
    if (mode === "existing" && base > 0) {
      setRefillCount(1);
      setNewBottles(0);
    } else {
      setRefillCount(0);
      setNewBottles(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, mode]);

  // Backend manzilga kamida 3 belgi talab qiladi — formada ham shuni tekshiramiz
  // (aks holda "address must be longer than or equal to 3 characters" xatosi chiqadi)
  const newCustomerValid =
    newName.trim().length >= 2 &&
    /^\+998\d{9}$/.test(newPhone) &&
    newAddress.trim().length >= 3;
  const totalCount = refillCapped + newBottles;
  const canSubmit = totalCount > 0 && (mode === "existing" ? !!selected : newCustomerValid);

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
      refillCount: refillCapped,
      newBottles,
      // Operator sonni tuzatgan bo'lsa — mijoz kartasi ham yangilanadi (backend)
      actualBottlesOwned: ownedCorrected ? ownedInput : undefined,
      locationId: locationId || undefined,
      driverId: driverId || undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  // "+ Yangi joy" — mijozga qo'shimcha manzil qo'shib, darrov tanlaymiz
  const handleAddLocation = async () => {
    if (!selected || locLabel.trim().length < 1) return;
    const loc = await addLocation.mutateAsync({
      customerId: selected.id,
      data: {
        label: locLabel.trim(),
        address: locAddress.trim() || undefined,
        locationLink: locLink.trim() || undefined,
      },
    });
    // selected — snapshot: yangi manzilni lokal ro'yxatga ham qo'shamiz
    setSelected({ ...selected, locations: [...(selected.locations || []), loc] });
    setLocationId(loc.id);
    setAddingLoc(false);
    setLocLabel(""); setLocAddress(""); setLocLink("");
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
                  <button type="button" onClick={() => { setSelected(null); setLocationId(""); setAddingLoc(false); setQuery(""); setOpen(true); }}
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
                            onMouseDown={(e) => { e.preventDefault(); setSelected(c); setLocationId(""); setAddingLoc(false); setOpen(false); setQuery(""); }}
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

          {/* ── UYIDA NECHTA TARA BOR? — telefonda so'rab aniqlashtirish ──
              Daftar noaniq: operator mijozdan so'rab shu yerda tuzatadi.
              O'zgartirilsa mijoz kartasi ham yangilanadi (zakaz bilan birga). */}
          {mode === "existing" && selected && (
            <div className={cn(
              "rounded-[16px] border p-3.5 transition-colors",
              ownedCorrected
                ? "border-amber-300 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-500/10"
                : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40"
            )}>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-[12px] bg-amber-100/80 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-none">
                  <Package className="w-[18px] h-[18px]" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px] font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                    Uyida nechta tara bor?
                  </p>
                  <p className="text-[11.5px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">
                    {ownedCorrected
                      ? `Tizimda ${savedOwned} ta edi — saqlashda ${ownedInput} taga tuzatiladi`
                      : "Mijozdan so'rang — noto'g'ri bo'lsa shu yerda tuzating"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <button type="button" onClick={() => setOwnedInput((c) => Math.max(0, c - 1))}
                    disabled={ownedInput <= 0}
                    className="w-[46px] h-[46px] rounded-[13px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-40 flex-none">
                    <Minus className="w-[18px] h-[18px]" />
                  </button>
                  <input
                    inputMode="numeric"
                    value={ownedInput}
                    onChange={(e) => setOwnedInput(Math.max(0, parseInt(e.target.value.replace(/\D/g, "")) || 0))}
                    className="w-[58px] h-[46px] text-center rounded-[13px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[22px] font-bold tabular-nums focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all"
                  />
                  <button type="button" onClick={() => setOwnedInput((c) => c + 1)}
                    className="w-[46px] h-[46px] rounded-[13px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all flex-none">
                    <Plus className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TARA SONI — TO'LDIRISH + YANGI TARA alohida ──
              Mijozda tara bo'lsa ikkalasi ko'rinadi (operator aniq belgilaydi:
              masalan "1 to'ldirish + 3 yangi"). Tarasi yo'q bo'lsa faqat yangi. */}
          <div className="space-y-3.5">
            {owned > 0 && (
              <QtyStepper
                label="To'ldirish (almashtirish)"
                hint={`Mijozdagi bo'sh tarani to'ldirish · ${formatCurrency(refillPrice)} · mijozda ${owned} ta`}
                icon={RefreshCw}
                value={refillCapped}
                min={0}
                max={owned}
                onChange={setRefillCount}
                tone="blue"
              />
            )}
            <QtyStepper
              label="Yangi tara"
              hint={`Yangi sotib olinadigan tara · ${formatCurrency(newBottlePrice)}`}
              icon={Package}
              value={newBottles}
              min={0}
              onChange={setNewBottles}
              tone="green"
            />
          </div>

          {/* ── QAYERGA YETKAZILADI? — mijoz manzillari (Uy, Apteka...) ──
              To'lov turi bu formada YO'Q — haydovchi yetkazganda tanlaydi. */}
          {mode === "existing" && selected && (
            <div>
              <label className={label15}>Qayerga yetkaziladi?</label>
              <div className="flex flex-wrap gap-2">
                {/* Asosiy manzil */}
                <button type="button" onClick={() => setLocationId("")}
                  className={cn(
                    "inline-flex items-center gap-2 h-11 px-3.5 rounded-[12px] border-2 text-[13.5px] font-semibold transition-all max-w-full",
                    locationId === ""
                      ? "border-blue-500/70 bg-blue-50/60 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      : "border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700"
                  )}>
                  <Home className="w-4 h-4 flex-none" />
                  <span className="truncate">
                    Asosiy{selected.address && selected.address !== "—" ? ` · ${selected.address}` : ""}
                  </span>
                </button>
                {/* Qo'shimcha manzillar */}
                {(selected.locations || []).map((loc) => (
                  <button key={loc.id} type="button" onClick={() => setLocationId(loc.id)}
                    className={cn(
                      "inline-flex items-center gap-2 h-11 px-3.5 rounded-[12px] border-2 text-[13.5px] font-semibold transition-all max-w-full",
                      locationId === loc.id
                        ? "border-blue-500/70 bg-blue-50/60 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
                        : "border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700"
                    )}>
                    <MapPin className="w-4 h-4 flex-none" />
                    <span className="truncate">{loc.label}</span>
                  </button>
                ))}
                {/* Yangi joy qo'shish */}
                <button type="button" onClick={() => setAddingLoc((v) => !v)}
                  className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-[12px] border-2 border-dashed border-gray-200 dark:border-gray-700 text-[13.5px] font-semibold text-gray-400 dark:text-gray-500 hover:text-blue-600 hover:border-blue-300 dark:hover:text-blue-400 transition-all">
                  <Plus className="w-4 h-4" /> Yangi joy
                </button>
              </div>

              {/* Yangi joy mini-formasi */}
              {addingLoc && (
                <div className="mt-3 p-4 rounded-[14px] border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 space-y-3">
                  <input value={locLabel} onChange={(e) => setLocLabel(e.target.value)}
                    placeholder="Joy nomi (masalan: Apteka)" className={bigInput} autoFocus />
                  <input value={locAddress} onChange={(e) => setLocAddress(e.target.value)}
                    placeholder="Manzil (ixtiyoriy)" className={bigInput} />
                  <input value={locLink} onChange={(e) => setLocLink(e.target.value)}
                    placeholder="Google Maps havolasi (ixtiyoriy)" className={bigInput} />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setAddingLoc(false)}
                      className="h-10 px-4 rounded-[11px] text-[13.5px] font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      Bekor
                    </button>
                    <button type="button" onClick={handleAddLocation}
                      disabled={locLabel.trim().length < 1 || addLocation.isPending}
                      className="h-10 px-4 rounded-[11px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[13.5px] font-semibold transition-colors flex items-center gap-1.5">
                      {addLocation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Qo'shish
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                {refillCapped > 0 && <span>{refillCapped} × almashtirish ({formatCurrency(refillPrice)})</span>}
                {refillCapped > 0 && newBottles > 0 && <span className="text-gray-300 dark:text-gray-600"> + </span>}
                {newBottles > 0 && <span>{newBottles} × yangi tara ({formatCurrency(newBottlePrice)})</span>}
              </p>
              <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1">
                To'lov turini haydovchi yetkazganda belgilaydi
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
