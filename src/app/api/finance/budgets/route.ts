import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, requireString, serverError, trimNonEmpty } from "@/lib/api-utils";

// GET ?yearMonth=2026-05 → Budget[] + actualAmount(Expense + Allocation 집계)
export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const ym = trimNonEmpty(url.searchParams.get("yearMonth"));
    const budgets = await prisma.budget.findMany({
      where: ym ? { yearMonth: ym } : {},
      orderBy: [{ yearMonth: "desc" }, { costCenterId: "asc" }],
      include: { costCenter: { select: { code: true, name: true, centerType: true } } },
    });
    return ok({ budgets });
  });
}

// POST { costCenterId, yearMonth, budgetAmount } — upsert
export async function POST(request: Request) {
  return withSessionContext(async () => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const costCenterId = requireString(p.costCenterId, "costCenterId");
      const yearMonth = requireString(p.yearMonth, "yearMonth");
      if (!/^\d{4}-\d{2}$/.test(yearMonth)) return badRequest("invalid_input", { field: "yearMonth" });
      const budgetAmount = Number(p.budgetAmount ?? 0);
      if (!Number.isFinite(budgetAmount) || budgetAmount < 0) return badRequest("invalid_input", { field: "budgetAmount" });
      const b = await prisma.budget.upsert({
        where: { costCenterId_yearMonth: { costCenterId, yearMonth } },
        create: { costCenterId, yearMonth, budgetAmount: budgetAmount.toFixed(2) },
        update: { budgetAmount: budgetAmount.toFixed(2) },
      });
      return ok({ budget: b }, { status: 201 });
    } catch (err) { return serverError(err); }
  });
}
