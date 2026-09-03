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
    // x va h o'zbekchada almashib yoziladi (Bexruz/Behruz, xolam/holam) —
    // guruh kaliti uchun ikkalasi bir xil hisoblanadi
    .replace(/x/g, "h")
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

  // Hamma so'z stopword bo'lsa (masalan "Klik") — matnning o'zi kalit bo'ladi,
  // aks holda bunday yozuvlar bir-biriga aralashib "Boshqa"ga tushib ketardi
  const raw = (category ?? note ?? "").toLowerCase().replace(APOS, "").replace(/x/g, "h").replace(/[^a-zа-яё0-9]/gi, "");
  return { key: raw.slice(0, 24) || "boshqa", from: "other" };
}

// Asosiy so'z — BIRINCHI ma'noli so'z. O'zbekchada pul oluvchi/maqsad oldinda
// yoziladi: "Azizga oylik", "Gayrat akamga", "Ishchiga 2 kunlik",
// "Salyarka divijokka" — shuning uchun birinchi so'z guruhni to'g'ri belgilaydi.
function pickPrimary(list: string[]): string {
  return list[0];
}

// ── Kichik yozuv xatolarini birlashtirish ────────────────────────────────────
// "Mwtan"→"Metan", "Gayrta"→"Gayrat" kabi bitta harf xatosi/o'rin almashuvi.
// Damerau-Levenshtein masofasi ≤1 bo'lsa bitta guruh deb qaraladi
// (faqat 5 harfdan uzun kalitlar — qisqalarida tasodifiy qo'shilib ketmasin).
export function keysAreTypoVariants(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  return damerau(a, b) <= 1;
}

function damerau(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // o'rin almashuv
      }
    }
  }
  return d[a.length][b.length];
}
