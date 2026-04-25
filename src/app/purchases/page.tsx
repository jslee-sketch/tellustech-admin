import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { PurchasesClient } from "./purchases-client";

export const dynamic = "force-dynamic";

export default async function PurchasesListPage() {
  const session = await getSession();
  const L = session.language;
  const purchases = await prisma.purchase.findMany({
    orderBy: { purchaseNumber: "desc" },
    take: 500,
    include: {
      supplier: { select: { id: true, clientCode: true, companyNameVi: true } },
      project: { select: { projectCode: true, salesType: true } },
      _count: { select: { items: true } },
      payables: { select: { status: true, dueDate: true } },
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
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.purchases.title", L)}</h1>
        </div>
        <PurchasesClient
          initialData={purchases.map((s) => ({
            id: s.id,
            purchaseNumber: s.purchaseNumber,
            supplierCode: s.supplier.clientCode,
            supplierName: s.supplier.companyNameVi,
            projectCode: s.project?.projectCode ?? null,
            projectType: s.project?.salesType ?? null,
            totalAmount: (Number(s.totalAmount) * Number(s.fxRate)).toFixed(2),
            currency: s.currency,
            fxRate: s.fxRate.toString(),
            itemCount: s._count.items,
            payableStatus: s.payables[0]?.status ?? null,
            dueDate: s.payables[0]?.dueDate ? s.payables[0].dueDate.toISOString().slice(0, 10) : null,
            createdAt: s.createdAt.toISOString().slice(0, 10),
          }))}
        />
      </div>
    </main>
  );
}
