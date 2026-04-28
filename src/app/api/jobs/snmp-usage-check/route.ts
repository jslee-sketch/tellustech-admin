import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { calculateUsageForContract } from "@/lib/usage-calc";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";

// POST /api/jobs/snmp-usage-check
// 매일 03:00 KST. 모든 ACTIVE 계약의 snmpCollectDay == 어제 인 경우:
//   - 이번 달 reading 도착 확인
//   - 도착 → UsageConfirmation 자동 생성 + 고객 알림
//   - 미도착 → 관리자 알림 ("미수집 — 수동 입력 필요")
// 헤더: Authorization: Bearer ${CRON_SECRET}
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // KST 어제 일자
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const targetDay = yesterday.getDate();
  const billingMonth = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}`;

  const contracts = await prisma.itContract.findMany({
    where: { deletedAt: null, status: "ACTIVE", snmpCollectDay: targetDay },
    select: { id: true, contractNumber: true, clientId: true },
  });

  const results: any[] = [];
  for (const c of contracts) {
    // 이미 같은 (contractId, billingMonth) UC 있으면 skip
    const existing = await prisma.usageConfirmation.findFirst({ where: { contractId: c.id, billingMonth } });
    if (existing) { results.push({ contractNumber: c.contractNumber, status: "already_exists" }); continue; }

    try {
      const usage = await calculateUsageForContract(c.id, billingMonth);
      const totalAmount = usage.reduce((s, e) => s + e.subtotal, 0);
      const allMissing = usage.every((u) => u.isMissingReading);

      if (allMissing) {
        // 모든 장비 미수집 — 관리자 알림 only
        results.push({ contractNumber: c.contractNumber, status: "no_readings", equipmentCount: usage.length });
        continue;
      }

      const created = await withUniqueRetry(
        () => generateDatedCode({
          prefix: "UC", digits: 3,
          lookupLast: async (full) => {
            const last = await prisma.usageConfirmation.findFirst({ where: { confirmCode: { startsWith: full } }, orderBy: { confirmCode: "desc" }, select: { confirmCode: true } });
            return last?.confirmCode ?? null;
          },
        }).then((confirmCode) => prisma.usageConfirmation.create({
          data: {
            confirmCode,
            contractId: c.id,
            clientId: c.clientId,
            billingMonth,
            periodStart: new Date(`${billingMonth}-01T00:00:00`),
            periodEnd: new Date(new Date(`${billingMonth}-01T00:00:00`).getFullYear(), Number(billingMonth.split("-")[1]), 0, 23, 59, 59, 999),
            equipmentUsage: usage as any,
            totalAmount: totalAmount.toFixed(2),
            status: "COLLECTED",
            companyCode: "TV",
          },
        })),
        { isConflict: () => true },
      );
      results.push({ contractNumber: c.contractNumber, status: "created", confirmCode: created.confirmCode });
    } catch (e: any) {
      results.push({ contractNumber: c.contractNumber, status: "error", error: e?.message });
    }
  }

  return NextResponse.json({ ok: true, billingMonth, processed: results.length, results });
}
