import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { getPointBalance } from "@/lib/portal-points";

// GET /api/portal/points — 본인 포인트 이력 + 잔액
export async function GET(req: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
    if (!user?.clientId) return badRequest("not_linked");

    try {
      const url = new URL(req.url);
      const take = Math.min(Number(url.searchParams.get("take") ?? 50), 200);
      const skip = Math.max(Number(url.searchParams.get("skip") ?? 0), 0);
      const [items, balance, total] = await Promise.all([
        prisma.portalPoint.findMany({
          where: { clientId: user.clientId },
          orderBy: { createdAt: "desc" },
          take, skip,
          select: { id: true, amount: true, reason: true, reasonDetail: true, linkedModel: true, linkedId: true, createdAt: true },
        }),
        getPointBalance(user.clientId),
        prisma.portalPoint.count({ where: { clientId: user.clientId } }),
      ]);
      return ok({ items, balance, total, hasMore: skip + items.length < total });
    } catch (e) { return serverError(e); }
  });
}
