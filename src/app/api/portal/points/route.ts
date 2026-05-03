import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { getPointBalance, getExpiringPoints } from "@/lib/portal-points";

// GET /api/portal/points — 본인 포인트 이력 + 잔액 + 거래처 정책
export async function GET(req: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");

    try {
      const url = new URL(req.url);
      const take = Math.min(Number(url.searchParams.get("take") ?? 50), 200);
      const skip = Math.max(Number(url.searchParams.get("skip") ?? 0), 0);
      const [items, balance, total, client, expiring] = await Promise.all([
        prisma.portalPoint.findMany({
          where: { clientId: user.clientId },
          orderBy: { createdAt: "desc" },
          take, skip,
          select: { id: true, amount: true, reason: true, reasonDetail: true, linkedModel: true, linkedId: true, createdAt: true, expiresAt: true, expiredAt: true },
        }),
        getPointBalance(user.clientId),
        prisma.portalPoint.count({ where: { clientId: user.clientId } }),
        prisma.client.findUnique({ where: { id: user.clientId }, select: { pointPolicy: true } }),
        getExpiringPoints(user.clientId, 30),
      ]);
      return ok({
        items, balance, total,
        hasMore: skip + items.length < total,
        pointPolicy: client?.pointPolicy ?? "NONE",
        expiring30d: expiring.totalExpiring,
        nextExpireAt: expiring.nextExpireAt,
      });
    } catch (e) { return serverError(e); }
  });
}
