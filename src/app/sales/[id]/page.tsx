import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { t } from "@/lib/i18n";
import { Badge, Card } from "@/components/ui";
import { SalesDetail } from "./sales-detail";
import { SalesItemsImport } from "./items-import";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function SalesDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const L = session.language;

  const sales = await prisma.sales.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, clientCode: true, companyNameVi: true, paymentTerms: true, receivableStatus: true } },
      project: { select: { id: true, projectCode: true, name: true, salesType: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: { item: { select: { itemCode: true, name: true } } },
      },
      receivables: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!sales) notFound();

  const [projects, employees] = await Promise.all([
    prisma.project.findMany({
      where: companyScope(session),
      orderBy: { projectCode: "asc" },
      select: { id: true, projectCode: true, name: true, salesType: true },
    }),
    prisma.employee.findMany({
      where: { companyCode: session.companyCode, status: "ACTIVE" },
      orderBy: { employeeCode: "asc" },
      select: { id: true, employeeCode: true, nameVi: true },
    }),
  ]);

  const receivable = sales.receivables[0];

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/sales"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            {t("page.sales.back", L)}
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold text-[color:var(--tts-text)]">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{sales.salesNumber}</span>
            {receivable && (
              <Badge
                tone={receivable.status === "PAID" ? "success" : receivable.status === "PARTIAL" ? "accent" : "warn"}
              >
                {receivable.status}
              </Badge>
            )}
          </h1>
          <div className="mt-1 text-[13px] text-[color:var(--tts-sub)]">
            {sales.client.companyNameVi}{" "}
            <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{sales.client.clientCode}</span>
            {sales.client.receivableStatus === "BLOCKED" && (
              <span className="ml-2"><Badge tone="danger">{L === "VI" ? "Khoá khách hàng" : L === "EN" ? "Client Blocked" : "거래처 차단"}</Badge></span>
            )}
          </div>
        </div>
        <Card>
          <SalesDetail
            lang={L}
            salesId={sales.id}
            initial={{
              salesNumber: sales.salesNumber,
              clientLabel: `${sales.client.clientCode} · ${sales.client.companyNameVi}`,
              clientPaymentTerms: sales.client.paymentTerms ?? 30,
              projectId: sales.projectId ?? "",
              salesEmployeeId: sales.salesEmployeeId ?? "",
              usagePeriodStart: sales.usagePeriodStart ? sales.usagePeriodStart.toISOString().slice(0, 10) : "",
              usagePeriodEnd: sales.usagePeriodEnd ? sales.usagePeriodEnd.toISOString().slice(0, 10) : "",
              note: sales.note ?? "",
              totalAmount: sales.totalAmount.toString(),
              createdAt: sales.createdAt.toISOString().slice(0, 10),
            }}
            items={sales.items.map((it) => ({
              id: it.id,
              itemId: it.itemId,
              itemCode: it.item.itemCode,
              itemName: it.item.name,
              serialNumber: it.serialNumber ?? "",
              quantity: it.quantity.toString(),
              unitPrice: it.unitPrice.toString(),
              amount: it.amount.toString(),
              certNumber: it.certNumber,
              certFileId: it.certFileId,
              issuedAt: it.issuedAt ? it.issuedAt.toISOString().slice(0, 10) : null,
              nextDueAt: it.nextDueAt ? it.nextDueAt.toISOString().slice(0, 10) : null,
            }))}
            receivable={
              receivable
                ? {
                    id: receivable.id,
                    status: receivable.status,
                    amount: receivable.amount.toString(),
                    paidAmount: receivable.paidAmount.toString(),
                    dueDate: receivable.dueDate ? receivable.dueDate.toISOString().slice(0, 10) : "",
                  }
                : null
            }
            projects={projects.map((p) => ({ id: p.id, code: p.projectCode, name: p.name, salesType: p.salesType }))}
            employeeOptions={employees.map((e) => ({ value: e.id, label: `${e.employeeCode} · ${e.nameVi}` }))}
          />
        </Card>
        <div className="mt-4">
          <Card title={t("page.sales.import", L)}>
            <SalesItemsImport
              salesId={sales.id}
              isCalibration={sales.project?.salesType === "CALIBRATION"}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}
