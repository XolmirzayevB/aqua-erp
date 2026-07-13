// O'zbekiston (Asia/Tashkent, UTC+5, DST yo'q) vaqti bo'yicha kun/oralik hisoblari.
// Server UTC'da ishlaydi — oddiy startOfDay() UTC kunini oladi, bu lokal
// 05:00–04:59 oralig'iga to'g'ri kelib, "bugun" ko'rsatkichlari ertalab soat 5
// gacha KECHAGI sonlarni ko'rsatib turadi. Barcha "bugun/hafta/oy" hisoblari
// shu utildan foydalanishi SHART.

export const UZ_TZ_MS = 5 * 60 * 60 * 1000;

// UTC vaqtni lokal (soat ko'rsatkichi O'zbekistoncha bo'lgan) vaqtga suradi.
// date-fns startOfDay/Week/Month ана shu surilgan vaqt ustida ishlatiladi.
export const toLocal = (d: Date) => new Date(d.getTime() + UZ_TZ_MS);

// Lokal hisoblangan chegarani haqiqiy UTC vaqtga qaytaradi (DB so'rovi uchun).
export const fromLocal = (d: Date) => new Date(d.getTime() - UZ_TZ_MS);

// Lokal kun chegaralari [00:00:00.000 — 23:59:59.999] (UTC qiymat sifatida).
// base — istalgan vaqt yoki "YYYY-MM-DD" dan yasalgan Date bo'lishi mumkin.
export function localDayRange(base: Date = new Date()): { start: Date; end: Date } {
  const local = toLocal(base);
  local.setUTCHours(0, 0, 0, 0);
  const start = fromLocal(local);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}
