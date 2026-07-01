import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "sonner";
import { Providers } from "@/components/shared/providers";
import { ServiceWorkerRegister } from "@/components/shared/sw-register";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AquaERP", template: "%s | AquaERP" },
  description: "19L Suv Yetkazib Berish Boshqaruv Tizimi",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AquaERP",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <Providers>{children}</Providers>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
