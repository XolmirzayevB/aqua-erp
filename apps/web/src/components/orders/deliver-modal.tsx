"use client";

// "Yetkazildi" bosilganda chiqadigan TO'LOV TANLASH modali (2026-07-16).
// Haydovchi zakazni yopayotganda pul qanday kelganini belgilaydi:
// Naqd / Karta (Click) / Nasiya. Operator zakaz yozganda to'lov TANLAMAYDI —
// bu haydovchining ishi (egasi so'rovi).
// Eski zakazlarda to'lov avvaldan belgilangan bo'lsa — faqat tasdiq so'raladi.
// ARALASH / QISMAN (2026-10-11, egasi so'rovi): mijoz yarmini naqd, yarmini
// klik qilsa yoki to'liq bermasa — haydovchi qancha naqd va qancha klik
// olganini yozadi, qolgani avtomatik mijoz qarziga o'tadi.

import { useState } from "react";
import { X, Loader2, CheckCircle, Banknote, CreditCard, NotebookPen, Gift, MapPin, Split } from "lucide-react";
import { useUpdateOrderStatus, Order, OrderLocation } from "@/hooks/use-orders";
import { getPreciseLocation, PreciseLocation } from "@/lib/geo";
import { formatCurrency, cn } from "@/lib/utils";

interface Props {
  order: Pick<Order, "id" | "seq" | "totalAmount" | "paymentType"> & {
    customer: { name: string; lat?: number | string | null; lng?: number | string | null; locationLink?: string | null };
    location?: OrderLocation | null;
  };
  onClose: () => void;
  onDone?: () => void;
}

const OPTIONS = [
  { value: "CASH", label: "Naqd", desc: "Pul qo'lda olindi", icon: Banknote, active: "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400" },
  // Klik: pul moliyaga OPERATOR TASDIQLAGACH tushadi (12 soatda tasdiqlanmasa nasiya)
  { value: "CARD", label: "Karta / Click", desc: "Operator tasdiqlagach tushadi", icon: CreditCard, active: "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  // Aralash/qisman: naqd + klik summalari yoziladi, qolgani qarzga o'tadi
  { value: "MIXED", label: "Aralash / qisman", desc: "Naqd + klik, qolgani qarzga", icon: Split, active: "border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400" },
  { value: "DEBT", label: "Nasiya", desc: "Qarzga yozildi", icon: NotebookPen, active: "border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  // Imtiyozli zakaz (prokuratura kabi) — pul olinmaydi, moliyaga hech narsa yozilmaydi
  { value: "FREE", label: "Bepul (imtiyoz)", desc: "Pul olinmaydi", icon: Gift, active: "border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400" },
] as const;

// Summa maydoni: faqat raqam, minglik ajratgich bilan ko'rinadi ("30,000")
const fmtAmount = (n: number) => (n > 0 ? new Intl.NumberFormat("uz-UZ").format(n) : "");
const parseAmount = (v: string) => parseInt(v.replace(/\D/g, "").slice(0, 9)) || 0;

export function DeliverModal({ order, onClose, onDone }: Props) {
  // Eski zakazda to'lov avvaldan bor — o'zgartirib bo'lmaydi, faqat tasdiqlanadi
  const locked = !!order.paymentType;
  const [payment, setPayment] = useState<"CASH" | "CARD" | "DEBT" | "FREE" | "MIXED">(order.paymentType || "CASH");
  const updateStatus = useUpdateOrderStatus();

  // ARALASH / QISMAN: qancha naqd, qancha klik — qolgani qarzga
  const total = Number(order.totalAmount);
  const [cash, setCash] = useState(0);
  const [card, setCard] = useState(0);
  const mixed = payment === "MIXED";
  const paid = cash + card;
  const debt = total - paid;
  const over = paid > total;
  // Hech narsa kiritilmagan — bu shunchaki nasiya, alohida tugmasi bor
  const mixedEmpty = mixed && paid === 0;

  // 📍 LOKATSIYANI SAQLASH (2026-07-20, egasi so'rovi): haydovchi mijoz uyida
  // turib tugmani yoqadi — zakaz yopilganda uning GPS joyi mijozga yoziladi.
  // Zakaz QO'SHIMCHA manzilga (Do'kon, Apteka...) berilgan bo'lsa — o'sha
  // manzilga; aks holda mijozning asosiy kartasiga. ADASHMASLIK uchun qayerga
  // yozilishi va mavjud lokatsiya bor-yo'qligi aniq ko'rsatiladi.
  const [geoState, setGeoState] = useState<"off" | "loading" | "ready" | "error">("off");
  const [geo, setGeo] = useState<PreciseLocation | null>(null);
  const [geoError, setGeoError] = useState("");

  // Qayerga yoziladi — tanlangan manzilmi yoki asosiy mijozmi
  const targetLabel = order.location
    ? `"${order.location.label}" manziliga`
    : "mijozning asosiy manziliga";
  // Mavjud lokatsiya (koordinata yoki havola) bormi — ustiga yozilishidan ogohlantirish
  const hasExisting = order.location
    ? order.location.lat != null || !!order.location.locationLink
    : order.customer.lat != null || !!order.customer.locationLink;

  const handleGeoToggle = async () => {
    // Tayyor bo'lsa qayta bosish = bekor qilish (saqlanmaydi)
    if (geoState === "ready") {
      setGeo(null);
      setGeoState("off");
      return;
    }
    if (geoState === "loading") return;
    setGeoState("loading");
    setGeoError("");
    try {
      const pos = await getPreciseLocation();
      setGeo(pos);
      setGeoState("ready");
    } catch (e: any) {
      setGeoError(e?.message || "Joylashuv aniqlanmadi");
      setGeoState("error");
    }
  };

  const handleConfirm = async () => {
    await updateStatus.mutateAsync({
      id: order.id,
      status: "DELIVERED",
      // Belgilangan bo'lsa yubormaymiz (backend o'zgartirishga ruxsat bermaydi)
      ...(locked ? {} : { paymentType: payment }),
      ...(mixed ? { cashAmount: cash, cardAmount: card } : {}),
      // Lokatsiya tayyor bo'lsa — zakaz bilan BIRGA yoziladi (bitta amal, adashmaydi)
      ...(geo ? { driverLat: geo.lat, driverLng: geo.lng, locationAccuracy: geo.accuracy } : {}),
    });
    onDone?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[94dvh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-[20px] md:rounded-[20px] shadow-2xl border border-gray-100 dark:border-gray-800">
        {/* Sarlavha */}
        <div className="flex items-center gap-3.5 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-11 h-11 rounded-[13px] bg-green-50 dark:bg-green-500/15 flex items-center justify-center flex-none">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
              #{order.seq} — Yetkazildi
            </h2>
            <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
              {order.customer.name} · {formatCurrency(order.totalAmount)}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-none">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-[14.5px] font-semibold text-gray-800 dark:text-gray-200">
            To'lov qanday bo'ldi?
          </p>

          {/* To'lov variantlari — katta, barmoq bilan oson bosiladigan */}
          <div className="space-y-2">
            {OPTIONS.map(({ value, label, desc, icon: Icon, active }) => {
              const disabled = locked && value !== order.paymentType;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPayment(value)}
                  className={cn(
                    "w-full flex items-center gap-3.5 px-4 py-2 min-h-[56px] rounded-[14px] border-2 text-left transition-all",
                    payment === value
                      ? active
                      : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700",
                    disabled && "opacity-35 cursor-not-allowed"
                  )}
                >
                  <Icon className="w-6 h-6 flex-none" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15.5px] font-bold leading-tight">{label}</span>
                    <span className="block text-[12.5px] opacity-70 mt-0.5">{desc}</span>
                  </span>
                  <span
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none",
                      payment === value ? "border-current" : "border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {payment === value && <span className="w-2.5 h-2.5 rounded-full bg-current" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ARALASH / QISMAN — naqd va klik summalari; qolgani qarzga */}
          {mixed && !locked && (
            <div className="rounded-[14px] border-2 border-teal-200 dark:border-teal-500/30 bg-teal-50/40 dark:bg-teal-500/5 p-3.5 space-y-2.5">
              {([
                { key: "cash", label: "Naqd", icon: Banknote, value: cash, set: setCash, other: card },
                { key: "card", label: "Klik", icon: CreditCard, value: card, set: setCard, other: cash },
              ] as const).map(({ key, label, icon: Icon, value, set, other }) => (
                <div key={key} className="flex items-center gap-2.5">
                  <Icon className="w-5 h-5 flex-none text-gray-500 dark:text-gray-400" />
                  <span className="flex-1 min-w-0 text-[14px] font-semibold text-gray-800 dark:text-gray-200 truncate">{label}</span>
                  {/* Qolgan summani shu maydonga bir bosishda yozish */}
                  {total - other > 0 && value !== total - other && (
                    <button
                      type="button"
                      onClick={() => set(Math.max(0, total - other))}
                      className="flex-none h-8 px-2.5 rounded-[9px] border border-teal-300 dark:border-teal-500/40 bg-white dark:bg-gray-900 text-[11.5px] font-semibold text-teal-700 dark:text-teal-400 active:scale-95 transition-all"
                    >
                      qolgani
                    </button>
                  )}
                  <input
                    inputMode="numeric"
                    value={fmtAmount(value)}
                    onChange={(e) => set(parseAmount(e.target.value))}
                    placeholder="0"
                    aria-label={label}
                    className="flex-none w-[124px] h-[46px] px-3 text-right rounded-[12px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[17px] font-bold tabular-nums placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 transition-all"
                  />
                </div>
              ))}

              <div className="h-px bg-teal-200/70 dark:bg-teal-500/20" />

              {/* Natija: qarzga qancha qoladi */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13.5px] font-semibold text-gray-600 dark:text-gray-400">
                  {over ? "Ortiqcha kiritildi" : debt > 0 ? "Qarzga qoladi" : "To'liq to'landi"}
                </span>
                <span className={cn(
                  "text-[17px] font-bold tabular-nums",
                  over ? "text-red-500" : debt > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                )}>
                  {over ? formatCurrency(paid - total) : debt > 0 ? formatCurrency(debt) : "✓"}
                </span>
              </div>
            </div>
          )}

          {/* 📍 Lokatsiyani saqlash — haydovchi mijoz uyida turib yoqadi */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGeoToggle}
              className={cn(
                "w-full flex items-center gap-3.5 px-4 py-2 min-h-[58px] rounded-[14px] border-2 text-left transition-all",
                geoState === "ready"
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : geoState === "error"
                  ? "border-red-300 dark:border-red-500/50 bg-red-50/60 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                  : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:border-sky-300 dark:hover:border-sky-700"
              )}
            >
              {geoState === "loading" ? (
                <Loader2 className="w-6 h-6 flex-none animate-spin text-sky-500" />
              ) : (
                <MapPin className="w-6 h-6 flex-none" />
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-bold leading-tight">
                  {geoState === "ready"
                    ? `✓ Lokatsiya tayyor (~${Math.round(geo?.accuracy ?? 0)} m)`
                    : geoState === "loading"
                    ? "Joylashuv aniqlanmoqda..."
                    : "Lokatsiyani saqlash"}
                </span>
                <span className="block text-[12px] opacity-70 mt-0.5">
                  {geoState === "ready"
                    ? `Yopilganda ${targetLabel} yoziladi · bekor qilish uchun yana bosing`
                    : geoState === "loading"
                    ? "GPS aniqlashishini kuting (bir necha soniya)"
                    : `Hozir turgan joyingiz ${targetLabel} yoziladi`}
                </span>
              </span>
            </button>
            {geoState === "error" && (
              <p className="text-[12.5px] font-medium text-red-500">
                {geoError} — qayta urinish uchun tugmani bosing
              </p>
            )}
            {/* Aniqlik past bo'lsa — ochiq joyda qayta urinish tavsiyasi */}
            {geoState === "ready" && (geo?.accuracy ?? 0) > 50 && (
              <p className="text-[12.5px] font-medium text-amber-600 dark:text-amber-400">
                ⚠️ Aniqlik past (~{Math.round(geo!.accuracy)} m) — mijoz eshigi oldida, osmon ochiq joyda qayta urinib ko'ring
              </p>
            )}
            {/* Mavjud lokatsiya ustiga yozilishi haqida ogohlantirish */}
            {hasExisting && geoState !== "off" && (
              <p className="text-[12.5px] font-medium text-amber-600 dark:text-amber-400">
                Bu manzilda lokatsiya allaqachon bor — saqlansa YANGISI bilan almashadi
              </p>
            )}
            {hasExisting && geoState === "off" && (
              <p className="text-[12px] text-gray-400">
                ℹ️ Bu manzilda lokatsiya bor — odatda qayta saqlash shart emas
              </p>
            )}
          </div>

          {locked && (
            <p className="text-[12.5px] text-gray-400">
              Bu zakazda to'lov turi avvaldan belgilangan — faqat tasdiqlaysiz.
            </p>
          )}
          {!locked && payment === "DEBT" && (
            <p className="text-[13px] font-medium text-amber-600 dark:text-amber-400">
              {formatCurrency(order.totalAmount)} mijoz qarziga yoziladi — pul keyin olinadi
            </p>
          )}
          {!locked && mixed && over && (
            <p className="text-[13px] font-medium text-red-500">
              Kiritilgan pul zakaz summasidan ({formatCurrency(total)}) ko'p — summani to'g'rilang
            </p>
          )}
          {!locked && mixedEmpty && (
            <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
              Qancha naqd va qancha klik olinganini yozing. Hech narsa olinmagan bo'lsa — «Nasiya»ni tanlang.
            </p>
          )}
          {!locked && mixed && !over && !mixedEmpty && (debt > 0 || card > 0) && (
            <p className="text-[13px] font-medium text-amber-600 dark:text-amber-400">
              {debt > 0 && <>{formatCurrency(debt)} mijoz qarziga yoziladi. </>}
              {card > 0 && <>Klik qismi ({formatCurrency(card)}) operator tasdiqlagach hisobga tushadi.</>}
            </p>
          )}
          {!locked && payment === "FREE" && (
            <p className="text-[13px] font-medium text-violet-600 dark:text-violet-400">
              Imtiyozli zakaz — pul olinmaydi, tushumga ham, qarzga ham yozilmaydi
            </p>
          )}

          {/* Tasdiqlash */}
          <button
            onClick={handleConfirm}
            disabled={updateStatus.isPending || (mixed && !locked && (over || mixedEmpty))}
            className="w-full h-[54px] rounded-[14px] bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-[16px] font-bold shadow-glow transition-all flex items-center justify-center gap-2"
          >
            {updateStatus.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            Yetkazildi deb belgilash
          </button>
        </div>
      </div>
    </div>
  );
}
