import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { ChatRoomView } from "./chat-room-view";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function ChatRoomPage({ params }: PageProps) {
  const session = await getSession();
  const { id } = await params;

  const room = await prisma.chatRoom.findFirst({
    where: { id, members: { some: { userId: session.sub } } },
    include: {
      members: { include: { user: { select: { id: true, username: true } } } },
    },
  });
  if (!room) return notFound();

  const initialMessages = await prisma.chatMessage.findMany({
    where: { chatRoomId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { sender: { select: { id: true, username: true } } },
  });

  // lastReadAt 갱신 (방 진입 시)
  await prisma.chatRoomMember.update({
    where: { chatRoomId_userId: { chatRoomId: id, userId: session.sub } },
    data: { lastReadAt: new Date() },
  });

  const title =
    room.type === "DIRECT"
      ? room.members
          .filter((m) => m.user.id !== session.sub)
          .map((m) => m.user.username)
          .join(", ")
      : room.name ?? `그룹 (${room.members.length}명)`;

  const memberLabel = room.members.map((m) => m.user.username).join(", ");

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/chat" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">← 채팅</Link>
        <div className="mt-1 mb-3 flex items-end justify-between">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <span className="text-[11px] text-[color:var(--tts-muted)]">{room.type === "DIRECT" ? "1:1" : "그룹"} · {room.members.length}명</span>
        </div>
        <div className="mb-3 text-[11px] text-[color:var(--tts-sub)]">멤버: {memberLabel}</div>

        <Card>
          <ChatRoomView
            roomId={room.id}
            currentUserId={session.sub}
            currentLanguage={session.language}
            initialMessages={initialMessages.map((m) => ({
              id: m.id,
              senderId: m.senderId,
              senderName: m.sender.username,
              contentVi: m.contentVi,
              contentEn: m.contentEn,
              contentKo: m.contentKo,
              originalLang: m.originalLang,
              mentions: m.mentions,
              createdAt: m.createdAt.toISOString(),
            }))}
          />
        </Card>
      </div>
    </main>
  );
}
