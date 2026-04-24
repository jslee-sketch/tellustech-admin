import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";

// POST /api/notifications/[id]/read — 읽음 처리
// 본인 알림만 업데이트 가능.

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== session.sub) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (n.readAt) {
      return NextResponse.json({ ok: true, alreadyRead: true });
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true, readAt: updated.readAt });
  });
}
