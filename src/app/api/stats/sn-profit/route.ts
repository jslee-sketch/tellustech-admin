import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { ok, trimNonEmpty } from "@/lib/api-utils";
import { requireModulePermission } from "@/lib/permissions";

function parseDate(s: string | null): Date | null { if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d; }
function defaultRange() { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth(), 1), to: new Date(n.getFullYear(), n.getMonth()+1, 0, 23,59,59) }; }
function splitIds(s: string | null): string[] { return (s ?? "").split(",").map((x) => x.trim()).filter(Boolean); }

// SN별 이익현황 — 매출 SalesItem 기준으로 SN, 품목, 계약번호(IT 활성 계약), 고객, 매출, 매입, 비용, 이익
// 비용 = AS dispatch parts.totalCost (해당 targetEquipmentSN 합산) + 일반 inventoryTransaction CONSUMABLE_OUT 추정 cost
export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const g = await requireModulePermission(session.sub, session.role, "STATS", "READ");
    if (g) return g;
    const u = new URL(request.url);
    const from = parseDate(trimNonEmpty(u.searchParams.get("from"))) ?? defaultRange().from;
    const to   = parseDate(trimNonEmpty(u.searchParams.get("to")))   ?? defaultRange().to;
    const itemsFilter = splitIds(u.searchParams.get("items"));

    // 1) 매출 라인 SN 목록 (해당 기간 매출 + sn 존재)
    const salesItems = await prisma.salesItem.findMany({
      where: {
        sales: { createdAt: { gte: from, lte: to } },
        serialNumber: { not: null },
        ...(itemsFilter.length ? { itemId: { in: itemsFilter } } : {}),
      },
      include: {
        item: { select: { itemCode: true, name: true } },
        sales: {
          select: {
            salesNumber: true,
            client: { select: { clientCode: true, companyNameVi: true } },
            project: { select: { projectCode: true, name: true } },
            salesEmployeeId: true,
          },
        },
      },
      take: 1000,
    });

    // 2) SN→IT 계약 매핑
    const sns = [...new Set(salesItems.map((s) => s.serialNumber!).filter(Boolean))];
    const itEqs = await prisma.itContractEquipment.findMany({
      where: { serialNumber: { in: sns } },
      select: {
        serialNumber: true, itContractId: true,
        itContract: { select: { contractNumber: true, client: { select: { companyNameVi: true } } } },
      },
    });
    const eqBySn = new Map<string, { contractNumber: string; clientName: string }>();
    for (const e of itEqs) {
      eqBySn.set(e.serialNumber, {
        contractNumber: e.itContract?.contractNumber ?? "-",
        clientName: e.itContract?.client?.companyNameVi ?? "-",
      });
    }

    // 3) 매입 — purchaseItems 으로 SN 매입가
    const purItems = await prisma.purchaseItem.findMany({
      where: { serialNumber: { in: sns } },
      select: { serialNumber: true, unitPrice: true },
    });
    const purBySn = new Map<string, number>();
    for (const p of purItems) {
      if (!p.serialNumber) continue;
      purBySn.set(p.serialNumber, Number(p.unitPrice ?? 0));
    }

    // 4) 비용 — AS dispatch parts.totalCost 합산 (per targetEquipmentSN)
    const dispatchCosts = await prisma.asDispatchPart.groupBy({
      by: ["targetEquipmentSN"],
      where: { targetEquipmentSN: { in: sns } },
      _sum: { totalCost: true },
    });
    const repairCostBySn = new Map<string, number>();
    for (const c of dispatchCosts) {
      repairCostBySn.set(c.targetEquipmentSN, Number(c._sum.totalCost ?? 0));
    }
    // CONSUMABLE_OUT 비용 (inventoryTransaction)
    const consumeTxns = await prisma.inventoryTransaction.findMany({
      where: { reason: "CONSUMABLE_OUT", targetEquipmentSN: { in: sns } },
      select: { targetEquipmentSN: true, itemId: true, quantity: true },
    });
    // 소모품 매입가 lookup — 같은 itemId 의 PurchaseItem 평균 unitPrice
    const consumeItemIds = [...new Set(consumeTxns.map((t) => t.itemId))];
    const itemUnitCosts = consumeItemIds.length
      ? await prisma.purchaseItem.groupBy({
          by: ["itemId"],
          where: { itemId: { in: consumeItemIds } },
          _avg: { unitPrice: true },
        })
      : [];
    const avgPriceByItem = new Map<string, number>();
    for (const r of itemUnitCosts) avgPriceByItem.set(r.itemId, Number(r._avg.unitPrice ?? 0));
    const consumeCostBySn = new Map<string, number>();
    for (const t of consumeTxns) {
      if (!t.targetEquipmentSN) continue;
      const unit = avgPriceByItem.get(t.itemId) ?? 0;
      consumeCostBySn.set(t.targetEquipmentSN, (consumeCostBySn.get(t.targetEquipmentSN) ?? 0) + unit * Number(t.quantity ?? 1));
    }

    // 5) 결과 행 구성
    const rows = salesItems.map((si) => {
      const sn = si.serialNumber!;
      const eq = eqBySn.get(sn);
      const sales = Number(si.amount ?? 0);
      const purchase = purBySn.get(sn) ?? 0;
      const repair = repairCostBySn.get(sn) ?? 0;
      const consume = consumeCostBySn.get(sn) ?? 0;
      const cost = repair + consume;
      const profit = sales - purchase - cost;
      return {
        sn,
        item: si.item ? `${si.item.itemCode} · ${si.item.name}` : "-",
        contractNumber: eq?.contractNumber ?? "-",
        client: eq?.clientName ?? si.sales?.client?.companyNameVi ?? "-",
        salesEmployeeId: si.sales?.salesEmployeeId ?? null,
        project: si.sales?.project ? `${si.sales.project.projectCode} · ${si.sales.project.name}` : "-",
        salesAmount: sales.toFixed(2),
        purchaseAmount: purchase.toFixed(2),
        cost: cost.toFixed(2),
        profit: profit.toFixed(2),
      };
    });

    return ok({ from, to, count: rows.length, rows });
  });
}
