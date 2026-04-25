import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { onChatMessage } from "@/lib/chat-bus";

// SSE 스트림 — 채팅방 신규 메시지 실시간 전달.
// 클라이언트는 EventSource('/api/chat/rooms/<id>/stream') 로 구독한 후
// 'message' 이벤트마다 messages GET 으로 최신 목록을 다시 fetch 한다(가벼운 구조).
// Edge runtime 사용 안 함 — Node 의 EventEmitter 가 필요.

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSession();
  // 멤버 검증
  const member = await prisma.chatRoomMember.findUnique({
    where: { chatRoomId_userId: { chatRoomId: id, userId: session.sub } },
  });
  if (!member) {
    return new Response("not_a_member", { status: 404 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 초기 hello
      controller.enqueue(encoder.encode(`event: hello\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`));

      unsubscribe = onChatMessage(id, (ev) => {
        const payload = `event: message\ndata: ${JSON.stringify(ev)}\n\n`;
        try { controller.enqueue(encoder.encode(payload)); } catch { /* 스트림 종료 후 호출되면 무시 */ }
      });

      // 30초마다 heartbeat (프록시 keep-alive)
      heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch { /* ignore */ }
      }, 30_000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
