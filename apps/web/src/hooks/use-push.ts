"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

// VAPID public key (base64url) → Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Push obuna — login bo'lgan qurilmani serverga ro'yxatdan o'tkazadi.
 * Ilova yopiq bo'lsa ham "Yangi buyurtma" xabari telefonga tushadi.
 * Ruxsat berilmasa yoki brauzer qo'llamasa — jimgina o'tkazib yuboradi.
 */
export function usePushSubscription() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const role = user?.role;

  useEffect(() => {
    if (!userId || role === "MANAGER") return; // manager faqat ko'radi — push shart emas
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (process.env.NODE_ENV !== "production") return; // SW faqat prod'da ro'yxatdan o'tadi

    let cancelled = false;
    (async () => {
      try {
        if (Notification.permission === "denied") return;
        const perm =
          Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
        if (perm !== "granted" || cancelled) return;

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const r = await api.get("/notifications/push/public-key");
          const publicKey: string | null = r.data?.data?.publicKey ?? null;
          if (!publicKey || cancelled) return;
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }
        const json = sub.toJSON();
        await api.post("/notifications/push/subscribe", {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        });
      } catch {
        // push ixtiyoriy qulaylik — xato UXni buzmasin
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, role]);
}
