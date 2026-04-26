import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { ok, trimNonEmpty } from "@/lib/api-utils";

function parseDate(s: string | null): Date | null { if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d; }
function defaultRange() { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth(), 1), to: new Date(n.getFullYear(), n.getMonth()+1, 0, 23,59,59) }; }
function splitIds(s: string | null): string[] { return (s ?? "").split(",").map((x) => x.trim()).filter(Boolean); }

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const u = new URL(request.url);
    const from = parseDate(trimNonEmpty(u.searchParams.get("from"))) ?? defaultRange().from;
    const to   = parseDate(trimNonEmpty(u.searchParams.get("to")))   ?? defaultRange().to;
    const clients   = splitIds(u.searchParams.get("clients"));   // suppliers
    const items     = splitIds(u.searchParams.get("items"));
    const projects  = splitIds(u.searchParams.get("projects"));
    const employees = splitIds(u.searchParams.get("employees"));

    const where: Record<string, unknown> = {
      createdAt: { gte: from, lte: to },
      ...(clients.length ? { supplierId: { in: clients } } : {}),
      ...(projects.length ? { projectId: { in: projects } } : {}),
      ...(employees.length ? { salesEmployeeId: { in: employees } } : {}),
      ...(items.length ? { items: { some: { itemId: { in: items } } } } : {}),
    };

    const purchases = await prisma.purchase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: {
        supplier: { select: { clientCode: true, companyNameVi: true } },
        project: { select: { projectCode: true, name: true } },
        items: { select: { itemId: true, quantity: true, item: { select: { itemCode: true, name: true } } } },
      },
    });

    const rows = purchases.map((p) => {
      const totalQty = p.items.reduce((sum, it) => sum + Number(it.quantity ?? 0), 0);
      const repItem = p.items[0]?.item;
      return {
        id: p.id,
        purchaseNumber: p.purchaseNumber,
        purchaseDate: p.createdAt,
        supplier: p.supplier ? `${p.supplier.clientCode} · ${p.supplier.companyNameVi}` : "-",
        repItem: repItem ? `${repItem.itemCode} · ${repItem.name}` : "-",
        project: p.project ? `${p.project.projectCode} · ${p.project.name}` : "-",
        quantity: totalQty,
        amount: p.totalAmount,
        salesEmployeeId: p.salesEmployeeId,
      };
    });

    return ok({ from, to, count: rows.length, sumAmount: rows.reduce((a, r) => a + Number(r.amount ?? 0), 0).toFixed(2), rows });
  });
}
