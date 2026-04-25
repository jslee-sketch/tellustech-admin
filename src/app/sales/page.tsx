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
          initialData={sales.map((s) => ({
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
          }))}
        />
      </div>
    </main>
  );
}
