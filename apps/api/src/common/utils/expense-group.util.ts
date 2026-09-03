// ─── XARAJATLARNI "SMART" GURUHLASH (2026-09-03, egasi so'rovi) ──────────────
// Muammo: xarajat izohi ERKIN MATN yoziladi — "G'ayrat akaga", "gayrat aka",
// "G'ayratga 200 000" hammasi BITTA odam. Egasi bir oyda KIMGA/NIMAGA qancha
// pul ketganini bilishi kerak. Shu sabab matnni normallashtirib (apostrof,
// registr, raqamlar), o'zbekcha qo'shimchalarni (-ga, -dan, -lar, -ning...)
// kesib, ASOSIY so'z (o'zak) bo'yicha guruhlaymiz.
//
// Misol: "G'ayrat akaga" / "gayratga" / "G'ayrat aka" → hammasi "gayrat" kaliti.
// Kategoriya ma'noli bo'lsa (Yoqilg'i, Ovqat...) — o'zak kategoriyadan olinadi,
// aks holda (Boshqa / Haydovchi xarajati) izohdan olinadi.

// Guruhlashda hisobga olinmaydigan so'zlar (murojaat, xizmat so'zlari, valyuta)
const STOPWORDS = new Set([
  "aka", "uka", "opa", "amaki", "tog", "boss", "usta", "domla", "hoji", "xoji",
  "uchun", "pul", "puli", "puldan", "bilan", "va", "ham", "yana", "yena",
  "som", "sum", "sumlik", "ming", "mln", "mlrd", "dona", "ta", "kun", "kunlik",
  "boshqa", "boshqalar", "xarajat", "xarajati", "xarajatlar", "chiqim",
  "haydovchi", "haydovchini", "operator", "admin", "berildi", "berdim",
  "berdik", "oldi", "oldim", "olindi", "tolandi", "tolab", "naqd", "klik",
]);

// O'zbekcha qo'shimchalar — uzunidan qisqasiga kesiladi ("akaga" → "aka")
const SUFFIXES = [
  "laridan", "lariga", "larini", "lardan", "larda", "larga", "lari", "larni",
  "lar", "ning", "nikida", "niki", "dagi", "dan", "ga", "ka", "qa", "da",
  "ni",
];

// Apostrofning barcha ko'rinishlari (g'ayrat / gʻayrat / g`ayrat / g’ayrat)
const APOS = /['`ʻʼ‘’´ʹ]/g;

/** Texnik belgilarni tozalaydi: "(haydovchi)", "(operator)", "— pul: Ism (naqd)" */
export function cleanExpenseNote(description?: string | null): {
  note: string | null;
  sourceName: string | null;
  sourceMethod: "CASH" | "CARD" | null;
} {
  const raw = (description ?? "").trim();
  if (!raw) return { note: null, sourceName: null, sourceMethod: null };

  let sourceName: string | null = null;
  let sourceMethod: "CASH" | "CARD" | null = null;

  // "— pul: Ism (naqd)" — xarajat kimning balansidan ketgani
  const m = raw.match(/[—-]\s*pul:\s*(.+?)\s*\((naqd|klik)\)\s*$/i);
  let rest = raw;
  if (m) {
    sourceName = m[1].trim();
    sourceMethod = m[2].toLowerCase() === "naqd" ? "CASH" : "CARD";
    rest = raw.slice(0, m.index).trim();
  }

  const note = rest
    .replace(/\((haydovchi|operator|admin)\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return { note: note || null, sourceName, sourceMethod };
}

/** "G'ayrat akaga 50 000" → ["gayrat", "aka"] (raqam/stopword tashlanadi) */
function stems(text: string): string[] {
  const norm = text
    .toLowerCase()
    .replace(APOS, "")
    .replace(/[^a-zа-яё0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!norm) return [];

  const out: string[] = [];
  for (const word of norm.split(" ")) {
    if (!word || /^\d+$/.test(word)) continue; // sof raqam — summa
    let w = word;
    for (const suf of SUFFIXES) {
      if (w.length - suf.length >= 3 && w.endsWith(suf)) {
        w = w.slice(0, -suf.length);
        break;
      }
    }
    if (w.length < 3) continue;
    if (STOPWORDS.has(w) || STOPWORDS.has(word)) continue;
    out.push(w);
  }
  return out;
}

/** Guruh kaliti: kategoriya ma'noli bo'lsa undan, aks holda izohdan */
export function expenseGroupKey(
  category?: string | null,
  note?: string | null,
): { key: string; from: "category" | "note" | "other" } {
  const catStems = stems(category ?? "");
  if (catStems.length) return { key: pickPrimary(catStems), from: "category" };

  const noteStems = stems(note ?? "");
  if (noteStems.length) return { key: pickPrimary(noteStems), from: "note" };

  return { key: "boshqa", from: "other" };
}

// Asosiy so'z — eng uzuni (odatda ism/xizmat nomi; qisqalari yordamchi so'zlar)
function pickPrimary(list: string[]): string {
  return [...list].sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
}
