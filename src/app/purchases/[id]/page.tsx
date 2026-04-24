import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { Badge, Card } from "@/components/ui";
import { PurchaseDetail } from "./purchase-detail";
import { PurchaseItemsImport } from "./items-import";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function PurchaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, clientCode: true, companyNameVi: true, paymentTerms: true } },
      project: { select: { id: true, projectCode: true, name: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: { item: { select: { itemCode: true, name: true } } },
      },
      payables: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!purchase) notFound();

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

  const payable = purchase.payables[0];

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/purchases"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            ← 매입 목록
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold text-[color:var(--tts-text)]">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{purchase.purchaseNumber}</span>
            {payable && (
              <Badge
                tone={payable.status === "PAID" ? "success" : payable.status === "PARTIAL" ? "accent" : "warn"}
              >
                {payable.status}
              </Badge>
            )}
            <Link
              href={`/inventory/labels?purchaseId=${purchase.id}`}
              className="ml-auto rounded-md bg-[color:var(--tts-accent)] px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90"
            >
              🏷️ QR 라벨 인쇄
            </Link>
          </h1>
          <div className="mt-1 text-[13px] text-[color:var(--tts-sub)]">
            {purchase.supplier.companyNameVi}{" "}
            <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">
              {purchase.supplier.clientCode}
            </span>
          </div>
        </div>
        <Card>
          <PurchaseDetail
            purchaseId={purchase.id}
            initial={{
              purchaseNumber: purchase.purchaseNumber,
              supplierLabel: `${purchase.supplier.clientCode} · ${purchase.supplier.companyNameVi}`,
              supplierPaymentTerms: purchase.supplier.paymentTerms ?? 30,
              projectId: purchase.projectId ?? "",
              salesEmployeeId: purchase.salesEmployeeId ?? "",
              usagePeriodStart: purchase.usagePeriodStart ? purchase.usagePeriodStart.toISOString().slice(0, 10) : "",
              usagePeriodEnd: purchase.usagePeriodEnd ? purchase.usagePeriodEnd.toISOString().slice(0, 10) : "",
              note: purchase.note ?? "",
              totalAmount: purchase.totalAmount.toString(),
              createdAt: purchase.createdAt.toISOString().slice(0, 10),
              warehouseInboundDone: purchase.warehouseInboundDone,
            }}
            items={purchase.items.map((it) => ({
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
            payable={
              payable
                ? {
                    id: payable.id,
                    status: payable.status,
                    amount: payable.amount.toString(),
                    paidAmount: payable.paidAmount.toString(),
                    dueDate: payable.dueDate ? payable.dueDate.toISOString().slice(0, 10) : "",
                  }
                : null
            }
            projects={projects.map((p) => ({ id: p.id, code: p.projectCode, name: p.name, salesType: p.salesType }))}
            employeeOptions={employees.map((e) => ({ value: e.id, label: `${e.employeeCode} · ${e.nameVi}` }))}
          />
        </Card>
        <div className="mt-4">
          <Card title="📥 라인 엑셀 일괄 업로드">
            <PurchaseItemsImport purchaseId={purchase.id} />
          </Card>
        </div>
      </div>
    </main>
  );
}
