import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { uz } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("uz-UZ").format(Number(amount)) + " so'm";
}

export function formatDate(date: string | Date, fmt = "dd.MM.yyyy") {
  return format(new Date(date), fmt, { locale: uz });
}

export function formatPhone(phone: string) {
  return phone.replace(/(\+998)(\d{2})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
}

// Yozish paytida formatlash: "+998 91 516 25 52"
export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  let out = "+998";
  if (digits.length > 0) out += " " + digits.slice(0, 2);
  if (digits.length > 2) out += " " + digits.slice(2, 5);
  if (digits.length > 5) out += " " + digits.slice(5, 7);
  if (digits.length > 7) out += " " + digits.slice(7, 9);
  return out;
}

// Yuborish uchun: "+998 91 516 25 52" → "+998915162552"
export function phoneToRaw(value: string): string {
  const digits = value.replace(/\D/g, "");
  return "+" + digits;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// API xatosidan ODAM O'QIYDIGAN xabar ajratish.
// MUHIM: backend xabari ba'zan matn (string), ba'zan massiv (class-validator).
// Avval `message?.[0]` ishlatilardi — matnda bu FAQAT BIRINCHI HARFNI olardi
// ("Bu telefon..." → "B"), shuning uchun operator sababni ko'ra olmasdi.
export function apiErrorMessage(e: any, fallback = "Xatolik yuz berdi"): string {
  const m = e?.response?.data?.message;
  if (Array.isArray(m) && m.length > 0) return String(m[0]);
  if (typeof m === "string" && m.trim()) return m;
  if (e?.code === "ERR_NETWORK" || e?.message === "Network Error")
    return "Internet aloqasi yo'q — qayta urinib ko'ring";
  return fallback;
}
