import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";

// 미수금 상태 자동 재평가
// 규칙:
// - 거래처별 미수 중 납기 지난 것 합계
//   - 0 건 → NORMAL
//   - 1건 이상 연체 → WARNING
//   - 30일 이상 연체되었거나 3건 이상 연체 → BLOCKED
// 관리자가 수동으로 NORMAL 해제하려면 Client CRM AR 탭에서 직접 변경 (해당 여부는 여기서 역전환 안 함).

export async function POST() {
  return withSessionContext(async () => {
    const now = new Date();

    // 연체 미수금 집계
    const overdue = await prisma.payableReceivable.findMany({
      where: {
        kind: "RECEIVABLE",
        status: { in: ["OPEN", "PARTIAL"] },
        dueDate: { lt: now },
      },
      select: { clientId: true, dueDate: true },
    });

    const byClient = new Map<string, { count: number; maxDaysLate: number }>();
    for (const r of overdue) {
      if (!r.clientId || !r.dueDate) continue;
      const daysLate = Math.floor((now.getTime() - r.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const cur = byClient.get(r.clientId) ?? { count: 0, maxDaysLate: 0 };
      cur.count += 1;
      cur.maxDaysLate = Math.max(cur.maxDaysLate, daysLate);
      byClient.set(r.clientId, cur);
    }

    const updates: { clientId: string; newStatus: "NORMAL" | "WARNING" | "BLOCKED" }[] = [];
    // 연체 있는 거래처: WARNING 또는 BLOCKED
    for (const [clientId, info] of byClient.entries()) {
      const newStatus = info.maxDaysLate >= 30 || info.count >= 3 ? "BLOCKED" : "WARNING";
      const current = await prisma.client.findUnique({
        where: { id: clientId },
        select: { receivableStatus: true },
      });
      // 악화는 자동, 개선(BLOCKED → WARNING)은 자동, NORMAL 복귀는 수동만.
      if (!current) continue;
      if (current.receivableStatus !== newStatus && current.receivableStatus !== "NORMAL") {
        await prisma.client.update({ where: { id: clientId }, data: { receivableStatus: newStatus } });
        updates.push({ clientId, newStatus });
      } else if (current.receivableStatus === "NORMAL") {
        // NORMAL 상태에서 연체 생기면 WARNING/BLOCKED 로 승격
        await prisma.client.update({ where: { id: clientId }, data: { receivableStatus: newStatus } });
        updates.push({ clientId, newStatus });
      }
    }

    return NextResponse.json({
      scanned: overdue.length,
      affected_clients: byClient.size,
      updated: updates.length,
      note: "연체가 해소된 NORMAL 복귀는 수동 — Client CRM AR 탭에서 직접 변경",
    });
  });
}
