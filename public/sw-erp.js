// Tellustech ERP — Service Worker (root scope)
// 전략:
//   · API/_next data : network only (절대 캐시 금지)
//   · 정적 자산 (_next/static, /icon-*, /flags/*) : cache first + 24h
//   · HTML 화면 : stale-while-revalidate (마지막 응답 캐시 → 오프라인 시 폴백)
// 오프라인 시 접근 가능 화면 제한: /, /admin/yield-analysis, /inventory/stock,
// /finance/cash-dashboard 등 dashboard 류만 캐시 hit.

const CACHE_VERSION = "tts-erp-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

// 오프라인 시 캐시 hit 허용 페이지 prefix.
const OFFLINE_OK = [
  "/",
  "/admin/yield-analysis",
  "/inventory/stock",
  "/finance/cash-dashboard",
  "/finance/profitability",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(["/icon-192.svg", "/icon-512.svg", "/manifest-erp.webmanifest"]).catch(() => undefined);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 1) API/_next data : 절대 캐시 금지 (always network)
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/")) return;

  // 2) Portal scope 는 별도 SW (sw.js) 가 담당 — 여기선 패스
  if (url.pathname.startsWith("/portal")) return;

  // 3) 정적 자산 : cache first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.match(/\.(svg|png|jpg|webp|woff2?|css|js)$/)) {
    e.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        const c = await caches.open(STATIC_CACHE);
        c.put(req, fresh.clone()).catch(() => undefined);
        return fresh;
      } catch {
        return cached ?? Response.error();
      }
    })());
    return;
  }

  // 4) HTML 페이지 : stale-while-revalidate (오프라인 시 캐시 폴백)
  e.respondWith((async () => {
    const cache = await caches.open(PAGE_CACHE);
    const cached = await cache.match(req);
    const networkPromise = fetch(req).then((res) => {
      if (res.ok) cache.put(req, res.clone()).catch(() => undefined);
      return res;
    }).catch(() => null);

    // 캐시가 있으면 즉시 반환 + 백그라운드 갱신
    if (cached) {
      networkPromise.catch(() => undefined);
      return cached;
    }
    // 캐시 없으면 네트워크 시도
    const fresh = await networkPromise;
    if (fresh) return fresh;

    // 오프라인 + 캐시 없음 — OFFLINE_OK 매칭되는 다른 캐시로 폴백
    const allowed = OFFLINE_OK.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"));
    if (allowed) {
      const fallback = await cache.match("/") ?? await cache.match("/inventory/stock");
      if (fallback) return fallback;
    }
    return new Response(
      "<!DOCTYPE html><html><head><meta charset=utf-8><title>Offline</title></head><body style='font-family:system-ui;padding:40px;text-align:center'><h2>오프라인 모드</h2><p>이 화면은 오프라인 캐시에 없습니다.<br>네트워크 복구 후 다시 시도해주세요.</p></body></html>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  })());
});
