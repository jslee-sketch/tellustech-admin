#!/usr/bin/env node
/**
 * SSE 다중 클라이언트 부하 테스트.
 *
 * 시나리오:
 *   1. 10개 EventSource 가 동시에 채팅방 1개에 연결
 *   2. 첫 클라이언트가 메시지 1건 POST
 *   3. 나머지 9개가 message 이벤트 수신 — 각자 지연시간 측정
 *   4. heartbeat 정상 (30초 주기 ping) 확인
 *
 * 사용법:
 *   node scripts/sse-load-test.mjs <BASE_URL> <SESSION_COOKIE_VALUE> <ROOM_ID>
 *
 * 예:
 *   node scripts/sse-load-test.mjs \
 *     https://tellustech-admin-production.up.railway.app \
 *     "<tts_session=eyJ...>" \
 *     cmodov5wy002r4ipl0ijlt9pu
 *
 * Node 18+ (글로벌 fetch + EventSource 폴리필 필요).
 * EventSource: undici 미지원 — eventsource 패키지 사용:
 *   npm i -D eventsource
 */
import EventSourceMod from "eventsource";
const EventSource = EventSourceMod.default ?? EventSourceMod;

const [BASE, COOKIE, ROOM_ID] = process.argv.slice(2);
if (!BASE || !COOKIE || !ROOM_ID) {
  console.error("usage: node sse-load-test.mjs <BASE_URL> <SESSION_COOKIE> <ROOM_ID>");
  process.exit(1);
}

const N_CLIENTS = 10;
const HEARTBEAT_WAIT_MS = 35_000; // > 30s heartbeat interval

console.log(`[setup] connecting ${N_CLIENTS} SSE clients to ${BASE}/api/chat/rooms/${ROOM_ID}/stream`);

const clients = Array.from({ length: N_CLIENTS }, (_, i) => {
  const es = new EventSource(`${BASE}/api/chat/rooms/${ROOM_ID}/stream`, {
    headers: { Cookie: COOKIE },
  });
  return {
    id: i,
    es,
    helloAt: 0,
    messageReceivedAt: 0,
    heartbeats: 0,
    error: null,
  };
});

let messagePostedAt = 0;
const ready = new Promise((resolve) => {
  let count = 0;
  for (const c of clients) {
    c.es.addEventListener("hello", () => {
      c.helloAt = Date.now();
      count++;
      if (count === N_CLIENTS) resolve();
    });
    c.es.addEventListener("message", () => {
      // message 가 메시지 푸시. 주의: SSE 의 default event 도 'message' 라 충돌 — chat-bus 는 named event 'message' 보냄.
      c.messageReceivedAt = Date.now();
    });
    c.es.addEventListener("ping", () => { c.heartbeats++; });
    c.es.onerror = (e) => { c.error = String(e?.message ?? e); };
  }
});

const TIMEOUT_HELLO = 10_000;
await Promise.race([ready, new Promise((_, rj) => setTimeout(() => rj(new Error("hello timeout")), TIMEOUT_HELLO))])
  .catch((e) => { console.error("[hello-fail]", e.message); });

console.log(`[connected] ${clients.filter(c => c.helloAt).length}/${N_CLIENTS} got hello`);

// Post a message
console.log("[post] sending 1 message via REST");
messagePostedAt = Date.now();
const postRes = await fetch(`${BASE}/api/chat/rooms/${ROOM_ID}/messages`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: COOKIE },
  body: JSON.stringify({ content: `[load-test] ${new Date().toISOString()}`, originalLang: "KO" }),
});
console.log(`[post] status=${postRes.status}`);

// Wait up to 5s for fanout
await new Promise((r) => setTimeout(r, 5_000));

const fanout = clients.map((c) => ({
  id: c.id,
  helloLatency: c.helloAt ? c.helloAt - messagePostedAt + (messagePostedAt - c.helloAt) : null,
  messageLatency: c.messageReceivedAt ? c.messageReceivedAt - messagePostedAt : null,
  error: c.error,
}));

const recvCount = clients.filter(c => c.messageReceivedAt).length;
const latencies = fanout.map(x => x.messageLatency).filter(x => x != null);
const avgLat = latencies.length ? Math.round(latencies.reduce((s, x) => s + x, 0) / latencies.length) : null;
const maxLat = latencies.length ? Math.max(...latencies) : null;

console.log("\n=== fanout ===");
console.log(`recv: ${recvCount}/${N_CLIENTS}`);
console.log(`avg latency: ${avgLat}ms / max: ${maxLat}ms`);
console.table(fanout);

// Wait for heartbeat
console.log(`\n[heartbeat] waiting ${HEARTBEAT_WAIT_MS / 1000}s for ping events...`);
await new Promise((r) => setTimeout(r, HEARTBEAT_WAIT_MS));
const hbCount = clients.filter(c => c.heartbeats > 0).length;
console.log(`heartbeat received by ${hbCount}/${N_CLIENTS} clients`);

// Cleanup
for (const c of clients) c.es.close();

const passed = recvCount === N_CLIENTS && avgLat !== null && avgLat < 3000 && hbCount === N_CLIENTS;
console.log(passed ? "\n✅ LOAD TEST PASSED" : "\n❌ LOAD TEST FAILED");
process.exit(passed ? 0 : 1);
