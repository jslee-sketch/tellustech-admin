import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { ok, trimNonEmpty } from "@/lib/api-utils";
import { requireModulePermission } from "@/lib/permissions";

// GET /api/stats/sales?from=YYYY-MM-DD&to=YYYY-MM-DD&clients=id1,id2&items=id1,id2
//                      &projects=id1,id2&employees=id1,id2
// 매출현황 — 매출번호/매출일자/거래처/대표항목/프로젝트/수량/매출액/영업사원

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
function defaultRange(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { from, to };
}
function splitIds(s: string | null): string[] {
  return (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
}

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const g = await requireModulePermission(session.sub, session.role, "STATS", "READ");
    if (g) return g;
    const u = new URL(request.url);
    const from = parseDate(trimNonEmpty(u.searchParams.get("from"))) ?? defaultRange().from;
    const to   = parseDate(trimNonEmpty(u.searchParams.get("to")))   ?? defaultRange().to;
    const clients   = splitIds(u.searchParams.get("clients"));
    const items     = splitIds(u.searchParams.get("items"));
    const projects  = splitIds(u.searchParams.get("projects"));
    const employees = splitIds(u.searchParams.get("employees"));

    const where: Record<string, unknown> = {
      createdAt: { gte: from, lte: to },
      ...(clients.length ? { clientId: { in: clients } } : {}),
      ...(projects.length ? { projectId: { in: projects } } : {}),
      ...(employees.length ? { salesEmployeeId: { in: employees } } : {}),
      ...(items.length ? { items: { some: { itemId: { in: items } } } } : {}),
    };

    const sales = await prisma.sales.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: {
        client: { select: { clientCode: true, companyNameVi: true } },
        project: { select: { projectCode: true, name: true } },
        items: { select: { itemId: true, quantity: true, item: { select: { itemCode: true, name: true } } } },
      },
    });

    const rows = sales.map((s) => {
      const totalQty = s.items.reduce((sum, it) => sum + Number(it.quantity ?? 0), 0);
      const repItem = s.items[0]?.item;
      return {
        id: s.id,
        salesNumber: s.salesNumber,
        salesDate: s.createdAt,
        client: s.client ? `${s.client.clientCode} · ${s.client.companyNameVi}` : "-",
        repItem: repItem ? `${repItem.itemCode} · ${repItem.name}` : "-",
        project: s.project ? `${s.project.projectCode} · ${s.project.name}` : "-",
        quantity: totalQty,
        amount: s.totalAmount,
        salesEmployeeId: s.salesEmployeeId,
      };
    });

    return ok({ from, to, count: rows.length, sumAmount: rows.reduce((a, r) => a + Number(r.amount ?? 0), 0).toFixed(2), rows });
  });
}
