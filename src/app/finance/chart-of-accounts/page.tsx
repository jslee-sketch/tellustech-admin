import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { checkFinanceAccess } from "@/lib/rbac";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { ChartOfAccountsClient } from "./chart-client";

export const dynamic = "force-dynamic";

export default async function ChartOfAccountsPage() {
  const session = await getSession();
  { const r = checkFinanceAccess(session, "manager"); if (!r.ok) redirect(r.redirectTo!); }
  const L = session.language;
  const accounts = await prisma.chartOfAccount.findMany({ orderBy: { code: "asc" } });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="mb-6 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("nav.chartOfAccounts", L)}</h1>
        <Card>
          <ChartOfAccountsClient
            accounts={accounts.map((a) => ({
              id: a.id,
              code: a.code,
              nameVi: a.nameVi, nameEn: a.nameEn, nameKo: a.nameKo,
              type: a.type as string,
              parentCode: a.parentCode,
              level: a.level,
              isLeaf: a.isLeaf,
              isActive: a.isActive,
            }))}
            lang={L}
          />
        </Card>
      </div>
    </main>
  );
}
