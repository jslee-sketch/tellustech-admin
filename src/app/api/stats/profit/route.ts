import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { ok, trimNonEmpty } from "@/lib/api-utils";

function parseDate(s: string | null): Date | null { if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d; }
function defaultRange() { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth(), 1), to: new Date(n.getFullYear(), n.getMonth()+1, 0, 23,59,59) }; }
function splitIds(s: string | null): string[] { return (s ?? "").split(",").map((x) => x.trim()).filter(Boolean); }

// 이익현황 — 해당 기간의 총매입 / 총매출 / 총비용 / 이익(매출-매입-비용)
export async function GET(request: Request) {
  return withSessionContext(async () => {
    const u = new URL(request.url);
    const from = parseDate(trimNonEmpty(u.searchParams.get("from"))) ?? defaultRange().from;
    const to   = parseDate(trimNonEmpty(u.searchParams.get("to")))   ?? defaultRange().to;
    const clients   = splitIds(u.searchParams.get("clients"));
    const items     = splitIds(u.searchParams.get("items"));
    const projects  = splitIds(u.searchParams.get("projects"));
    const employees = splitIds(u.searchParams.get("employees"));

    const salesWhere: Record<string, unknown> = {
      createdAt: { gte: from, lte: to },
      ...(clients.length ? { clientId: { in: clients } } : {}),
      ...(projects.length ? { projectId: { in: projects } } : {}),
      ...(employees.length ? { salesEmployeeId: { in: employees } } : {}),
      ...(items.length ? { items: { some: { itemId: { in: items } } } } : {}),
    };
    const purchaseWhere: Record<string, unknown> = {
      createdAt: { gte: from, lte: to },
      ...(clients.length ? { supplierId: { in: clients } } : {}),
      ...(projects.length ? { projectId: { in: projects } } : {}),
      ...(employees.length ? { salesEmployeeId: { in: employees } } : {}),
      ...(items.length ? { items: { some: { itemId: { in: items } } } } : {}),
    };
    const expenseWhere: Record<string, unknown> = {
      incurredAt: { gte: from, lte: to },
    };

    const [salesAgg, purchaseAgg, expenseAgg] = await Promise.all([
      prisma.sales.aggregate({ where: salesWhere, _sum: { totalAmount: true }, _count: true }),
      prisma.purchase.aggregate({ where: purchaseWhere, _sum: { totalAmount: true }, _count: true }),
      prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true }, _count: true }),
    ]);

    const totalSales    = Number(salesAgg._sum.totalAmount ?? 0);
    const totalPurchase = Number(purchaseAgg._sum.totalAmount ?? 0);
    const totalExpense  = Number(expenseAgg._sum.amount ?? 0);
    const profit        = totalSales - totalPurchase - totalExpense;

    return ok({
      from, to,
      counts: { sales: salesAgg._count, purchases: purchaseAgg._count, expenses: expenseAgg._count },
      totalSales: totalSales.toFixed(2),
      totalPurchase: totalPurchase.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      profit: profit.toFixed(2),
    });
  });
}
