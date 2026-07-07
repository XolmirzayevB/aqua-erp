// Google Maps havolasidan lat/lng ajratib olish.
// Qo'llab-quvvatlanadigan formatlar:
//   .../maps?q=41.31,69.28   ?query=41.31,69.28   ?ll=41.31,69.28
//   .../maps/@41.31,69.28,15z
//   .../maps/place/.../@41.31,69.28,...
//   !3d41.31!4d69.28  (place data qismida)
// Qisqa havolalar (maps.app.goo.gl) — redirect kuzatib, yakuniy URL'dan ajratiladi.

export interface LatLng {
  lat: number;
  lng: number;
}

// Kasr qismi istalgan uzunlikda bo'lishi mumkin (41.31 ham, 41.311158 ham)
const COORD = /(-?\d{1,3}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)/;

function valid(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    && !(lat === 0 && lng === 0);
}

export function parseLatLngFromUrl(url: string): LatLng | null {
  if (!url) return null;
  try {
    // !3d..!4d.. formati (eng aniq — joyning o'zi)
    const bang = url.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/);
    if (bang) {
      const lat = parseFloat(bang[1]);
      const lng = parseFloat(bang[2]);
      if (valid(lat, lng)) return { lat, lng };
    }
    // q= / query= / ll= / destination= parametrlari
    const u = new URL(url);
    for (const key of ["q", "query", "ll", "destination", "center"]) {
      const v = u.searchParams.get(key);
      if (v) {
        const m = v.match(COORD);
        if (m) {
          const lat = parseFloat(m[1]);
          const lng = parseFloat(m[2]);
          if (valid(lat, lng)) return { lat, lng };
        }
      }
    }
    // /@lat,lng,zoom formati (xarita markazi — joy bo'lmasligi mumkin, oxirgi chora)
    const at = url.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
    if (at) {
      const lat = parseFloat(at[1]);
      const lng = parseFloat(at[2]);
      if (valid(lat, lng)) return { lat, lng };
    }
  } catch {
    // URL parse xatosi — regex bilan oxirgi urinish
    const m = url.match(COORD);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (valid(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

const SHORT_HOSTS = ["maps.app.goo.gl", "goo.gl", "g.co"];

export function isShortLink(url: string): boolean {
  try {
    return SHORT_HOSTS.some((h) => new URL(url).hostname.endsWith(h));
  } catch {
    return false;
  }
}

// Qisqa havolani kuzatib (redirect), yakuniy URL'dan koordinata olish.
// Tarmoq sekin bo'lsa osilib qolmasligi uchun timeout bilan.
export async function resolveLatLng(url: string, timeoutMs = 4000): Promise<LatLng | null> {
  const direct = parseLatLngFromUrl(url);
  if (direct) return direct;
  if (!isShortLink(url)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    // redirect: "follow" — yakuniy URL res.url da bo'ladi
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (AquaERP geo-resolver)" },
    });
    clearTimeout(t);
    const finalUrl = res.url || "";
    const fromFinal = parseLatLngFromUrl(finalUrl);
    if (fromFinal) return fromFinal;
    // Consent/redirect sahifalarida asl URL percent-encoded bo'ladi (continue=...)
    try {
      const decoded = decodeURIComponent(finalUrl);
      const fromDecoded = parseLatLngFromUrl(decoded);
      if (fromDecoded) return fromDecoded;
    } catch { /* decode xatosi — o'tkazib yuboramiz */ }
    // Ba'zida koordinata sahifa tanasida bo'ladi — birinchi 100KB ni tekshiramiz
    const text = (await res.text()).slice(0, 100_000);
    const m = text.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (valid(lat, lng)) return { lat, lng };
    }
  } catch {
    // timeout yoki tarmoq xatosi — indamay o'tamiz (best-effort)
  }
  return null;
}
