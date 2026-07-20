// Haydovchining ANIQ GPS joylashuvini olish (2026-07-20, egasi so'rovi:
// "lakatsiya adashmasligi kerak"). Birinchi fix ko'pincha qo'pol (Wi-Fi/uyali
// minora bo'yicha, xatosi yuzlab metr) — shuning uchun bir necha soniya
// watchPosition bilan kuzatib, GPS aniqlashganda ENG YAXSHI fix qaytariladi.
// Kerakli aniqlikka yetishi bilan darhol to'xtaydi (kuttirmaydi).
//
// Ruxsat haqida: brauzer ruxsatni sayt uchun BIR MARTA so'raydi (HTTPS) —
// "Ruxsat berish" tanlangach keyingi chaqiruvlarda so'ralmaydi. Rad etilgan
// bo'lsa aniq xabar qaytaramiz.

export interface PreciseLocation {
  lat: number;
  lng: number;
  accuracy: number; // metr
}

export function getPreciseLocation(opts?: {
  desiredAccuracy?: number; // shu aniqlikka yetganda darhol qaytadi (metr)
  maxWaitMs?: number; // maksimal kutish — tugagach eng yaxshisi qaytadi
}): Promise<PreciseLocation> {
  const desired = opts?.desiredAccuracy ?? 15;
  const maxWait = opts?.maxWaitMs ?? 8000;

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Bu qurilmada joylashuvni aniqlab bo'lmaydi"));
      return;
    }

    let best: PreciseLocation | null = null;
    let finished = false;
    let watchId = 0;
    let timer: ReturnType<typeof setTimeout>;

    const finish = (err?: GeolocationPositionError) => {
      if (finished) return;
      finished = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (best) {
        resolve(best);
      } else if (err && err.code === err.PERMISSION_DENIED) {
        reject(new Error("Joylashuvga ruxsat berilmagan — brauzer/telefon sozlamasidan ruxsat bering"));
      } else {
        reject(new Error("Joylashuv aniqlanmadi — GPS yoniqligini tekshirib, ochiq joyda qayta uring"));
      }
    };

    watchId = navigator.geolocation.watchPosition(
      (p) => {
        const cur = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy ?? 9999,
        };
        if (!best || cur.accuracy < best.accuracy) best = cur;
        if (cur.accuracy <= desired) finish();
      },
      (err) => finish(err),
      // maximumAge: 0 — keshdagi eski joy EMAS, hozirgi haqiqiy joy
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWait }
    );
    timer = setTimeout(() => finish(), maxWait);
  });
}
