import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ensureItDraftSales, ensureTmDraftSales, previousMonthFirstUtc } from "@/lib/rental-mock-sales";

// POST /api/jobs/rental-mock-sales-monthly
// 매월 1일 09:00 KST. 전월 기준 모든 ACTIVE IT 계약 + 진행 중 TM 렌탈에 DRAFT 매출 자동 발행.
// 인증: Bearer CRON_SECRET 또는 ADMIN 세션.

export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  const bearerOk = expected && auth === `Bearer ${expected}`;
  let adminOk = false;
  if (!bearerOk) {
    try { const s = await getSession(); adminOk = s.role === "ADMIN"; } catch { /* ignore */ }
  }
  if (!bearerOk && !adminOk) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const targetParam = url.searchParams.get("targetMonth"); // "YYYY-MM" override
  const sync = url.searchParams.get("sync") === "1";

  let billingMonth: Date;
  if (targetParam && /^\d{4}-\d{2}$/.test(targetParam)) {
    const [y, m] = targetParam.split("-").map(Number);
    billingMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  } else {
    billingMonth = previousMonthFirstUtc();
  }
  const monthEnd = new Date(Date.UTC(billingMonth.getUTCFullYear(), billingMonth.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const label = `${billingMonth.getUTCFullYear()}-${String(billingMonth.getUTCMonth() + 1).padStart(2, "0")}`;

  const runJob = async () => {
    const summary = { itCreated: 0, itSkipped: 0, tmCreated: 0, tmSkipped: 0, errors: 0 };

    // IT 계약: ACTIVE + 기간 겹침 (start ≤ 월말 AND end ≥ 월초)
    const itContracts = await prisma.itContract.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: monthEnd },
        endDate: { gte: billingMonth },
        terminatedAt: null,
      },
      select: { id: true },
    });
    for (const c of itContracts) {
      try {
        const r = await ensureItDraftSales(c.id, billingMonth);
        if (r.created) summary.itCreated++; else summary.itSkipped++;
      } catch (e) {
        summary.errors++;
        console.error("[mock-sales] IT", c.id, e);
      }
    }

    // TM 렌탈: 기간 겹침 (status 컬럼 후속 — 현재 endDate 만으로 판정)
    const tmRentals = await prisma.tmRental.findMany({
      where: {
        startDate: { lte: monthEnd },
        endDate: { gte: billingMonth },
        terminatedAt: null,
      },
      select: { id: true },
    });
    for (const r of tmRentals) {
      try {
        const x = await ensureTmDraftSales(r.id, billingMonth);
        if (x.created) summary.tmCreated++; else summary.tmSkipped++;
      } catch (e) {
        summary.errors++;
        console.error("[mock-sales] TM", r.id, e);
      }
    }

    console.log(`[mock-sales] ${label} ${JSON.stringify(summary)}`);
    return summary;
  };

  if (sync) {
    const summary = await runJob();
    return NextResponse.json({ ok: true, mode: "sync", label, ...summary });
  }
  runJob().catch((e) => console.error("[mock-sales] bg error:", e));
  return NextResponse.json({ ok: true, mode: "async", label, note: "Running in background." }, { status: 202 });
}
