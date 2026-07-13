// Haydovchini mijoz manziliga YO'NALTIRISH (navigatsiya) havolasi.
//
// Muammo: oddiy https://maps.google.com/?q=... havolasi APK (TWA) yoki PWA ichida
// Google Maps WEB-saytini ochadi — u marshrut tuzib bermaydi.
// Yechim:
//  - Android: `google.navigation:` sxemasi Google Maps ILOVASINI to'g'ridan-to'g'ri
//    navigatsiya (yo'l ko'rsatish) rejimida ochadi.
//  - iOS/desktop: rasmiy `maps dir?api=1` universal havolasi — ilova o'rnatilgan
//    bo'lsa Google Maps app ochiladi, bo'lmasa brauzerda yo'nalish ko'rsatiladi.
// Koordinata bo'lmasa mijozning saqlangan locationLink'iga qaytamiz (bor bo'lsa).
export function directionsUrl(
  lat?: number | string | null,
  lng?: number | string | null,
  fallbackLink?: string | null,
): string | null {
  const la = Number(lat);
  const ln = Number(lng);
  const hasCoords = Number.isFinite(la) && Number.isFinite(ln) && !(la === 0 && ln === 0);
  if (!hasCoords) return fallbackLink || null;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/android/i.test(ua)) {
    return `google.navigation:q=${la},${ln}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${la}%2C${ln}&travelmode=driving`;
}
