import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Card, DataTable, ExcelDownload } from "@/components/ui";

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
      sales: { select: { salesNumber: true, client: { select: { clientCode: true, companyNameVi: true, receivableStatus: true } } } },
      purchase: { select: { purchaseNumber: true, supplier: { select: { clientCode: true, companyNameVi: true, receivableStatus: true } } } },
    },
  });
  const data = rows.map((r) => {
    const partner = r.sales?.client ?? r.purchase?.supplier ?? null;
    return {
      id: r.id,
      kind: r.kind,
      status: r.status,
      clientLabel: partner ? `${partner.clientCode} · ${partner.companyNameVi}` : "—",
      clientBlocked: partner?.receivableStatus === "BLOCKED",
      ref: r.sales?.salesNumber ?? r.purchase?.purchaseNumber ?? "—",
      amount: r.amount.toString(),
      paidAmount: r.paidAmount.toString(),
      outstanding: (Number(r.amount) - Number(r.paidAmount)).toFixed(2),
      dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : "—",
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
          <DataTable
            columns={[
              { key: "kind", label: t("col.kind", L), width: "90px", render: (v, r) => <Link href={`/finance/payables/${r.id}`} className="hover:underline"><Badge tone={v === "RECEIVABLE" ? "success" : "warn"}>{v === "RECEIVABLE" ? t("kind.AR", L) : t("kind.AP", L)}</Badge></Link> },
              { key: "status", label: t("col.statusShort", L), width: "100px", render: (v) => <Badge tone={v === "PAID" ? "success" : v === "PARTIAL" ? "accent" : v === "WRITTEN_OFF" ? "neutral" : "warn"}>{v as string}</Badge> },
              { key: "ref", label: t("col.refReceipt", L), width: "160px", render: (v, r) => <Link href={`/finance/payables/${r.id}`} className="font-mono text-[11px] text-[color:var(--tts-accent)] hover:underline">{v as string}</Link> },
              { key: "clientLabel", label: t("col.client", L), render: (_, r) => (
                <span>
                  {r.clientLabel}
                  {r.clientBlocked && <span className="ml-2"><Badge tone="danger">{t("label.AR_blocked", L)}</Badge></span>}
                </span>
              ) },
              { key: "amount", label: t("field.amount", L), width: "130px", align: "right", render: (v) => <span className="font-mono text-[12px]">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> },
              { key: "paidAmount", label: t("col.paidVnd", L), width: "130px", align: "right", render: (v) => <span className="font-mono text-[12px] text-[color:var(--tts-success)]">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> },
              { key: "outstanding", label: t("field.outstanding", L), width: "130px", align: "right", render: (v) => {
                const n = Number(v);
                return <span className={`font-mono text-[13px] font-bold ${n > 0 ? "text-[color:var(--tts-danger)]" : ""}`}>{new Intl.NumberFormat("vi-VN").format(n)}</span>;
              } },
              { key: "dueDate", label: t("col.dueDateShort", L), width: "110px" },
            ]}
            data={data}
            rowKey={(r) => r.id}
            emptyMessage={t("empty.payables", L)}
          />
        </Card>
      </div>
    </main>
  );
}
