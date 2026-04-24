import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { ChatNewForm } from "./chat-new-form";

export const dynamic = "force-dynamic";

export default async function NewChatRoomPage() {
  const session = await getSession();
  const users = await prisma.user.findMany({
    where: { isActive: true, id: { not: session.sub }, role: { not: "CLIENT" } },
    orderBy: { username: "asc" },
    select: { id: true, username: true, role: true },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/chat" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">← 채팅</Link>
        <h1 className="mt-1 mb-3 text-2xl font-extrabold">채팅방 생성</h1>
        <Card>
          <ChatNewForm users={users.map((u) => ({ value: u.id, label: `${u.username} · ${u.role}` }))} />
        </Card>
      </div>
    </main>
  );
}
