"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Allaqachon o'rnatilganmi?
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }
    // iOS aniqlash
    const ios = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(ios);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed) return null;

  // Android/Chrome — to'g'ridan-to'g'ri o'rnatish
  if (deferredPrompt) {
    return (
      <button
        onClick={async () => {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          setDeferredPrompt(null);
        }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
      >
        <Download className="w-4 h-4" />
        Ilovani telefonga o'rnatish
      </button>
    );
  }

  // iOS — qo'lda qo'shish ko'rsatmasi
  if (isIOS) {
    return (
      <div>
        <button
          onClick={() => setShowIosHint(!showIosHint)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
        >
          <Download className="w-4 h-4" />
          Ilovani o'rnatish (iPhone)
        </button>
        {showIosHint && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Safari'da pastdagi <Share className="w-3 h-3 inline" /> tugmasini bosing →
            <b> "Bosh ekranga qo'shish" (Add to Home Screen)</b> ni tanlang
          </p>
        )}
      </div>
    );
  }

  return null;
}
