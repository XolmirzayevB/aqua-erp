// AquaERP minimal service worker — PWA o'rnatish va asosiy offline uchun
const CACHE = "aqua-erp-v1";
const OFFLINE_URLS = ["/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Faqat GET, va API so'rovlarini cache qilmaymiz
  if (request.method !== "GET" || request.url.includes("/api/")) return;

  // Network-first: yangi kontent, internet yo'qida cache
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/login")))
  );
});
