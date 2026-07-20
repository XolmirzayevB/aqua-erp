"use client";

// Haydovchi uchun maxsus buyurtmalar sahifasi (mobil-birinchi).
// - HUDUD bo'yicha filtr: haydovchi hududni bosib, faqat shu hududdagi zakazlarni ko'radi.
// - JAMI TARA: yuqorida ko'zga tashlanadigan katta ko'rsatkich — bugun nechta tara olish kerak.
// Ma'lumot manbai — useDriverDayOrders (bugungi to'liq to'plam: yopilmagan + bugun yetkazilgan),
// shuning uchun sahifalashsiz, hisoblar aniq va hudud chiplari real ma'lumotdan chiqadi.

import { useState } from "react";
import Link from "next/link";
import { Droplets, Navigation, CheckCircle, Search, PackagePlus, Wallet, MapPin, Phone } from "lucide-react";
import { useDriverDayOrders, Order } from "@/hooks/use-orders";
import { useMyTodayExpenses } from "@/hooks/use-finance";
import { DriverExpenseModal } from "@/components/finance/driver-expense-modal";
import { DeliverModal } from "./deliver-modal";
import { useAuthStore } from "@/store/auth.store";
import { StatusBadge } from "./status-badge";
import { formatCurrency, formatPhone, formatDate, cn } from "@/lib/utils";
import { directionsUrl } from "@/lib/nav";
import { PageHeader, Pill, cardClass } from "@/components/shared/page-ui";

const NO_ZONE = "__none__";

export function DriverOrders() {
  const driverId = useAuthStore((s) => s.user?.id);
  const { data: orders = [], isLoading } = useDriverDayOrders(driverId);

  const [zone, setZone] = useState<string | null>(null); // null = barcha hududlar
  const [tab, setTab] = useState<"pending" | "delivered" | "cancelled">("pending");
  const [search, setSearch] = useState("");
  const [showExpense, setShowExpense] = useState(false);
  // "Yetkazildi" bosilganda to'lov turini so'raydigan modal
  const [deliverOrder, setDeliverOrder] = useState<Order | null>(null);
  const { data: myExpenses } = useMyTodayExpenses();

  const active = orders.filter((o) => o.status !== "CANCELLED");
  const pending = active.filter((o) => o.status !== "DELIVERED");
  const delivered = active.filter((o) => o.status === "DELIVERED");
  // Bugun bekor qilinganlar — haydovchi bilib tursin (yuk/marshrut hisobiga kirmaydi)
  const cancelled = orders.filter((o) => o.status === "CANCELLED");

  // Tanlangan hududga moslik (null = barchasi, NO_ZONE = hududsiz mijozlar)
  const inZone = (z?: string | null) =>
    zone === null ? true : zone === NO_ZONE ? !z : z === zone;

  // Hudud chiplari — faqat YETKAZILMAGAN buyurtmalardan (bugungi ish), har hudud + soni
  const zoneMap = new Map<string, number>();
  pending.forEach((o) => {
    const z = o.customer.zone || NO_ZONE;
    zoneMap.set(z, (zoneMap.get(z) || 0) + 1);
  });
  const zoneChips = [...zoneMap.entries()].sort((a, b) =>
    a[0] === NO_ZONE ? 1 : b[0] === NO_ZONE ? -1 : a[0].localeCompare(b[0])
  );

  // Sarlavha hisobi — tanlangan hudud bo'yicha yetkazilmagan yuk
  const pendingInZone = pending.filter((o) => inZone(o.customer.zone));
  const deliveredInZone = delivered.filter((o) => inZone(o.customer.zone));
  const totalBottles = pendingInZone.reduce((s, o) => s + o.quantity, 0);
  const newBottles = pendingInZone.reduce((s, o) => s + (o.newBottles || 0), 0);

  // Ro'yxat: tab (yetkazilmagan/yetkazilgan/bekor) + hudud + qidiruv
  const base = tab === "pending" ? pending : tab === "delivered" ? delivered : cancelled;
  const q = search.trim().toLowerCase();
  const list = base
    .filter((o) => inZone(o.customer.zone))
    .filter((o) => {
      if (!q) return true;
      if (/^#?\d+$/.test(q)) return String(o.seq) === q.replace("#", "");
      return o.customer.name.toLowerCase().includes(q) || o.customer.phone.includes(q);
    });

  const zoneLabel = zone === null ? "Bugungi yuk" : zone === NO_ZONE ? "Hududsiz" : `${zone} hudud`;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Buyurtmalar"
        subtitle={`${formatDate(new Date(), "d-MMMM, EEEE")} · sizga biriktirilgan`}
      >
        {/* Haydovchi o'z xarajatini (benzin, ovqat...) shu yerdan kiritadi */}
        <button
          onClick={() => setShowExpense(true)}
          className="inline-flex items-center gap-2 h-[42px] px-4 rounded-xl bg-white dark:bg-gray-900 text-red-600 dark:text-red-400 border border-gray-100 dark:border-gray-800 text-[13.5px] font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <Wallet className="w-4 h-4" />
          Xarajat
          {myExpenses && myExpenses.total > 0 && (
            <span className="tabular-nums text-[12px] font-bold">
              −{new Intl.NumberFormat("uz-UZ").format(myExpenses.total)}
            </span>
          )}
        </button>
      </PageHeader>

      {/* ── JAMI TARA — ko'zga tashlanadigan asosiy ko'rsatkich ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-glow p-5 mb-4">
        <Droplets className="absolute -right-3 -bottom-3 w-24 h-24 text-white/10" />
        <div className="relative">
          <p className="text-[13px] font-medium text-blue-100">{zoneLabel}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[42px] leading-none font-bold tabular-nums">{totalBottles}</span>
            <span className="text-[17px] font-semibold text-blue-100">ta tara</span>
          </div>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 text-[13px] text-blue-50">
            <span className="tabular-nums">{pendingInZone.length} buyurtma qoldi</span>
            {deliveredInZone.length > 0 && (
              <span className="tabular-nums flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> {deliveredInZone.length} yetkazildi
              </span>
            )}
            {newBottles > 0 && (
              <span className="tabular-nums flex items-center gap-1">
                <PackagePlus className="w-3.5 h-3.5" /> {newBottles} yangi tara
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── HUDUD chiplari — bosib shu hududdagi zakazlarni ko'rish ── */}
      {zoneChips.length > 0 && (
        <div className="mb-3">
          <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500 mb-1.5 px-0.5">Hudud bo'yicha</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <ZoneChip active={zone === null} onClick={() => setZone(null)} label="Barchasi" count={pending.length} />
            {zoneChips.map(([z, count]) => (
              <ZoneChip
                key={z}
                active={zone === z}
                onClick={() => setZone(z)}
                label={z === NO_ZONE ? "Hududsiz" : z}
                count={count}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Holat tablari + qidiruv ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="inline-flex gap-1 p-1 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 rounded-xl">
          <TabBtn active={tab === "pending"} onClick={() => setTab("pending")} label="Qoldi" count={pendingInZone.length} />
          <TabBtn active={tab === "delivered"} onClick={() => setTab("delivered")} label="Yetkazildi" count={deliveredInZone.length} />
          {cancelled.length > 0 && (
            <TabBtn active={tab === "cancelled"} onClick={() => setTab("cancelled")} label="Bekor" count={cancelled.filter((o) => inZone(o.customer.zone)).length} />
          )}
        </div>
        <div className="flex items-center gap-2.5 h-10 px-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[11px] flex-1 min-w-[160px] max-w-xs focus-within:border-blue-300 dark:focus-within:border-blue-700 transition-colors">
          <Search className="w-4 h-4 text-gray-400 flex-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="№ yoki mijoz..."
            className="bg-transparent text-[13.5px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none w-full"
          />
        </div>
      </div>

      {/* ── Buyurtmalar ro'yxati (kartalar) ── */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn(cardClass, "p-4")}>
              <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-2" />
              <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))
        ) : list.length === 0 ? (
          <p className={cn(cardClass, "px-5 py-12 text-center text-gray-400 dark:text-gray-500")}>
            {tab === "pending" ? "Yetkazilishi kerak bo'lgan buyurtma yo'q"
              : tab === "delivered" ? "Yetkazilgan buyurtma yo'q"
              : "Bugun bekor qilingan buyurtma yo'q"}
          </p>
        ) : (
          list.map((order) => (
            <div key={order.id} className={cn(cardClass, "p-4 border-gray-200 dark:border-gray-700 shadow-card")}>
              {/* 2026-07-20 (egasi so'rovi): ISM/TELEFON/MANZIL birinchi ko'zga
                  tashlanadi, zakaz raqami kichik chekkada, "biriktirilgan"
                  yozuvi ko'rsatilmaydi (bekorda badge qoladi). */}
              {/* 1-qator: ISM (katta) + kichik #raqam chekkada */}
              <div className="flex items-start justify-between gap-2">
                <Link href={`/orders/${order.id}`} className="text-[16.5px] font-bold text-gray-900 dark:text-white leading-snug flex-1 min-w-0 truncate">
                  {order.customer.name}
                </Link>
                <Link href={`/orders/${order.id}`} className="flex-none font-mono text-[12px] font-bold text-blue-600 dark:text-blue-400 tabular-nums mt-1">
                  #{order.seq}
                </Link>
              </div>

              {/* 2-qator: telefon (bosilsa qo'ng'iroq) */}
              <a href={`tel:${order.customer.phone}`} className="block font-mono text-[14.5px] font-semibold text-gray-700 dark:text-gray-200 mt-1 tabular-nums">
                {formatPhone(order.customer.phone)}
              </a>

              {/* 3-qator: MANZIL — tanlangan lokatsiya (Apteka, Uy...) bo'lsa O'SHA,
                  haydovchi adashib asosiy manzilga olib bormasin */}
              <span className="flex items-start gap-1.5 mt-1 text-[13px] text-gray-600 dark:text-gray-300 leading-snug">
                <MapPin className={cn("w-3.5 h-3.5 flex-none mt-0.5", order.location ? "text-amber-500" : "text-gray-400")} />
                <span className="min-w-0">
                  {order.location ? (
                    <>
                      <b className="text-amber-700 dark:text-amber-400">{order.location.label}</b>
                      {order.location.address ? ` — ${order.location.address}` : ""}
                    </>
                  ) : (
                    order.customer.address || "Manzil kiritilmagan"
                  )}
                  {order.customer.zone ? ` · ${order.customer.zone}` : ""}
                </span>
              </span>

              {/* Bekor qilingan tab'da holat belgisi qoladi */}
              {order.status === "CANCELLED" && (
                <span className="block mt-1.5"><StatusBadge status={order.status} /></span>
              )}
              {/* Avvalgi kunlardan qolib ketgan zakaz — haydovchi bilib tursin */}
              {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (() => {
                const days = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86400000);
                return days >= 1 ? (
                  <span className="block mt-1 text-[11.5px] font-semibold text-red-500 dark:text-red-400">
                    ⏰ {days} kun oldin yozilgan
                  </span>
                ) : null;
              })()}

              {/* 3-qator: tara/summa (+ yetkazilgan SOATI — 00:26 dagi tungi yetkazish
                  ham "bugun"ga tushishi chalkashtirmasin) + amallar */}
              <div className="flex items-center justify-between gap-2 mt-2.5">
                <div className="text-[13px] text-gray-700 dark:text-gray-300">
                  <span className="font-semibold tabular-nums">{order.quantity} ta tara</span>
                  <span className="text-gray-300 dark:text-gray-600"> · </span>
                  <span className="font-bold tabular-nums">{formatCurrency(order.totalAmount)}</span>
                  {order.status === "DELIVERED" && order.deliveredAt && (
                    <span className="text-[12px] font-medium text-green-600 dark:text-green-400 tabular-nums">
                      {" "}· {formatDate(order.deliveredAt, "HH:mm")} da
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {/* 📞 Qo'ng'iroq — faqat ochiq zakazlarda (yopilgan/bekorda shart emas) */}
                  {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                    <a
                      href={`tel:${order.customer.phone}`}
                      title="Mijozga qo'ng'iroq qilish"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-[9px] border border-blue-200 dark:border-blue-500/40 bg-blue-50/60 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  {(() => {
                    // Navigatsiya — Google Maps ILOVASIDA (web emas), marshrut tuzadi.
                    // Tanlangan lokatsiya (Apteka...) bo'lsa — O'SHA joyga yo'naltiradi.
                    const nav = order.location
                      ? directionsUrl(order.location.lat, order.location.lng, order.location.locationLink)
                      : directionsUrl(order.customer.lat, order.customer.lng, order.customer.locationLink);
                    return nav ? (
                      <a
                        href={nav}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-[9px] border border-gray-100 dark:border-gray-800 text-green-600 dark:text-green-400"
                      >
                        <Navigation className="w-4 h-4" />
                      </a>
                    ) : null;
                  })()}
                  {order.status === "ASSIGNED" && (
                    <button
                      onClick={() => setDeliverOrder(order)}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Yetkazildi
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showExpense && <DriverExpenseModal onClose={() => setShowExpense(false)} />}
      {/* Yetkazildi → to'lov turini tanlash (naqd/karta/nasiya) */}
      {deliverOrder && (
        <DeliverModal order={deliverOrder} onClose={() => setDeliverOrder(null)} />
      )}
    </div>
  );
}

/* ── Hudud chipi (kattaroq, mobilda bosishga qulay) ── */
function ZoneChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 h-10 pl-3.5 pr-2.5 rounded-xl border whitespace-nowrap transition-all flex-none",
        active
          ? "bg-blue-600 text-white border-blue-600 shadow-card"
          : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
      )}
    >
      <span className="text-[13.5px] font-semibold">{label}</span>
      <span
        className={cn(
          "text-[11.5px] font-bold px-1.5 py-px rounded-full tabular-nums",
          active ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
        )}
      >
        {count}
      </span>
    </button>
  );
}

/* ── Holat tabi ── */
function TabBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold whitespace-nowrap transition-all",
        active
          ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-card"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      )}
    >
      {label}
      <span
        className={cn(
          "text-[11px] font-bold px-1.5 py-px rounded-full tabular-nums",
          active ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300" : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
        )}
      >
        {count}
      </span>
    </button>
  );
}
