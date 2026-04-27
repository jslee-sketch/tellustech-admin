import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-utils";

// GET /api/admin/portal-points/config — 14종 reason별 단가 + 활성 토글
export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    try {
      const items = await prisma.pointConfig.findMany({ orderBy: { reason: "asc" } });
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}

// PUT /api/admin/portal-points/config
// body: { items: [{ reason, amount, isActive }] }
export async function PUT(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN") return forbidden();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const list = Array.isArray(p.items) ? (p.items as any[]) : [];
    if (list.length === 0) return badRequest("empty_items");
    try {
      for (const it of list) {
        const reason = String(it.reason ?? "");
        const amount = Math.max(0, Math.floor(Number(it.amount ?? 0)));
        const isActive = Boolean(it.isActive);
        if (!reason) continue;
        await prisma.pointConfig.upsert({
          where: { reason: reason as any },
          update: { amount, isActive },
          create: { reason: reason as any, amount, isActive },
        });
      }
      const items = await prisma.pointConfig.findMany({ orderBy: { reason: "asc" } });
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}
