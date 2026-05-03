import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { ok } from "@/lib/api-utils";

// 자금 현황판 — 계좌별 잔고 + 향후 7/14/30일 예정 입출금 + TOP10 미수/미지급 + 월별 추이.
export async function GET() {
  return withSessionContext(async () => {
    const now = new Date();
    const accounts = await prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { accountCode: "asc" },
      select: { id: true, accountCode: true, accountName: true, bankName: true, currency: true, currentBalance: true, lowBalanceThreshold: true },
    });
    const totalBalanceLocal = accounts.reduce((s, a) => s + Number(a.currentBalance ?? 0), 0);

    // 미수금/미지급 — 미정산 + dueDate 기준 정렬
    const [openReceivables, openPayables] = await Promise.all([
      prisma.payableReceivable.findMany({
        where: { kind: "RECEIVABLE", status: { in: ["OPEN", "PARTIAL"] } },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      prisma.payableReceivable.findMany({
        where: { kind: "PAYABLE", status: { in: ["OPEN", "PARTIAL"] } },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
    ]);

    const allClientIds = Array.from(new Set([...openReceivables, ...openPayables].map((r) => r.clientId).filter(Boolean) as string[]));
    const clients = allClientIds.length > 0 ? await prisma.client.findMany({
      where: { id: { in: allClientIds } },
      select: { id: true, clientCode: true, companyNameVi: true, companyNameKo: true },
    }) : [];
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    function daysFromNow(d: Date | null): number | null {
      if (!d) return null;
      return Math.ceil((d.getTime() - now.getTime()) / 86400000);
    }
    function expectedSum(rows: typeof openReceivables, days: number): number {
      const cutoff = new Date(now.getTime() + days * 86400000);
      return rows.filter((r) => r.dueDate && r.dueDate <= cutoff).reduce((s, r) => s + (Number(r.amount) - Number(r.paidAmount)), 0);
    }

    // 월별 추이 (지난 6개월)
    const last6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }).reverse();

    const snapshots = await prisma.bankAccountMonthlySnapshot.findMany({
      where: { yearMonth: { in: last6 } },
      orderBy: { yearMonth: "asc" },
    });
    const monthlyTrend = last6.map((ym) => {
      const rows = snapshots.filter((s) => s.yearMonth === ym);
      return {
        month: ym,
        totalIn: rows.reduce((s, r) => s + Number(r.totalIn), 0),
        totalOut: rows.reduce((s, r) => s + Number(r.totalOut), 0),
        netFlow: rows.reduce((s, r) => s + Number(r.totalIn) - Number(r.totalOut), 0),
      };
    });

    return ok({
      accounts,
      totalBalanceLocal,
      forecast: {
        next7days: { expectedIn: expectedSum(openReceivables, 7), expectedOut: expectedSum(openPayables, 7) },
        next14days: { expectedIn: expectedSum(openReceivables, 14), expectedOut: expectedSum(openPayables, 14) },
        next30days: { expectedIn: expectedSum(openReceivables, 30), expectedOut: expectedSum(openPayables, 30) },
      },
      topReceivables: openReceivables.map((r) => ({
        id: r.id,
        clientLabel: r.clientId ? (() => { const c = clientMap.get(r.clientId!); return c ? `${c.clientCode} · ${c.companyNameKo ?? c.companyNameVi}` : null; })() : null,
        amount: Number(r.amount) - Number(r.paidAmount),
        dueDate: r.dueDate,
        daysRemaining: daysFromNow(r.dueDate),
        status: r.status,
      })),
      topPayables: openPayables.map((r) => ({
        id: r.id,
        clientLabel: r.clientId ? (() => { const c = clientMap.get(r.clientId!); return c ? `${c.clientCode} · ${c.companyNameKo ?? c.companyNameVi}` : null; })() : null,
        amount: Number(r.amount) - Number(r.paidAmount),
        dueDate: r.dueDate,
        daysRemaining: daysFromNow(r.dueDate),
        status: r.status,
      })),
      monthlyTrend,
    });
  });
}
