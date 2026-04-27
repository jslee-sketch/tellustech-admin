import "server-only";
import { prisma } from "@/lib/prisma";
import { calcRemainingDays } from "@/lib/days-remaining";

// 포탈 결제 현황 — 6종 서비스 현황판 공통 데이터 소스.
// source of truth: PayableReceivable 테이블만 사용.
// dueDate 와 revisedDueDate 모두 있으면 revisedDueDate 우선 (미수금/미지급금 페이지와 동일 정책).

export type ServiceType = "oa_rental" | "tm_rental" | "repair" | "calibration" | "maintenance" | "purchase";

export type PaymentRow = {
  id: string;
  period: string; // "YYYY-MM" 또는 전표번호
  invoiceCode: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;       // ISO YYYY-MM-DD
  revisedDueDate: string | null;
  effectiveDueDate: string | null; // revisedDueDate ?? dueDate
  paidDate: string | null;
  remainingDays: number | null;
  remainingDaysColor: string;
  remainingDaysLabel: string;
  status: string;
};

export type PaymentSummary = {
  totalUnpaid: number;
  unpaidCount: number;
  overdueCount: number;
  overdueAmount: number;
};

export async function getServicePayments(
  clientId: string,
  serviceType: ServiceType,
): Promise<{ payments: PaymentRow[]; summary: PaymentSummary }> {
  // 매출 ID 후보 수집
  let salesIds: string[] = [];
  if (serviceType === "oa_rental") {
    // OA = Sales.itContractId IS NOT NULL
    const list = await prisma.sales.findMany({
      where: { clientId, itContractId: { not: null }, deletedAt: null },
      select: { id: true },
    });
    salesIds = list.map((s) => s.id);
  } else if (serviceType === "tm_rental") {
    const list = await prisma.sales.findMany({
      where: { clientId, tmRentalId: { not: null }, deletedAt: null },
      select: { id: true },
    });
    salesIds = list.map((s) => s.id);
  } else {
    const typeMap: Record<string, "REPAIR" | "CALIBRATION" | "MAINTENANCE" | "TRADE"> = {
      repair: "REPAIR",
      calibration: "CALIBRATION",
      maintenance: "MAINTENANCE",
      purchase: "TRADE",
    };
    const salesType = typeMap[serviceType];
    const list = await prisma.sales.findMany({
      where: {
        clientId,
        deletedAt: null,
        project: { is: { salesType } },
      },
      select: { id: true },
    });
    salesIds = list.map((s) => s.id);
  }

  if (salesIds.length === 0) {
    return { payments: [], summary: { totalUnpaid: 0, unpaidCount: 0, overdueCount: 0, overdueAmount: 0 } };
  }

  const prList = await prisma.payableReceivable.findMany({
    where: { salesId: { in: salesIds }, kind: "RECEIVABLE", deletedAt: null },
    include: {
      sales: { select: { salesNumber: true, createdAt: true } },
      payments: { orderBy: { paidAt: "desc" }, take: 1, select: { paidAt: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }],
  });

  const payments: PaymentRow[] = prList.map((pr) => {
    const effective = pr.revisedDueDate ?? pr.dueDate;
    const dr = calcRemainingDays(effective, pr.status);
    const paidDate = pr.status === "PAID" && pr.payments[0]?.paidAt ? pr.payments[0].paidAt.toISOString().slice(0, 10) : null;
    const period = pr.sales?.createdAt ? pr.sales.createdAt.toISOString().slice(0, 7) : (pr.dueDate ? pr.dueDate.toISOString().slice(0, 7) : "");
    return {
      id: pr.id,
      period,
      invoiceCode: pr.sales?.salesNumber ?? "—",
      amount: Number(pr.amount),
      paidAmount: Number(pr.paidAmount),
      remainingAmount: Number(pr.amount) - Number(pr.paidAmount),
      dueDate: pr.dueDate ? pr.dueDate.toISOString().slice(0, 10) : null,
      revisedDueDate: pr.revisedDueDate ? pr.revisedDueDate.toISOString().slice(0, 10) : null,
      effectiveDueDate: effective ? effective.toISOString().slice(0, 10) : null,
      paidDate,
      remainingDays: dr.days,
      remainingDaysColor: dr.color,
      remainingDaysLabel: dr.label,
      status: pr.status,
    };
  });

  const summary: PaymentSummary = payments.reduce(
    (acc, p) => {
      if (p.status !== "PAID") {
        acc.totalUnpaid += p.remainingAmount;
        acc.unpaidCount += 1;
        if ((p.remainingDays ?? 0) > 0) {
          acc.overdueCount += 1;
          acc.overdueAmount += p.remainingAmount;
        }
      }
      return acc;
    },
    { totalUnpaid: 0, unpaidCount: 0, overdueCount: 0, overdueAmount: 0 },
  );

  return { payments, summary };
}
