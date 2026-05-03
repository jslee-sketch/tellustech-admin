import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError, trimNonEmpty } from "@/lib/api-utils";

// 거래처별 수익성 — 매출 - 직접비(소모품/부품/출동교통) - 간접비배분 = 순이익
// GET ?period=YYYY-MM (월) 또는 ?periodStart=YYYY-MM-DD&periodEnd=YYYY-MM-DD
export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const period = trimNonEmpty(url.searchParams.get("period"));
    let from: Date, to: Date;
    if (period && /^\d{4}-\d{2}$/.test(period)) {
      const y = Number(period.slice(0, 4)); const m = Number(period.slice(5, 7)) - 1;
      from = new Date(y, m, 1, 0, 0, 0);
      to = new Date(y, m + 1, 0, 23, 59, 59);
    } else {
      const ps = trimNonEmpty(url.searchParams.get("periodStart"));
      const pe = trimNonEmpty(url.searchParams.get("periodEnd"));
      if (!ps || !pe) return badRequest("missing_period");
      from = new Date(ps); to = new Date(pe);
    }

    try {
      // 1) 매출 — 거래처별 합계
      const sales = await prisma.sales.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { clientId: true, totalAmount: true, fxRate: true, currency: true },
      });
      const revenueByClient = new Map<string, number>();
      for (const s of sales) {
        const local = Number(s.totalAmount) * (s.currency === "VND" ? 1 : Number(s.fxRate));
        revenueByClient.set(s.clientId, (revenueByClient.get(s.clientId) ?? 0) + local);
      }

      // 2) 직접비 — Expense.targetClientId 가 있는 비용 집계 (운송/소모품/기타)
      const expenses = await prisma.expense.findMany({
        where: { incurredAt: { gte: from, lte: to }, targetClientId: { not: null } },
        select: { targetClientId: true, expenseType: true, amount: true, fxRate: true, currency: true },
      });
      const directCostByClient = new Map<string, { transport: number; consumable: number; other: number; total: number }>();
      for (const e of expenses) {
        if (!e.targetClientId) continue;
        const local = Number(e.amount) * (e.currency === "VND" ? 1 : Number(e.fxRate));
        const cur = directCostByClient.get(e.targetClientId) ?? { transport: 0, consumable: 0, other: 0, total: 0 };
        if (e.expenseType === "TRANSPORT") cur.transport += local;
        else cur.other += local;
        cur.total += local;
        directCostByClient.set(e.targetClientId, cur);
      }

      // 3) AsDispatchPart — 거래처별 부품 원가 (asDispatch.asTicket.clientId)
      const dispatchParts = await prisma.asDispatchPart.findMany({
        where: { createdAt: { gte: from, lte: to }, totalCost: { not: null } },
        select: {
          totalCost: true,
          asDispatch: { select: { asTicket: { select: { clientId: true } } } },
        },
      });
      const partsByClient = new Map<string, number>();
      for (const dp of dispatchParts) {
        const cId = dp.asDispatch?.asTicket?.clientId;
        if (!cId) continue;
        partsByClient.set(cId, (partsByClient.get(cId) ?? 0) + Number(dp.totalCost ?? 0));
      }
      // parts 를 directCostByClient 의 consumable 로 합산
      for (const [cId, partsCost] of partsByClient.entries()) {
        const cur = directCostByClient.get(cId) ?? { transport: 0, consumable: 0, other: 0, total: 0 };
        cur.consumable += partsCost;
        cur.total += partsCost;
        directCostByClient.set(cId, cur);
      }

      // 4) 거래처 라벨
      const allClientIds = Array.from(new Set([...revenueByClient.keys(), ...directCostByClient.keys()]));
      const clients = allClientIds.length > 0 ? await prisma.client.findMany({
        where: { id: { in: allClientIds } },
        select: { id: true, clientCode: true, companyNameVi: true, companyNameKo: true },
      }) : [];
      const clientMap = new Map(clients.map((c) => [c.id, c]));

      // 5) 간접비 배분 — targetClientId 미지정(공통 비용) 합계를 매출 비율로 분배 (REVENUE_RATIO 기본).
      const indirectTotal = expenses
        .filter((e) => !e.targetClientId)
        .reduce((sum, e) => sum + Number(e.amount) * (e.currency === "VND" ? 1 : Number(e.fxRate)), 0);
      const totalRevenueAll = Array.from(revenueByClient.values()).reduce((s, v) => s + v, 0);

      // 6) 결과 — 매출 기준 정렬
      const result = allClientIds.map((cId) => {
        const c = clientMap.get(cId);
        const revenue = revenueByClient.get(cId) ?? 0;
        const dc = directCostByClient.get(cId) ?? { transport: 0, consumable: 0, other: 0, total: 0 };
        const contributionMargin = revenue - dc.total;
        // REVENUE_RATIO 분배 — 매출 비율로 indirectTotal 안분
        const indirectCostAlloc = totalRevenueAll > 0
          ? Math.round((indirectTotal * revenue) / totalRevenueAll)
          : 0;
        const netProfit = contributionMargin - indirectCostAlloc;
        const profitRate = revenue > 0 ? (netProfit / revenue) * 100 : 0;
        return {
          clientId: cId,
          clientLabel: c ? `${c.clientCode} · ${c.companyNameKo ?? c.companyNameVi}` : cId,
          revenue, directCost: dc, contributionMargin, indirectCostAlloc, netProfit, profitRate,
        };
      }).sort((a, b) => b.revenue - a.revenue);

      return ok({ period: { from, to }, rows: result });
    } catch (err) { return serverError(err); }
  });
}
