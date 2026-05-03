// 기사별 통계 — AsDispatchPart.dispatch.employee 기반 실제 집계.
// 필터: from, to (period range — AS dispatch departedAt 기준).

import { withSessionContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api-utils";

export async function GET(request: Request) {
  return withSessionContext(async () => {
    try {
      const u = new URL(request.url);
      const from = u.searchParams.get("from");
      const to = u.searchParams.get("to");

      const where: Record<string, unknown> = {
        asDispatch: { deletedAt: null },
      };
      if (from || to) {
        (where.asDispatch as Record<string, unknown>).departedAt = {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        };
      }

      // AsDispatchPart 직접 조회 — targetContractId 가 contract 매핑 (auto-filled).
      const parts = await prisma.asDispatchPart.findMany({
        where,
        select: {
          itemId: true,
          quantity: true,
          targetContractId: true,
          asDispatch: {
            select: {
              departedAt: true,
              dispatchEmployee: { select: { id: true, employeeCode: true, nameVi: true, nameKo: true, nameEn: true } },
            },
          },
        },
      });

      // 같은 기간 + 같은 contract 의 YieldAnalysis 가 RED 인 경우 의심 카운트
      const contractIds = Array.from(new Set(parts.map((p) => p.targetContractId).filter((x): x is string => !!x)));
      const yields = contractIds.length > 0
        ? await prisma.yieldAnalysis.findMany({
            where: {
              contractId: { in: contractIds },
              ...(from ? { periodFrom: { gte: new Date(from) } } : {}),
              ...(to ? { periodTo: { lte: new Date(to) } } : {}),
            },
            select: { contractId: true, isFraudSuspect: true, yieldRateBw: true },
          })
        : [];
      const suspectByContract = new Map<string, { suspect: number; total: number; rateSum: number }>();
      for (const y of yields) {
        const cur = suspectByContract.get(y.contractId) ?? { suspect: 0, total: 0, rateSum: 0 };
        cur.total += 1;
        if (y.isFraudSuspect) cur.suspect += 1;
        cur.rateSum += Number(y.yieldRateBw);
        suspectByContract.set(y.contractId, cur);
      }

      // 기사별 집계
      const map = new Map<string, {
        employeeId: string;
        employeeCode: string;
        nameVi: string;
        nameKo: string | null;
        nameEn: string | null;
        partsCount: number;
        partsQuantity: number;
        contractsHandled: Set<string>;
      }>();

      for (const p of parts) {
        const emp = p.asDispatch.dispatchEmployee;
        if (!emp) continue;
        const cur = map.get(emp.id) ?? {
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          nameVi: emp.nameVi,
          nameKo: emp.nameKo,
          nameEn: emp.nameEn,
          partsCount: 0,
          partsQuantity: 0,
          contractsHandled: new Set<string>(),
        };
        cur.partsCount += 1;
        cur.partsQuantity += Number(p.quantity);
        if (p.targetContractId) cur.contractsHandled.add(p.targetContractId);
        map.set(emp.id, cur);
      }

      const stats = Array.from(map.values()).map((v) => {
        let suspectSum = 0, rateSum = 0, n = 0;
        for (const cId of v.contractsHandled) {
          const cs = suspectByContract.get(cId);
          if (cs) {
            suspectSum += cs.suspect;
            rateSum += cs.rateSum;
            n += cs.total;
          }
        }
        return {
          employeeId: v.employeeId,
          employeeCode: v.employeeCode,
          nameVi: v.nameVi,
          nameKo: v.nameKo,
          nameEn: v.nameEn,
          partsCount: v.partsCount,
          partsQuantity: v.partsQuantity,
          contractsHandled: v.contractsHandled.size,
          suspectContractCount: suspectSum,
          avgYieldRate: n > 0 ? Math.round((rateSum / n) * 10) / 10 : 0,
        };
      });

      stats.sort((a, b) => b.suspectContractCount - a.suspectContractCount || a.avgYieldRate - b.avgYieldRate);

      return ok({ stats });
    } catch (e) { return serverError(e); }
  });
}
