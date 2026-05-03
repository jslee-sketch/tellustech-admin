import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { ProfitabilityClient } from "./profitability-client";

export const dynamic = "force-dynamic";

export default async function ProfitabilityPage() {
  const session = await getSession();
  const L = session.language;
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="mb-6 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("nav.profitability", L)}</h1>
        <Card>
          <ProfitabilityClient lang={L} />
        </Card>
      </div>
    </main>
  );
}
