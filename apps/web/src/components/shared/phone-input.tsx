"use client";

import { formatPhoneInput, phoneToRaw } from "@/lib/utils";

interface Props {
  value: string; // xom: +998915162552
  onChange: (raw: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

// Telefon raqamni "+998 91 516 25 52" ko'rinishida avtomatik formatlaydi,
// lekin onChange orqali xom qiymatni (+998915162552) qaytaradi.
export function PhoneInput({ value, onChange, className, placeholder, autoFocus, disabled }: Props) {
  return (
    <input
      type="tel"
      inputMode="numeric"
      autoFocus={autoFocus}
      disabled={disabled}
      placeholder={placeholder || "+998 90 123 45 67"}
      value={value ? formatPhoneInput(value) : ""}
      onChange={(e) => onChange(phoneToRaw(formatPhoneInput(e.target.value)))}
      className={className}
    />
  );
}
