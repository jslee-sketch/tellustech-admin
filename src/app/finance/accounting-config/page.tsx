import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { AccountingConfigClient } from "./accounting-config-client";

export const dynamic = "force-dynamic";

export default async function AccountingConfigPage() {
  const session = await getSession();
  if (session.role !== "ADMIN" && session.role !== "MANAGER") redirect("/");
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-xl">
        <h1 className="mb-6 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("nav.accountingConfig", session.language)}</h1>
        <Card>
          <AccountingConfigClient lang={session.language} />
        </Card>
      </div>
    </main>
  );
}
