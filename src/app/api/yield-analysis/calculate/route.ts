import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError, trimNonEmpty } from "@/lib/api-utils";
import { calculateYieldRate, notifyFraudSuspect } from "@/lib/yield-analysis";
import type { Prisma } from "@/generated/prisma/client";

// POST /api/yield-analysis/calculate
// Body: { equipmentId?, contractId?, periodStart, periodEnd }
//  - equipmentId 단일 장비 계산
//  - contractId 면 계약의 모든 활성 장비 일괄
// 결과: 계산된 YieldAnalysis 행들 반환. RED 시 자동 알림.

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;

    const equipmentId = trimNonEmpty(p.equipmentId);
    const contractId = trimNonEmpty(p.contractId);
    const periodStartRaw = trimNonEmpty(p.periodStart);
    const periodEndRaw = trimNonEmpty(p.periodEnd);
    if (!periodStartRaw || !periodEndRaw) return badRequest("invalid_input", { field: "period", reason: "required" });
    if (!equipmentId && !contractId) return badRequest("invalid_input", { field: "target", reason: "equipmentId_or_contractId_required" });

    const periodStart = new Date(periodStartRaw);
    const periodEnd = new Date(periodEndRaw);
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodStart >= periodEnd) {
      return badRequest("invalid_input", { field: "period", reason: "invalid_range" });
    }

    try {
      // 대상 장비 결정
      const equipments = equipmentId
        ? await prisma.itContractEquipment.findMany({
            where: { id: equipmentId },
            select: { id: true, itContractId: true, serialNumber: true, actualCoverage: true, itContract: { select: { clientId: true, contractNumber: true } } },
          })
        : await prisma.itContractEquipment.findMany({
            where: { itContractId: contractId!, removedAt: null },
            select: { id: true, itContractId: true, serialNumber: true, actualCoverage: true, itContract: { select: { clientId: true, contractNumber: true } } },
          });
      if (equipments.length === 0) return badRequest("invalid_input", { field: "target", reason: "no_equipment" });

      const results: { id: string; equipmentId: string; serialNumber: string; yieldRateBw: number; yieldRateColor: number | null; isFraudSuspect: boolean }[] = [];

      for (const eq of equipments) {
        const calc = await calculateYieldRate(eq.id, periodStart, periodEnd);
        if (!calc) continue;
        const companyCode: "TV" | "VR" = eq.itContract.contractNumber.startsWith("VRT-") ? "VR" : "TV";

        const consumablesUsed = [
          ...calc.bw.consumablesDetail,
          ...(calc.color?.consumablesDetail ?? []),
        ] as unknown as Prisma.InputJsonValue;

        const created = await prisma.yieldAnalysis.create({
          data: {
            equipmentId: eq.id,
            contractId: eq.itContractId,
            clientId: eq.itContract.clientId,
            periodStart, periodEnd,
            actualPagesBw: calc.bw.actualPages,
            actualPagesColor: calc.color?.actualPages ?? 0,
            consumablesUsed,
            actualCoverage: eq.actualCoverage ?? 5,
            expectedPagesBw: calc.bw.expectedPages,
            expectedPagesColor: calc.color?.expectedPages ?? 0,
            yieldRateBw: calc.bw.yieldRate,
            yieldRateColor: calc.color?.yieldRate ?? null,
            badgeBw: calc.bw.badge,
            badgeColor: calc.color?.badge ?? null,
            isFraudSuspect: calc.bw.isFraudSuspect || (calc.color?.isFraudSuspect ?? false),
            calculatedById: session.sub,
            companyCode,
          },
        });

        await prisma.itContractEquipment.update({
          where: { id: eq.id },
          data: {
            lastYieldRateBw: calc.bw.yieldRate,
            lastYieldRateColor: calc.color?.yieldRate ?? null,
            lastYieldCalcAt: new Date(),
          },
        });

        if (created.isFraudSuspect) {
          await notifyFraudSuspect(created.id).catch((e) => console.error("[yield] notifyFraudSuspect:", e));
        }

        results.push({
          id: created.id,
          equipmentId: eq.id,
          serialNumber: eq.serialNumber,
          yieldRateBw: calc.bw.yieldRate,
          yieldRateColor: calc.color?.yieldRate ?? null,
          isFraudSuspect: created.isFraudSuspect,
        });
      }

      return ok({ results, count: results.length }, { status: 201 });
    } catch (err) {
      return serverError(err);
    }
  });
}
