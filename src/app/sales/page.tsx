import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { SalesClient } from "./sales-client";

export const dynamic = "force-dynamic";

export default async function SalesListPage() {
  const session = await getSession();
  const L = session.language;
  const sales = await prisma.sales.findMany({
    orderBy: { salesNumber: "desc" },
    take: 500,
    include: {
      client: { select: { id: true, clientCode: true, companyNameVi: true } },
      project: { select: { projectCode: true, salesType: true } },
      _count: { select: { items: true } },
      receivables: { select: { status: true, dueDate: true } },
    },
  });

  // 거래처별 최저 적정율 (가장 우려되는 장비 기준) — RENTAL 매출에만 표시.
  const clientIds = Array.from(new Set(sales.map((s) => s.clientId)));
  const yieldByClient = new Map<string, { rateBw: number | null; rateColor: number | null; isFraud: boolean }>();
  if (clientIds.length > 0) {
    const eqs = await prisma.itContractEquipment.findMany({
      where: {
        removedAt: null,
        itContract: { clientId: { in: clientIds } },
        lastYieldRateBw: { not: null },
      },
      select: {
        itContract: { select: { clientId: true } },
        lastYieldRateBw: true,
        lastYieldRateColor: true,
      },
    });
    for (const e of eqs) {
      const cId = e.itContract.clientId;
      const cur = yieldByClient.get(cId) ?? { rateBw: null, rateColor: null, isFraud: false };
      const bw = e.lastYieldRateBw ? Number(e.lastYieldRateBw) : null;
      const col = e.lastYieldRateColor ? Number(e.lastYieldRateColor) : null;
      if (bw !== null && (cur.rateBw === null || bw < cur.rateBw)) cur.rateBw = bw;
      if (col !== null && (cur.rateColor === null || col < cur.rateColor)) cur.rateColor = col;
      if ((bw !== null && bw < 30) || (col !== null && col < 30)) cur.isFraud = true;
      yieldByClient.set(cId, cur);
    }
  }

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            TELLUSTECH ERP
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.sales.title", L)}</h1>
        </div>
        <SalesClient
          lang={L}
          initialData={sales.map((s) => {
            const yieldRow = yieldByClient.get(s.clientId);
            // RENTAL 식별: 명시적 RENTAL 프로젝트 or IT/TM 계약 직접 연결.
            const isRental = s.project?.salesType === "RENTAL" || !!s.itContractId || !!s.tmRentalId;
            return {
              id: s.id,
              salesNumber: s.salesNumber,
              clientCode: s.client.clientCode,
              clientName: s.client.companyNameVi,
              projectCode: s.project?.projectCode ?? null,
              projectType: s.project?.salesType ?? null,
              // 리스트는 VND 환산값으로 집계 — 외화 거래도 fxRate 적용
              totalAmount: (Number(s.totalAmount) * Number(s.fxRate)).toFixed(2),
              currency: s.currency,
              fxRate: s.fxRate.toString(),
              itemCount: s._count.items,
              receivableStatus: s.receivables[0]?.status ?? null,
              dueDate: s.receivables[0]?.dueDate ? s.receivables[0].dueDate.toISOString().slice(0, 10) : null,
              createdAt: s.createdAt.toISOString().slice(0, 10),
              yieldRateBw: isRental && yieldRow?.rateBw !== null && yieldRow?.rateBw !== undefined ? yieldRow.rateBw : null,
              yieldRateColor: isRental && yieldRow?.rateColor !== null && yieldRow?.rateColor !== undefined ? yieldRow.rateColor : null,
              yieldIsFraud: isRental ? (yieldRow?.isFraud ?? false) : false,
            };
          })}
        />
      </div>
    </main>
  );
}
