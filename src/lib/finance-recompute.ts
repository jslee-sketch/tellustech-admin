import "server-only";
import { prisma } from "./prisma";

// 미수금 상태 자동 재평가 로직(거래처 단위).
// - 연체 0건 → NORMAL 유지(이미 NORMAL 이면 변경 없음)
// - 연체 1건 이상 → WARNING (또는 30일↑/3건↑ 이면 BLOCKED)
// 호출자: 수동 트리거(/api/finance/recompute-blocking) 또는 일일 cron(/api/_jobs/expiring-alerts).
export async function recomputeReceivableBlocking(): Promise<{
  scanned: number;
  affectedClients: number;
  updated: { clientId: string; newStatus: "NORMAL" | "WARNING" | "BLOCKED" }[];
}> {
  const now = new Date();

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
  for (const [clientId, info] of byClient.entries()) {
    const newStatus: "WARNING" | "BLOCKED" =
      info.maxDaysLate >= 30 || info.count >= 3 ? "BLOCKED" : "WARNING";
    const current = await prisma.client.findUnique({
      where: { id: clientId },
      select: { receivableStatus: true },
    });
    if (!current) continue;
    if (current.receivableStatus !== newStatus) {
      await prisma.client.update({ where: { id: clientId }, data: { receivableStatus: newStatus } });
      updates.push({ clientId, newStatus });
    }
  }

  return {
    scanned: overdue.length,
    affectedClients: byClient.size,
    updated: updates,
  };
}
