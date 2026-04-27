import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-utils";

// GET /api/admin/portal-points — 전체 포인트 이력 (필터)
export async function GET(req: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId");
    const reason = url.searchParams.get("reason");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const take = Math.min(Number(url.searchParams.get("take") ?? 200), 1000);

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (reason) where.reason = reason;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    try {
      const items = await prisma.portalPoint.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        include: { client: { select: { clientCode: true, companyNameVi: true } } },
      });
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}
