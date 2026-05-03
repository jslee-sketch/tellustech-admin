import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { checkFinanceAccess } from "@/lib/rbac";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { TrialBalanceClient } from "./trial-balance-client";

export const dynamic = "force-dynamic";

export default async function TrialBalancePage() {
  const session = await getSession();
  { const r = checkFinanceAccess(session, "manager"); if (!r.ok) redirect(r.redirectTo!); }
  const L = session.language;
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="mb-6 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("nav.trialBalance", L)}</h1>
        <Card>
          <TrialBalanceClient lang={L} />
        </Card>
      </div>
    </main>
  );
}
