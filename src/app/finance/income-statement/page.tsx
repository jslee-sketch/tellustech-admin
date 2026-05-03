import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { checkFinanceAccess } from "@/lib/rbac";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { IncomeStatementClient } from "./income-client";

export const dynamic = "force-dynamic";

export default async function IncomeStatementPage() {
  const session = await getSession();
  { const r = checkFinanceAccess(session, "manager"); if (!r.ok) redirect(r.redirectTo!); }
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="mb-6 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("nav.incomeStatement", session.language)}</h1>
        <Card>
          <IncomeStatementClient lang={session.language} />
        </Card>
      </div>
    </main>
  );
}
