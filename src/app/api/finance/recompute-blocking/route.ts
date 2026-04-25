import { NextResponse } from "next/server";
import { withSessionContext } from "@/lib/session";
import { recomputeReceivableBlocking } from "@/lib/finance-recompute";

// 미수금 상태 자동 재평가 — 수동 트리거. 실제 로직은 lib/finance-recompute.ts.
// 동일 로직이 일일 cron(/api/jobs/expiring-alerts)에서도 호출된다.
export async function POST() {
  return withSessionContext(async () => {
    const result = await recomputeReceivableBlocking();
    return NextResponse.json({
      scanned: result.scanned,
      affected_clients: result.affectedClients,
      updated: result.updated.length,
      note: "연체 해소 → NORMAL 자동 복귀는 수동(Client CRM AR 탭에서 직접 변경)",
    });
  });
}
