import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, requireString, serverError } from "@/lib/api-utils";

// Phase 2.C — 회계 마감 트리거.
// POST body: { yearMonth: 'YYYY-MM' } → 그 월 안에 createdAt 이 들어오는 모든
// Sales / Purchase / Expense / PayableReceivable 에 lockedAt + lockReason 부여.
// 멱등 — 이미 잠긴 건은 건드리지 않음. ADMIN/MANAGER 전용.

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return badRequest("forbidden");
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const ym = requireString(p.yearMonth, "yearMonth"); // YYYY-MM
      const m = /^(\d{4})-(\d{2})$/.exec(ym);
      if (!m) return badRequest("invalid_input", { field: "yearMonth", reason: "format_YYYY_MM" });
      const year = Number(m[1]); const month = Number(m[2]) - 1;
      const from = new Date(year, month, 1, 0, 0, 0);
      const to   = new Date(year, month + 1, 0, 23, 59, 59);
      const reason = `회계 마감 ${ym}`;
      const stamp = { lockedAt: new Date(), lockReason: reason };

      const [s, pu, e, pr] = await Promise.all([
        prisma.sales.updateMany({               where: { createdAt: { gte: from, lte: to }, lockedAt: null }, data: stamp }),
        prisma.purchase.updateMany({            where: { createdAt: { gte: from, lte: to }, lockedAt: null }, data: stamp }),
        prisma.expense.updateMany({             where: { incurredAt: { gte: from, lte: to }, lockedAt: null }, data: stamp }),
        prisma.payableReceivable.updateMany({   where: { createdAt: { gte: from, lte: to }, lockedAt: null }, data: stamp }),
      ]);
      return ok({ closed: ym, sales: s.count, purchases: pu.count, expenses: e.count, payables: pr.count });
    } catch (err) { return serverError(err); }
  });
}

// DELETE — 마감 해제 (ADMIN 전용)
export async function DELETE(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN") return badRequest("forbidden");
    const u = new URL(request.url);
    const ym = u.searchParams.get("yearMonth");
    const m = /^(\d{4})-(\d{2})$/.exec(ym ?? "");
    if (!m) return badRequest("invalid_input", { field: "yearMonth" });
    const year = Number(m[1]); const month = Number(m[2]) - 1;
    const from = new Date(year, month, 1);
    const to   = new Date(year, month + 1, 0, 23, 59, 59);
    const data = { lockedAt: null, lockReason: null };
    try {
      const [s, pu, e, pr] = await Promise.all([
        prisma.sales.updateMany({             where: { createdAt: { gte: from, lte: to }, lockedAt: { not: null } }, data }),
        prisma.purchase.updateMany({          where: { createdAt: { gte: from, lte: to }, lockedAt: { not: null } }, data }),
        prisma.expense.updateMany({           where: { incurredAt: { gte: from, lte: to }, lockedAt: { not: null } }, data }),
        prisma.payableReceivable.updateMany({ where: { createdAt: { gte: from, lte: to }, lockedAt: { not: null } }, data }),
      ]);
      return ok({ reopened: ym, sales: s.count, purchases: pu.count, expenses: e.count, payables: pr.count });
    } catch (err) { return serverError(err); }
  });
}
