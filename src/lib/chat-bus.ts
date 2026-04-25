import "server-only";
import { EventEmitter } from "node:events";

// 단일 프로세스 내 채팅 메시지 pub/sub. WebSocket 도입 전 SSE 라우트가 구독한다.
// 다중 인스턴스(Railway 수평확장) 환경에서는 Redis pub/sub 으로 교체 필요.
//
// HMR/싱글톤: globalThis 캐시 — 한 프로세스 내 emitter 인스턴스를 1개로 고정.

type ChatEvent = {
  chatRoomId: string;
  messageId: string;
  senderId: string;
  ts: string;
};

const globalForChatBus = globalThis as unknown as {
  _ttsChatBus?: EventEmitter;
};

export const chatBus: EventEmitter =
  globalForChatBus._ttsChatBus ?? (() => {
    const e = new EventEmitter();
    e.setMaxListeners(500);
    return e;
  })();

if (process.env.NODE_ENV !== "production") {
  globalForChatBus._ttsChatBus = chatBus;
}

export function emitChatMessage(ev: ChatEvent): void {
  chatBus.emit(`room:${ev.chatRoomId}`, ev);
}

export function onChatMessage(roomId: string, listener: (ev: ChatEvent) => void): () => void {
  const eventName = `room:${roomId}`;
  chatBus.on(eventName, listener);
  return () => chatBus.off(eventName, listener);
}
