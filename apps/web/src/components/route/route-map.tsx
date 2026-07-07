"use client";

// Haydovchi kunlik marshruti — Leaflet + OpenStreetMap (bepul, API kalitsiz).
// Pinlar yurish tartibida raqamlangan (buyurtma yaratilish tartibi),
// yetkazilganlar yashil, kutilayotganlar ko'k. Punktir chiziq marshrutni bog'laydi.
// Leaflet `window` talab qiladi — shuning uchun useEffect ichida dinamik import.

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Navigation, MapPinOff, Phone, LocateFixed } from "lucide-react";
import { useDriverDayOrders } from "@/hooks/use-orders";
import { StatusBadge } from "@/components/orders/status-badge";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { cardClass } from "@/components/shared/page-ui";

interface Stop {
  id: string;
  seq: number;
  n: number; // yurish tartibi (1,2,3...)
  lat: number;
  lng: number;
  name: string;
  phone: string;
  address: string;
  quantity: number;
  amount: number;
  status: string;
  locationLink?: string;
}

export function RouteMap({ driverId, date }: { driverId?: string; date?: string }) {
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

  // GPS kuzatuvi — sahifa ochiq ekan harakatni jonli oladi
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        posRef.current = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          acc: p.coords.accuracy || 30,
        };
        setGeoState("on");
        drawMyLocation();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoState("denied");
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bekor qilinganlar marshrutga kirmaydi
  const active = orders.filter((o) => o.status !== "CANCELLED");

  const stops: Stop[] = [];
  const noCoords: typeof active = [];
  active.forEach((o) => {
    const lat = o.customer.lat != null ? Number(o.customer.lat) : NaN;
    const lng = o.customer.lng != null ? Number(o.customer.lng) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
      stops.push({
        id: o.id, seq: o.seq, n: stops.length + 1, lat, lng,
        name: o.customer.name, phone: o.customer.phone, address: o.customer.address,
        quantity: o.quantity, amount: Number(o.totalAmount), status: o.status,
        locationLink: o.customer.locationLink,
      });
    } else {
      noCoords.push(o);
    }
  });

  useEffect(() => {
    if (!mapRef.current || stops.length === 0) return;
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

      // Marshrut chizig'i (punktir)
      if (stops.length > 1) {
        L.polyline(stops.map((s) => [s.lat, s.lng]), {
          color: "#2563EB", weight: 3, opacity: 0.45, dashArray: "6 10",
        }).addTo(map);
      }

      // Raqamlangan pinlar
      stops.forEach((s) => {
        const delivered = s.status === "DELIVERED";
        const bg = delivered ? "#16A34A" : "#2563EB";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 4px;transform:rotate(0deg);background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;font-family:Inter,sans-serif;border:3px solid #fff;box-shadow:0 2px 8px rgba(16,24,40,.35);">${s.n}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 30],
          popupAnchor: [0, -28],
        });
        const gmaps = s.locationLink || `https://maps.google.com/?q=${s.lat},${s.lng}`;
        const popup = `
          <div style="font-family:Inter,sans-serif;min-width:190px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${s.n}. ${s.name}</div>
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
    // stops mazmuni orders'dan keladi — orders o'zgarsa qayta chizamiz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stops.map((s) => [s.id, s.status]))]);

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
    <div className="space-y-4">
      {/* Xarita */}
      {stops.length > 0 ? (
        <div className={cn(cardClass, "overflow-hidden")}>
          <div className="relative">
            <div ref={mapRef} className="h-[380px] md:h-[480px] w-full z-0" />
            {/* Joyimga qaytish / kuzatish tugmasi */}
            <button
              onClick={() => {
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
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-[12px] text-gray-500 dark:text-gray-400 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow flex-none" /> Kutilmoqda
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-600 border-2 border-white shadow flex-none" /> Yetkazildi
            </span>
            {geoState === "on" && (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-none" /> Jonli lokatsiya
              </span>
            )}
            {geoState === "denied" && (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-300 font-medium">
                Lokatsiyaga ruxsat bering (brauzer sozlamasi)
              </span>
            )}
            <span className="ml-auto tabular-nums">{stops.length} nuqta</span>
          </div>
        </div>
      ) : (
        <div className={cn(cardClass, "p-6 text-center")}>
          <MapPinOff className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
          <p className="text-sm text-gray-400">
            Buyurtmalarda lokatsiya yo'q — mijoz kartasiga Google Maps havolasini qo'shsangiz, xaritada chiqadi
          </p>
        </div>
      )}

      {/* Yurish tartibi ro'yxati */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="px-4 md:px-5 py-3.5 text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
          Yurish tartibi
        </div>
        <div>
          {stops.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 md:px-5 py-3 border-t border-gray-100 dark:border-gray-800">
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-none tabular-nums",
                s.status === "DELIVERED" ? "bg-green-600" : "bg-blue-600"
              )}>
                {s.n}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/orders/${s.id}`} className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {s.name}
                  </Link>
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 flex-none">#{s.seq}</span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  {s.quantity} ta · {formatCurrency(s.amount)} · {s.address}
                </div>
              </div>
              <span className="hidden sm:inline-flex"><StatusBadge status={s.status as any} /></span>
              <a
                href={s.locationLink || `https://maps.google.com/?q=${s.lat},${s.lng}`}
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
            <div key={o.id} className="flex items-center gap-3 px-4 md:px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-amber-50/40 dark:bg-amber-500/5">
              <span className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 flex-none">
                <MapPinOff className="w-3.5 h-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/orders/${o.id}`} className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {o.customer.name}
                  </Link>
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 flex-none">#{o.seq}</span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  Lokatsiya yo'q · {o.customer.address}
                </div>
              </div>
              <span className="hidden sm:inline-flex"><StatusBadge status={o.status as any} /></span>
              <a
                href={`tel:${o.customer.phone}`}
                title={formatPhone(o.customer.phone)}
                className="w-9 h-9 rounded-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors flex-none"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
