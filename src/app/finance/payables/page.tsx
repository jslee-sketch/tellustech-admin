import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card, ExcelDownload } from "@/components/ui";
import { PayablesListClient } from "./payables-list-client";

export const dynamic = "force-dynamic";

export default async function PayablesPage() {
  const session = await getSession();
  const L = session.language;
  const rows = await prisma.payableReceivable.findMany({
    orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }],
    take: 500,
    select: {
      id: true,
      kind: true,
      status: true,
      amount: true,
      paidAmount: true,
      dueDate: true,
      revisedDueDate: true,
      createdAt: true,
      sales: { select: { salesNumber: true, client: { select: { id: true, clientCode: true, companyNameVi: true, receivableStatus: true } } } },
      purchase: { select: { purchaseNumber: true, supplier: { select: { id: true, clientCode: true, companyNameVi: true, receivableStatus: true } } } },
    },
  });
  const data = rows.map((r) => {
    const partner = r.sales?.client ?? r.purchase?.supplier ?? null;
    const revised = r.revisedDueDate ?? r.dueDate;
    return {
      id: r.id,
      kind: r.kind,
      status: r.status,
      clientId: partner?.id ?? null,
      clientLabel: partner ? `${partner.clientCode} · ${partner.companyNameVi}` : "—",
      clientBlocked: partner?.receivableStatus === "BLOCKED",
      ref: r.sales?.salesNumber ?? r.purchase?.purchaseNumber ?? "—",
      amount: r.amount.toString(),
      paidAmount: r.paidAmount.toString(),
      outstanding: (Number(r.amount) - Number(r.paidAmount)).toFixed(2),
      dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
      revisedDueDate: revised ? revised.toISOString().slice(0, 10) : null,
      createdAt: r.createdAt.toISOString().slice(0, 10),
    };
  });
  const totalOutstanding = data.reduce((s, d) => s + Number(d.outstanding), 0);

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
          <h1 className="mt-1 text-2xl font-extrabold">{t("page.payables.title", L)}</h1>
          <div className="mt-2 text-[13px] text-[color:var(--tts-sub)]">
            {t("page.payables.outstandingTotal", L)} <span className="ml-1 font-mono font-bold text-[color:var(--tts-danger)]">{new Intl.NumberFormat("vi-VN").format(totalOutstanding)} VND</span>
          </div>
        </div>
        <div className="mb-3 flex justify-end">
          <ExcelDownload
            rows={data}
            columns={[
              { key: "kind", header: t("col.kind", L) },
              { key: "status", header: t("col.statusShort", L) },
              { key: "ref", header: t("col.refReceipt", L) },
              { key: "clientLabel", header: t("col.client", L) },
              { key: "amount", header: t("col.amountVndCol", L) },
              { key: "paidAmount", header: t("col.paidVnd", L) },
              { key: "outstanding", header: t("col.outstanding", L) },
              { key: "dueDate", header: t("col.dueDateShort", L) },
            ]}
            filename={`payables-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
        </div>
        <Card title={t("title.payables", L)} count={data.length}>
          <PayablesListClient initialRows={data} lang={L} />
        </Card>
      </div>
    </main>
  );
}
