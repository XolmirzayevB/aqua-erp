"use client";

// Haydovchi kunlik marshruti — Leaflet + OpenStreetMap (bepul, API kalitsiz).
// YURISH TARTIBI ENG QISQA YO'L bo'yicha avtomatik hisoblanadi:
// nearest-neighbor + 2-opt; boshlang'ich nuqta — haydovchining joriy GPS joyi
// (ruxsat berilmagan bo'lsa birinchi zakazdan boshlanadi).
// Yetkazilganlar XARITADA KO'RSATILMAYDI, ro'yxatda pastga tushadi.
// Xarita sticky — ro'yxat aylantirilganda ham ko'rinib turadi.
// Leaflet `window` talab qiladi — shuning uchun useEffect ichida dinamik import.

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Navigation, MapPinOff, Phone, LocateFixed, CheckCircle } from "lucide-react";
import { useDriverDayOrders } from "@/hooks/use-orders";
import { StatusBadge } from "@/components/orders/status-badge";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { directionsUrl } from "@/lib/nav";
import { cardClass } from "@/components/shared/page-ui";

interface Stop {
  id: string;
  seq: number;
  n: number; // yurish tartibi (1,2,3...) — optimallashtirilgandan keyin
  lat: number;
  lng: number;
  name: string;
  phone: string;
  address: string;
  quantity: number;
  amount: number;
  status: string;
  locationLink?: string;
  zone?: string | null;
  legKm: number; // oldingi nuqtadan masofa
}

// ─── Masofa (haversine, km) ───
function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

// ─── Eng qisqa yo'l: nearest-neighbor + 2-opt ───
// start — haydovchining joriy joyi (bo'lsa); undan boshlab umumiy yo'l minimallashtiriladi.
function optimizeRoute<T extends { lat: number; lng: number }>(points: T[], start: { lat: number; lng: number } | null): T[] {
  if (points.length <= 1) return [...points];

  // 1) Nearest-neighbor: har safar eng yaqiniga boramiz
  const rem = [...points];
  let route: T[] = [];
  let cur: { lat: number; lng: number };
  if (start) {
    cur = start;
  } else {
    route.push(rem.shift()!);
    cur = route[0];
  }
  while (rem.length) {
    let bi = 0;
    let bd = Infinity;
    rem.forEach((p, i) => {
      const d = distKm(cur, p);
      if (d < bd) { bd = d; bi = i; }
    });
    const next = rem.splice(bi, 1)[0];
    route.push(next);
    cur = next;
  }

  // 2) 2-opt: bo'laklarni teskari aylantirib umumiy yo'lni qisqartiramiz
  const total = (r: T[]) => {
    let t = 0;
    let prev: { lat: number; lng: number } = start ?? r[0];
    const list = start ? r : r.slice(1);
    for (const p of list) { t += distKm(prev, p); prev = p; }
    return t;
  };
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 25) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const cand = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
        if (total(cand) + 1e-9 < total(route)) {
          route = cand;
          improved = true;
        }
      }
    }
  }
  return route;
}

// sticky — xarita tepada yopishib turadi (faqat /route sahifasida yoqiladi;
// driver-detail kabi boshqa kontent bor sahifalarda scroll'ga xalaqit beradi)
export function RouteMap({ driverId, date, sticky = false }: { driverId?: string; date?: string; sticky?: boolean }) {
  const { data: orders = [], isLoading } = useDriverDayOrders(driverId, date);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  // ─── Jonli lokatsiya (Google Maps'dagi "ko'k nuqta" kabi) ───
  const posRef = useRef<{ lat: number; lng: number; acc: number } | null>(null);
  const myMarkerRef = useRef<any>(null);
  const myCircleRef = useRef<any>(null);
  const followRef = useRef(false); // kuzatish: yoqilsa xarita men bilan birga yuradi
  const [following, setFollowing] = useState(false);
  const [geoState, setGeoState] = useState<"off" | "on" | "denied">("off");
  // GPS FAQAT haydovchi so'raganda yoqiladi — ilova ochilganda ruxsat SO'RALMAYDI.
  // Sessiya davomida (bir marta yoqilsa) esda qoladi; ilova qayta ochilsa yana o'chiq.
  const [geoEnabled, setGeoEnabled] = useState(false);
  // Marshrut hisobi uchun joriy joy (50m dan ko'p siljigandagina yangilanadi —
  // aks holda har GPS tebranishida marshrut qayta hisoblanib "sakrab" turadi)
  const [geoPos, setGeoPos] = useState<{ lat: number; lng: number } | null>(null);

  // Ko'k nuqtani chizish/yangilash (harakatda jonli suriladi)
  const drawMyLocation = async (pan = false) => {
    const map = mapInstance.current;
    const pos = posRef.current;
    if (!map || !pos) return;
    const L = (await import("leaflet")).default;
    if (!mapInstance.current) return;
    if (!myMarkerRef.current) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:22px;height:22px;">
          <div style="position:absolute;inset:-10px;border-radius:50%;background:rgba(37,99,235,.28);animation:aqGeoPing 2s ease-out infinite;"></div>
          <div style="position:absolute;inset:0;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 1px 6px rgba(16,24,40,.45);"></div>
        </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      myMarkerRef.current = L.marker([pos.lat, pos.lng], {
        icon, zIndexOffset: 1000, interactive: false, keyboard: false,
      }).addTo(map);
      // Aniqlik doirasi (GPS xatolik radiusi)
      myCircleRef.current = L.circle([pos.lat, pos.lng], {
        radius: Math.min(pos.acc, 300),
        color: "#2563EB", weight: 1, opacity: 0.3,
        fillColor: "#2563EB", fillOpacity: 0.08, interactive: false,
      }).addTo(map);
    } else {
      myMarkerRef.current.setLatLng([pos.lat, pos.lng]);
      myCircleRef.current?.setLatLng([pos.lat, pos.lng]);
      myCircleRef.current?.setRadius(Math.min(pos.acc, 300));
    }
    if (pan || followRef.current) {
      map.panTo([pos.lat, pos.lng], { animate: true });
    }
  };

  // Sessiya davomida GPS yoqilgan bo'lsa — remount'da qayta tiklaymiz
  // (bir sessiyada takror ruxsat so'ralmaydi; yangi ochilishда tozalanadi)
  useEffect(() => {
    try {
      if (sessionStorage.getItem("aqua-geo-on") === "1") setGeoEnabled(true);
    } catch { /* sessionStorage yo'q — e'tiborsiz */ }
  }, []);

  // GPS kuzatuvi — FAQAT haydovchi tugmani bosib yoqqanda ishga tushadi
  useEffect(() => {
    if (!geoEnabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const cur = { lat: p.coords.latitude, lng: p.coords.longitude };
        posRef.current = { ...cur, acc: p.coords.accuracy || 30 };
        setGeoState("on");
        setGeoPos((prev) => (!prev || distKm(prev, cur) > 0.05 ? cur : prev));
        drawMyLocation();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoState("denied");
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoEnabled]);

  // Bekor qilinganlar marshrutga kirmaydi; yetkazilganlar alohida (pastda)
  const active = orders.filter((o) => o.status !== "CANCELLED");
  const deliveredOrders = active.filter((o) => o.status === "DELIVERED");
  const pendingOrders = active.filter((o) => o.status !== "DELIVERED");

  // Kutilayotganlar: koordinatalilarni ENG QISQA YO'L bo'yicha tartiblaymiz
  const pendingKey = JSON.stringify(pendingOrders.map((o) => [o.id, o.customer.lat, o.customer.lng]));
  const { stops, noCoords, totalKm } = useMemo(() => {
    const withCoords: Stop[] = [];
    const noC: typeof pendingOrders = [];
    pendingOrders.forEach((o) => {
      const lat = o.customer.lat != null ? Number(o.customer.lat) : NaN;
      const lng = o.customer.lng != null ? Number(o.customer.lng) : NaN;
      if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
        withCoords.push({
          id: o.id, seq: o.seq, n: 0, lat, lng,
          name: o.customer.name, phone: o.customer.phone, address: o.customer.address,
          quantity: o.quantity, amount: Number(o.totalAmount), status: o.status,
          locationLink: o.customer.locationLink, zone: o.customer.zone, legKm: 0,
        });
      } else {
        noC.push(o);
      }
    });

    const ordered = optimizeRoute(withCoords, geoPos);
    let prev: { lat: number; lng: number } | null = geoPos;
    let total = 0;
    ordered.forEach((s, i) => {
      s.n = i + 1;
      s.legKm = prev ? distKm(prev, s) : 0;
      total += s.legKm;
      prev = s;
    });
    return { stops: ordered, noCoords: noC, totalKm: total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey, geoPos?.lat, geoPos?.lng]);

  useEffect(() => {
    if (!mapRef.current || stops.length === 0) {
      // Barchasi yetkazilgan bo'lsa xaritani tozalaymiz
      if (stops.length === 0 && mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      return;
    }
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      // Eski xaritani tozalaymiz (ma'lumot yangilanganda qayta chiziladi)
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      const map = L.map(mapRef.current, { scrollWheelZoom: false });
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Marshrut chizig'i (punktir) — joriy joydan boshlanadi
      const linePoints: [number, number][] = [
        ...(geoPos ? [[geoPos.lat, geoPos.lng] as [number, number]] : []),
        ...stops.map((s) => [s.lat, s.lng] as [number, number]),
      ];
      if (linePoints.length > 1) {
        L.polyline(linePoints, {
          color: "#2563EB", weight: 3, opacity: 0.45, dashArray: "6 10",
        }).addTo(map);
      }

      // Raqamlangan pinlar — faqat kutilayotganlar (yetkazilganlar chiqarilmaydi)
      stops.forEach((s) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 4px;transform:rotate(0deg);background:#2563EB;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;font-family:Inter,sans-serif;border:3px solid #fff;box-shadow:0 2px 8px rgba(16,24,40,.35);">${s.n}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 30],
          popupAnchor: [0, -28],
        });
        // Navigatsiya — Google Maps ILOVASIDA ochiladi (web emas), marshrut tuzadi
        const gmaps = directionsUrl(s.lat, s.lng, s.locationLink);
        const popup = `
          <div style="font-family:Inter,sans-serif;min-width:190px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${s.n}. ${s.name}${s.zone ? ` <span style="background:#EFF4FF;color:#2563EB;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700;vertical-align:middle;">${s.zone} hudud</span>` : ""}</div>
            <div style="font-size:12px;color:#6B7280;margin-bottom:6px;">#${s.seq} · ${s.quantity} ta suv · ${new Intl.NumberFormat("uz-UZ").format(s.amount)} so'm</div>
            <div style="font-size:12px;color:#374151;margin-bottom:8px;">${s.address}</div>
            <div style="display:flex;gap:6px;">
              <a href="tel:${s.phone}" style="flex:1;text-align:center;background:#F4F6FA;color:#111;border-radius:8px;padding:6px 8px;font-size:12px;font-weight:600;text-decoration:none;">📞 Qo'ng'iroq</a>
              <a href="${gmaps}" target="_blank" style="flex:1;text-align:center;background:#16A34A;color:#fff;border-radius:8px;padding:6px 8px;font-size:12px;font-weight:600;text-decoration:none;">🧭 Borish</a>
            </div>
          </div>`;
        L.marker([s.lat, s.lng], { icon }).addTo(map).bindPopup(popup);
      });

      // Barcha pinlar ko'rinadigan qilib markazlash (mening joyim ham hisobga olinadi)
      const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng] as [number, number]));
      if (posRef.current) bounds.extend([posRef.current.lat, posRef.current.lng]);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });

      // Foydalanuvchi xaritani qo'lda surса — kuzatishni to'xtatamiz
      map.on("dragstart", () => {
        followRef.current = false;
        setFollowing(false);
      });

      // Yangi xaritada ko'k nuqtani qayta chizamiz
      myMarkerRef.current = null;
      myCircleRef.current = null;
      drawMyLocation();
    })();

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
    // stops tartibi optimallashtirishdan keladi — o'zgarsa qayta chizamiz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stops.map((s) => s.id)), geoPos?.lat, geoPos?.lng]);

  if (isLoading) {
    return <div className="h-[380px] md:h-[480px] bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />;
  }

  if (active.length === 0) {
    return (
      <div className={cn(cardClass, "p-10 text-center")}>
        <MapPinOff className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-gray-400">Bugun uchun buyurtma yo'q</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Xarita — sticky bo'lsa ro'yxat aylantirilganda ham tepada ko'rinib turadi */}
      {stops.length > 0 ? (
        <div className={cn(cardClass, "overflow-hidden", sticky && "sticky top-0 z-20")}>
          <div className="relative">
            <div ref={mapRef} className="h-[38vh] min-h-[260px] md:h-[420px] w-full z-0" />
            {/* Joyimga qaytish / kuzatish tugmasi */}
            <button
              onClick={() => {
                // Birinchi bosishda GPS yoqiladi (ruxsat SHUNDA so'raladi, ilova ochilganda emas)
                if (!geoEnabled) {
                  setGeoEnabled(true);
                  try { sessionStorage.setItem("aqua-geo-on", "1"); } catch { /* e'tiborsiz */ }
                }
                followRef.current = true;
                setFollowing(true);
                drawMyLocation(true);
              }}
              title={geoState === "denied" ? "Lokatsiyaga ruxsat berilmagan" : "Mening joyim"}
              className={cn(
                "absolute bottom-3 right-3 z-[800] w-11 h-11 rounded-full flex items-center justify-center border shadow-card-hover transition-colors",
                following && geoState === "on"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <LocateFixed className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-400/70 dark:border-gray-600 text-[12px] text-gray-500 dark:text-gray-400 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow flex-none" /> Navbatdagi
            </span>
            {geoState === "on" && (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-none" /> Jonli lokatsiya
              </span>
            )}
            {!geoEnabled && geoState !== "denied" && (
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                <LocateFixed className="w-3.5 h-3.5" /> Joyingizni ko'rish uchun tugmani bosing
              </span>
            )}
            {geoState === "denied" && (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-300 font-medium">
                Lokatsiyaga ruxsat bering (brauzer sozlamasi)
              </span>
            )}
            <span className="ml-auto tabular-nums">
              {stops.length} nuqta{totalKm > 0 ? ` · ≈${fmtKm(totalKm)}` : ""}
            </span>
          </div>
        </div>
      ) : (
        <div className={cn(cardClass, "p-6 text-center")}>
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {noCoords.length > 0
              ? "Xaritada ko'rsatiladigan buyurtma qolmadi (qolganlarida lokatsiya yo'q)"
              : "Barcha buyurtmalar yetkazildi! 🎉"}
          </p>
        </div>
      )}

      {/* Yurish tartibi ro'yxati — eng qisqa yo'l bo'yicha */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="px-4 md:px-5 py-3.5 flex items-baseline gap-2 flex-wrap">
          <span className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">Yurish tartibi</span>
          {stops.length > 1 && (
            <span className="text-[11.5px] text-gray-400 dark:text-gray-500">
              eng qisqa yo'l bo'yicha hisoblangan{geoPos ? " (joyingizdan boshlab)" : ""}
            </span>
          )}
        </div>
        <div>
          {/* Navbatdagi buyurtmalar — optimallashtirilgan tartibda */}
          {stops.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 md:px-5 py-3 border-t border-gray-400/70 dark:border-gray-600 even:bg-gray-50 dark:even:bg-gray-800/25">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-none tabular-nums bg-blue-600">
                {s.n}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/orders/${s.id}?from=route`} className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {s.name}
                  </Link>
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 flex-none">#{s.seq}</span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  {s.legKm > 0 && <span className="text-blue-600/80 dark:text-blue-400/80 font-medium">≈{fmtKm(s.legKm)} · </span>}
                  {s.quantity} ta · {formatCurrency(s.amount)} · {s.address}
                </div>
              </div>
              <a
                href={directionsUrl(s.lat, s.lng, s.locationLink) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                title="Borish"
                className="w-9 h-9 rounded-[10px] bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-colors flex-none"
              >
                <Navigation className="w-4 h-4" />
              </a>
            </div>
          ))}

          {/* Lokatsiyasi yo'q buyurtmalar */}
          {noCoords.map((o) => (
            <div key={o.id} className="flex items-center gap-3 px-4 md:px-5 py-3 border-t border-gray-400/70 dark:border-gray-600 bg-amber-50/40 dark:bg-amber-500/5">
              <span className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 flex-none">
                <MapPinOff className="w-3.5 h-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/orders/${o.id}?from=route`} className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {o.customer.name}
                  </Link>
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 flex-none">#{o.seq}</span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  Lokatsiya yo'q · {o.customer.address}
                </div>
              </div>
              <a
                href={`tel:${o.customer.phone}`}
                title={formatPhone(o.customer.phone)}
                className="w-9 h-9 rounded-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors flex-none"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          ))}

          {/* Yetkazilganlar — ro'yxat oxirida, xiraroq */}
          {deliveredOrders.map((o) => (
            <div key={o.id} className="flex items-center gap-3 px-4 md:px-5 py-3 border-t border-gray-400/70 dark:border-gray-600 opacity-60">
              <span className="w-7 h-7 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex-none">
                <CheckCircle className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/orders/${o.id}?from=route`} className="text-[13.5px] font-semibold text-gray-600 dark:text-gray-300 truncate line-through decoration-gray-300 dark:decoration-gray-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {o.customer.name}
                  </Link>
                  <span className="font-mono text-xs font-bold text-gray-400 flex-none">#{o.seq}</span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  {o.quantity} ta · {formatCurrency(Number(o.totalAmount))}
                </div>
              </div>
              <span className="flex-none"><StatusBadge status={o.status as any} /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
