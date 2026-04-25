import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden } from "@/lib/api-utils";

// 진단 전용 — ADMIN 만. Notification 테이블의 모든 행을 userId 별로 그룹.
export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN") return forbidden();
    const all = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, userId: true, type: true, titleKo: true, linkUrl: true, readAt: true, createdAt: true },
    });
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(new Set(all.map((n) => n.userId))) } },
      select: { id: true, username: true, role: true },
    });
    const byUser: Record<string, { username: string; role: string; count: number; types: Record<string, number> }> = {};
    for (const u of users) byUser[u.id] = { username: u.username, role: u.role, count: 0, types: {} };
    for (const n of all) {
      const e = byUser[n.userId];
      if (!e) continue;
      e.count++;
      e.types[n.type] = (e.types[n.type] ?? 0) + 1;
    }
    return NextResponse.json({
      sessionUserId: session.sub,
      totalNotifications: all.length,
      byUser,
      recent5: all.slice(0, 5).map((n) => ({ uid: n.userId.slice(-6), type: n.type, ko: (n.titleKo ?? "").slice(0, 50), ts: n.createdAt })),
    });
  });
}
