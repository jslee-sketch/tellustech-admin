import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { calculateYieldRate, notifyFraudSuspect } from "@/lib/yield-analysis";
import type { Prisma } from "@/generated/prisma/client";

// POST /api/jobs/yield-analysis-monthly
// 매월 1일 02:00 KST. 전월의 모든 ACTIVE IT계약 장비에 대해 적정율 일괄 계산.
// 회사·계약·장비 단위로 SNMP 카운터 + AsDispatchPart 가 있는 케이스만 분석.
// 인증: Bearer CRON_SECRET (외부 cron) OR ADMIN 세션.

function previousMonthRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based; 전월은 m-1
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0) - 1); // 전월 말일 23:59:59.999 (UTC)
  const label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  return { start, end, label };
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  const bearerOk = expected && auth === `Bearer ${expected}`;
  let adminOk = false;
  if (!bearerOk) {
    try { const s = await getSession(); adminOk = s.role === "ADMIN"; } catch { /* 비로그인 */ }
  }
  if (!bearerOk && !adminOk) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sync = url.searchParams.get("sync") === "1";
  const targetParam = url.searchParams.get("targetMonth"); // "YYYY-MM" override

  let periodStart: Date, periodEnd: Date, label: string;
  if (targetParam && /^\d{4}-\d{2}$/.test(targetParam)) {
    const [y, m] = targetParam.split("-").map(Number);
    periodStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    periodEnd = new Date(Date.UTC(y, m, 1, 0, 0, 0) - 1);
    label = targetParam;
  } else {
    const r = previousMonthRange(); periodStart = r.start; periodEnd = r.end; label = r.label;
  }

  const runJob = async () => {
    const contracts = await prisma.itContract.findMany({
      where: { status: "ACTIVE" },
      include: {
        equipment: {
          where: { removedAt: null },
          select: { id: true, serialNumber: true, actualCoverage: true },
        },
      },
    });

    const summary: { total: number; created: number; fraudCount: number; skippedNoData: number } = {
      total: 0, created: 0, fraudCount: 0, skippedNoData: 0,
    };

    for (const contract of contracts) {
      // ItContract 와 Client 둘 다 companyCode 를 들고 있지 않음 (Client 는 공유 마스터).
      // contractNumber 의 prefix 로 회사 식별 (TLS-* = TV, VRT-* = VR).
      const companyCode: "TV" | "VR" = contract.contractNumber.startsWith("VRT-") ? "VR" : "TV";

      for (const eq of contract.equipment) {
        summary.total += 1;
        const hasReadings = await prisma.snmpReading.count({
          where: { equipmentId: eq.id, collectedAt: { gte: periodStart, lte: periodEnd } },
        });
        const hasParts = await prisma.asDispatchPart.count({
          where: {
            targetEquipmentSN: eq.serialNumber,
            asDispatch: { completedAt: { gte: periodStart, lte: periodEnd } },
          },
        });
        if (hasReadings === 0 && hasParts === 0) { summary.skippedNoData += 1; continue; }

        try {
          const calc = await calculateYieldRate(eq.id, periodStart, periodEnd);
          if (!calc) continue;
          const consumablesUsed = [
            ...calc.bw.consumablesDetail,
            ...(calc.color?.consumablesDetail ?? []),
          ] as unknown as Prisma.InputJsonValue;
          const created = await prisma.yieldAnalysis.create({
            data: {
              equipmentId: eq.id,
              contractId: contract.id,
              clientId: contract.clientId,
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
              calculatedById: "SYSTEM",
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
            summary.fraudCount += 1;
            await notifyFraudSuspect(created.id).catch((e) => console.error("[yield-cron] notify:", e));
          }
          summary.created += 1;
        } catch (e) {
          console.error("[yield-cron] equipment failed:", eq.id, e);
        }
      }
    }
    console.log(`[yield-cron] ${label} done:`, JSON.stringify(summary));
    return summary;
  };

  if (sync) {
    const summary = await runJob();
    return NextResponse.json({ ok: true, mode: "sync", label, ...summary });
  }
  runJob().catch((e) => console.error("[yield-cron] background error:", e));
  return NextResponse.json({ ok: true, mode: "async", label, note: "Running in background. Check logs." }, { status: 202 });
}
