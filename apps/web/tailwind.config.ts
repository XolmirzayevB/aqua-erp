import type { Config } from "tailwindcss";

// AquaERP.dc.html (Claude Design) tokenlari → Tailwind ko'prigi.
// gray shkalasi dizayndagi surface/border/text qiymatlariga mos qilib qo'lda terilgan:
// light: bg #F8F9FB · surface-2 #F4F6FA · border #ECEEF3 · border-strong #E1E5EC
// dark:  bg #0A0B0D · surface #141619 · surface-2/border #202329 · border-strong #31353D
const designGray = {
  50: "#F8F9FB",
  100: "#ECEEF3",
  200: "#E1E5EC",
  300: "#D6DBE3",
  400: "#9CA3AF",
  500: "#6B7280",
  600: "#4B5563",
  700: "#31353D",
  800: "#202329",
  900: "#141619",
  950: "#0A0B0D",
};

// BREND QIZIL (egasi tanlagan, 2026-07-13) — mockup'dagi g'isht-qizil (#B93B3B).
// Butun dastur `blue-*` klasslari bilan yozilgan edi; shkalani shu yerda qizilga
// almashtirish bilan BARCHA primary elementlar (tugma, aktiv holat, link, fokus)
// bir zumda qizil bo'ladi. Komponentlarda klass nomi "blue" bo'lib qolgan —
// bu ataylab: yangi rang faqat shu bitta joyda boshqariladi.
const brandRed = {
  50: "#FBEDED",
  100: "#F7DCDC",
  200: "#EFBDBD",
  300: "#E39696",
  400: "#D26A6A",
  500: "#C24B4B",
  600: "#B93B3B", // primary — mockup rangi
  700: "#A02F2F",
  800: "#862929",
  900: "#6F2525",
  950: "#3D1111",
};

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: designGray,
        blue: brandRed,
        // Dizayn "weak" fonlari — aniq qiymatlar
        green: { 50: "#E7F7EE" },
        amber: { 50: "#FDF3E4" },
        red: { 50: "#FDEBEB" },
        violet: { 50: "#F2ECFE" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "18px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        // Dizayn soyalari: sm / panel / panel-lg
        card: "0 1px 2px rgba(16, 24, 40, 0.05)",
        panel: "0 10px 30px rgba(16, 24, 40, 0.05)",
        "card-hover": "0 24px 60px rgba(16, 24, 40, 0.10)",
        glow: "0 1px 2px rgba(16, 24, 40, 0.2), 0 6px 16px rgba(185, 59, 59, 0.20)",
      },
    },
  },
  plugins: [],
};

export default config;
