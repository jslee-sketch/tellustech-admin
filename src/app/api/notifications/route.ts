import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";

// GET /api/notifications
//   ?status=unread|all (기본 unread) &limit=50
// 응답: { notifications: [...], unreadCount: number }

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") === "all" ? "all" : "unread";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

    const where =
      status === "unread"
        ? { userId: session.sub, readAt: null }
        : { userId: session.sub };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: session.sub, readAt: null },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  });
}
