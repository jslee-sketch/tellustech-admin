import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { checkFinanceAccess } from "@/lib/rbac";
import { pickName, t } from "@/lib/i18n";
import { SalesConfirmClient } from "./sales-confirm-client";

export const dynamic = "force-dynamic";

export default async function SalesConfirmPage() {
  const s = await getSession();
  { const r = checkFinanceAccess(s, "manager"); if (!r.ok) redirect(r.redirectTo!); }

  const sales = await prisma.sales.findMany({
    where: { isDraft: false, financeConfirmedAt: null },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      client: { select: { clientCode: true, companyNameVi: true, companyNameKo: true } },
      project: { select: { projectCode: true, salesType: true } },
    },
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4">
          <Link href="/sales" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">{t("page.sales.title", s.language)}</Link>
          <h1 className="mt-1 text-2xl font-extrabold">🔵 {t("page.salesConfirm.title", s.language)}</h1>
        </div>
        <SalesConfirmClient
          lang={s.language}
          rows={sales.map((x) => ({
            id: x.id,
            salesNumber: x.salesNumber,
            clientCode: x.client.clientCode,
            clientName: pickName(x.client, s.language, "companyName"),
            projectCode: x.project?.projectCode ?? null,
            totalAmount: (Number(x.totalAmount) * Number(x.fxRate)).toFixed(2),
            billingMonth: x.billingMonth ? x.billingMonth.toISOString().slice(0, 7) : null,
            salesConfirmedAt: x.salesConfirmedAt ? x.salesConfirmedAt.toISOString().slice(0, 10) : null,
          }))}
        />
      </div>
    </main>
  );
}
