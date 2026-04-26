// Tellustech Portal — minimal Service Worker
// 오프라인 polyfill + /portal 페이지 캐싱.
// 인증 데이터는 캐싱하지 않음 (always network).

const CACHE = "tts-portal-v1";
const ASSETS = ["/portal", "/manifest.webmanifest", "/flags/kr.svg", "/flags/vn.svg", "/flags/us.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Auth/API 요청은 항상 네트워크
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/")) return;
  // GET 만 처리
  if (e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => undefined);
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r ?? new Response("offline", { status: 503 })))
  );
});
