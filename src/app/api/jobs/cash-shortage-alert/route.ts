import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 매일 06:00 KST — 각 계좌 잔고 + 향후 14일 예정 입출금 → 임계값 미달 시 ADMIN 알림.
// Bearer CRON_SECRET 으로 보호.
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const cutoff14 = new Date(now.getTime() + 14 * 86400000);

  const accounts = await prisma.bankAccount.findMany({
    where: { isActive: true, lowBalanceThreshold: { not: null } },
  });
  const alerts: Array<{ accountCode: string; currentBalance: number; expectedBalance14: number; threshold: number }> = [];

  for (const acc of accounts) {
    const cur = Number(acc.currentBalance ?? 0);
    // 계좌별 향후 14일 예정 입출금 — PR 만 (CashTransaction 미래분은 거의 없음)
    // RECEIVABLE: clientId 통한 입금 — 계좌 매핑은 없으므로 전체 합산 후 동등 분배(간소화)
    const [futureIn, futureOut] = await Promise.all([
      prisma.payableReceivable.findMany({
        where: { kind: "RECEIVABLE", status: { in: ["OPEN", "PARTIAL"] }, dueDate: { lte: cutoff14 }, companyCode: acc.companyCode },
        select: { amount: true, paidAmount: true },
      }),
      prisma.payableReceivable.findMany({
        where: { kind: "PAYABLE", status: { in: ["OPEN", "PARTIAL"] }, dueDate: { lte: cutoff14 }, companyCode: acc.companyCode },
        select: { amount: true, paidAmount: true },
      }),
    ]);
    const expIn = futureIn.reduce((s, r) => s + (Number(r.amount) - Number(r.paidAmount)), 0);
    const expOut = futureOut.reduce((s, r) => s + (Number(r.amount) - Number(r.paidAmount)), 0);
    // 단순 가정: 모든 계좌가 동등 부담 (n계좌 → 1/n 분배)
    const accountsInCompany = accounts.filter((a) => a.companyCode === acc.companyCode).length || 1;
    const expectedBalance14 = cur + expIn / accountsInCompany - expOut / accountsInCompany;
    const threshold = Number(acc.lowBalanceThreshold);
    if (expectedBalance14 < threshold) {
      alerts.push({
        accountCode: acc.accountCode,
        currentBalance: cur,
        expectedBalance14,
        threshold,
      });
      // ADMIN 알림 — 단순화 (Notification 테이블 사용; type 은 OTHER 로 fallback)
      // ADMIN 사용자 모두에게 알림 — companyCode 일치 + role=ADMIN
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true, allowedCompanies: true },
      });
      const targetUserIds = admins
        .filter((u) => Array.isArray(u.allowedCompanies) && u.allowedCompanies.includes(acc.companyCode))
        .map((u) => u.id);
      const titleKo = `자금 부족 예상 — ${acc.accountCode}`;
      const titleVi = `Cảnh báo thiếu tiền — ${acc.accountCode}`;
      const titleEn = `Cash shortage alert — ${acc.accountCode}`;
      const bodyKo = `현재 잔고 ${cur.toFixed(0)} → 14일 후 예상 ${expectedBalance14.toFixed(0)} (임계값 ${threshold.toFixed(0)})`;
      const bodyVi = `Số dư hiện tại ${cur.toFixed(0)} → dự kiến sau 14 ngày ${expectedBalance14.toFixed(0)} (ngưỡng ${threshold.toFixed(0)})`;
      const bodyEn = `Current balance ${cur.toFixed(0)} → expected after 14 days ${expectedBalance14.toFixed(0)} (threshold ${threshold.toFixed(0)})`;
      for (const uid of targetUserIds) {
        try {
          await prisma.notification.create({
            data: {
              companyCode: acc.companyCode,
              userId: uid,
              type: "CASH_SHORTAGE_ALERT",
              titleKo, titleVi, titleEn,
              bodyKo, bodyVi, bodyEn,
              linkUrl: "/finance/cash-dashboard",
            },
          });
        } catch { /* per-user failure must not break loop */ }
      }
    }
  }

  return NextResponse.json({ ok: true, alerts });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "jobs/cash-shortage-alert" });
}
