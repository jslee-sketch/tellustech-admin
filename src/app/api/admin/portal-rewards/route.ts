import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden, ok, serverError } from "@/lib/api-utils";

// GET /api/admin/portal-rewards — 교환 신청 목록
export async function GET(req: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const where: any = {};
    if (status) where.status = status;
    try {
      const items = await prisma.portalReward.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { client: { select: { clientCode: true, companyNameVi: true } } },
      });
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}
