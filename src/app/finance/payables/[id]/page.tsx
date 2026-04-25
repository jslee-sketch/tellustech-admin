import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Card, Note } from "@/components/ui";
import { PayableDetailForm } from "./payable-detail-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function PayableDetailPage({ params }: PageProps) {
  const session = await getSession();
  const L = session.language;
  const { id } = await params;
  const pr = await prisma.payableReceivable.findUnique({
    where: { id },
    include: {
      sales: {
        select: { salesNumber: true, client: { select: { clientCode: true, companyNameVi: true } } },
      },
      purchase: {
        select: { purchaseNumber: true, supplier: { select: { clientCode: true, companyNameVi: true } } },
      },
      expense: { select: { expenseCode: true } },
      delayReasons: { orderBy: { recordedAt: "desc" } },
    },
  });
  if (!pr) return notFound();

  const partner =
    pr.sales?.client ?? pr.purchase?.supplier ?? null;
  const refNumber = pr.sales?.salesNumber ?? pr.purchase?.purchaseNumber ?? pr.expense?.expenseCode ?? "—";
  const amount = Number(pr.amount);
  const paid = Number(pr.paidAmount);
  const outstanding = amount - paid;

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/finance/payables" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">{t("page.payables.back", L)}</Link>
        <h1 className="mt-1 mb-3 text-2xl font-extrabold">
          {pr.kind === "RECEIVABLE" ? t("page.payables.AR", L) : t("page.payables.AP", L)} {t("action.detail", L)}
        </h1>

        <Card>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <div className="text-[11px] text-[color:var(--tts-muted)]">전표</div>
              <div className="font-mono font-semibold">{refNumber}</div>
            </div>
            <div>
              <div className="text-[11px] text-[color:var(--tts-muted)]">거래처</div>
              <div>{partner ? `${partner.clientCode} · ${partner.companyNameVi}` : "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-[color:var(--tts-muted)]">상태</div>
              <div>
                <Badge tone={pr.status === "PAID" ? "success" : pr.status === "PARTIAL" ? "accent" : pr.status === "WRITTEN_OFF" ? "neutral" : "warn"}>
                  {pr.status}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[color:var(--tts-muted)]">납기</div>
              <div className="font-mono">{pr.dueDate ? pr.dueDate.toISOString().slice(0, 10) : "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-[color:var(--tts-muted)]">금액</div>
              <div className="font-mono">{new Intl.NumberFormat("vi-VN").format(amount)} VND</div>
            </div>
            <div>
              <div className="text-[11px] text-[color:var(--tts-muted)]">{pr.kind === "RECEIVABLE" ? "입금" : "지급"}</div>
              <div className="font-mono text-[color:var(--tts-success)]">{new Intl.NumberFormat("vi-VN").format(paid)} VND</div>
            </div>
            <div>
              <div className="text-[11px] text-[color:var(--tts-muted)]">잔액</div>
              <div className={`font-mono font-bold ${outstanding > 0 ? "text-[color:var(--tts-danger)]" : ""}`}>
                {new Intl.NumberFormat("vi-VN").format(outstanding)} VND
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-4">
          <PayableDetailForm
            id={pr.id}
            kind={pr.kind}
            amount={amount}
            paidAmount={paid}
            dueDate={pr.dueDate ? pr.dueDate.toISOString().slice(0, 10) : ""}
            delayReasons={pr.delayReasons.map((d) => ({
              id: d.id,
              recordedAt: d.recordedAt.toISOString().slice(0, 16).replace("T", " "),
              contentVi: d.contentVi ?? null,
              contentEn: d.contentEn ?? null,
              contentKo: d.contentKo ?? null,
              originalLang: d.originalLang ?? "VI",
            }))}
            currentLang={session.language}
          />
        </div>

        <div className="mt-4">
          <Note tone="info">
            입금/지급 금액을 수정하면 상태가 자동 전환됩니다. 전액 입금 시 PAID, 일부 입금 시 PARTIAL, 0 시 OPEN.
          </Note>
        </div>
      </div>
    </main>
  );
}
