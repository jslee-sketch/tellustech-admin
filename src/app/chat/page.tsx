import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card, Note } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await getSession();
  const L = session.language;
  const rooms = await prisma.chatRoom.findMany({
    where: { members: { some: { userId: session.sub } } },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { messages: true, members: true } },
      members: { where: { userId: { not: session.sub } }, include: { user: { select: { username: true } } }, take: 3 },
    },
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
            <h1 className="mt-1 text-2xl font-extrabold">{t("page.chat.title", L)}</h1>
          </div>
          <Link href="/chat/new" className="rounded-md bg-[color:var(--tts-primary)] px-3 py-2 text-[12px] font-bold text-white hover:opacity-90">{t("page.chat.new", L)}</Link>
        </div>
        <Note tone="info">
          메시지 전송 시 Claude API 로 나머지 언어 자동 번역 (API 키 설정 필요 — 없으면 원문만 저장).
          실시간 푸시는 WebSocket 서버 가동 필요 — 현재는 전송 후 수동 새로고침 방식. 방 생성/입장은 API (<span className="font-mono">/api/chat/rooms</span>) 에서 호출.
        </Note>
        <Card title="내 채팅방" count={rooms.length}>
          {rooms.length === 0 ? (
            <p className="text-[13px] text-[color:var(--tts-muted)]">참여 중인 채팅방이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {rooms.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/chat/${r.id}`}
                    className="block rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3 transition hover:border-[color:var(--tts-primary)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {r.type === "DIRECT"
                          ? r.members.map((m) => m.user.username).join(", ")
                          : r.name ?? `그룹 (${r._count.members}명)`}
                      </span>
                      <span className="text-[11px] text-[color:var(--tts-muted)]">{r._count.messages} 메시지 · {r.updatedAt.toISOString().slice(0, 16).replace("T", " ")}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
