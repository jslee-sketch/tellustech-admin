// Tellustech Portal — minimal Service Worker
// 오프라인 polyfill + /portal 페이지 캐싱.
// 인증 데이터는 캐싱하지 않음 (always network).
// v2: manifest 캐싱 제거 (orientation 변경 즉시 반영). 캐시 이름 bump 로 구버전 자동 청소.

const CACHE = "tts-portal-v2";
// manifest 는 캐시 대상에서 제외 — OS PWA 가 항상 최신 manifest 를 받도록.
const ASSETS = ["/flags/kr.svg", "/flags/vn.svg", "/flags/us.svg"];

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
  // manifest 는 항상 네트워크 우선 — orientation 같은 변경이 즉시 반영되도록
  if (url.pathname === "/manifest.webmanifest") return;
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
