import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { checkFinanceAccess } from "@/lib/rbac";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { AccountMappingsClient } from "./mappings-client";

export const dynamic = "force-dynamic";

export default async function AccountMappingsPage() {
  const session = await getSession();
  { const r = checkFinanceAccess(session, "manager"); if (!r.ok) redirect(r.redirectTo!); }
  const L = session.language;
  const [mappings, accounts] = await Promise.all([
    prisma.accountMapping.findMany({
      orderBy: { trigger: "asc" },
      include: { account: { select: { code: true, nameVi: true, nameEn: true, nameKo: true, type: true } } },
    }),
    prisma.chartOfAccount.findMany({ where: { isLeaf: true, isActive: true }, orderBy: { code: "asc" } }),
  ]);
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="mb-6 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("nav.accountMappings", L)}</h1>
        <Card>
          <AccountMappingsClient
            mappings={mappings.map((m) => ({
              id: m.id,
              trigger: m.trigger as string,
              accountCode: m.accountCode,
              accountName: L === "VI" ? m.account.nameVi : L === "EN" ? m.account.nameEn : m.account.nameKo,
              isActive: m.isActive,
              description: m.description,
            }))}
            accounts={accounts.map((a) => ({
              code: a.code,
              name: L === "VI" ? a.nameVi : L === "EN" ? a.nameEn : a.nameKo,
              type: a.type as string,
            }))}
            lang={L}
          />
        </Card>
      </div>
    </main>
  );
}
