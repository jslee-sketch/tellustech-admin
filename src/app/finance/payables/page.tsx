import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Badge, Card, DataTable, ExcelDownload } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PayablesPage() {
  await getSession();
  const rows = await prisma.payableReceivable.findMany({
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 500,
    include: {
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
          <h1 className="mt-1 text-2xl font-extrabold">재경 · 미수/미지급</h1>
          <div className="mt-2 text-[13px] text-[color:var(--tts-sub)]">
            미해결 합계 <span className="ml-1 font-mono font-bold text-[color:var(--tts-danger)]">{new Intl.NumberFormat("vi-VN").format(totalOutstanding)} VND</span>
          </div>
        </div>
        <div className="mb-3 flex justify-end">
          <ExcelDownload
            rows={data}
            columns={[
              { key: "kind", header: "구분" },
              { key: "status", header: "상태" },
              { key: "ref", header: "전표" },
              { key: "clientLabel", header: "거래처" },
              { key: "amount", header: "금액(VND)" },
              { key: "paidAmount", header: "입금/지급(VND)" },
              { key: "outstanding", header: "잔액(VND)" },
              { key: "dueDate", header: "납기" },
            ]}
            filename={`payables-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
        </div>
        <Card title="미수금/미지급금" count={data.length}>
          <DataTable
            columns={[
              { key: "kind", label: "구분", width: "90px", render: (v, r) => <Link href={`/finance/payables/${r.id}`} className="hover:underline"><Badge tone={v === "RECEIVABLE" ? "success" : "warn"}>{v === "RECEIVABLE" ? "미수" : "미지급"}</Badge></Link> },
              { key: "status", label: "상태", width: "100px", render: (v) => <Badge tone={v === "PAID" ? "success" : v === "PARTIAL" ? "accent" : v === "WRITTEN_OFF" ? "neutral" : "warn"}>{v as string}</Badge> },
              { key: "ref", label: "전표", width: "160px", render: (v, r) => <Link href={`/finance/payables/${r.id}`} className="font-mono text-[11px] text-[color:var(--tts-accent)] hover:underline">{v as string}</Link> },
              { key: "clientLabel", label: "거래처", render: (_, r) => (
                <span>
                  {r.clientLabel}
                  {r.clientBlocked && <span className="ml-2"><Badge tone="danger">차단</Badge></span>}
                </span>
              ) },
              { key: "amount", label: "금액", width: "130px", align: "right", render: (v) => <span className="font-mono text-[12px]">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> },
              { key: "paidAmount", label: "입금/지급", width: "130px", align: "right", render: (v) => <span className="font-mono text-[12px] text-[color:var(--tts-success)]">{new Intl.NumberFormat("vi-VN").format(Number(v))}</span> },
              { key: "outstanding", label: "잔액", width: "130px", align: "right", render: (v) => {
                const n = Number(v);
                return <span className={`font-mono text-[13px] font-bold ${n > 0 ? "text-[color:var(--tts-danger)]" : ""}`}>{new Intl.NumberFormat("vi-VN").format(n)}</span>;
              } },
              { key: "dueDate", label: "납기", width: "110px" },
            ]}
            data={data}
            rowKey={(r) => r.id}
            emptyMessage="미수금/미지급 없음"
          />
        </Card>
      </div>
    </main>
  );
}
