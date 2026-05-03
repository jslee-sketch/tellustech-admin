import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { NotifySettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function NotifySettingsPage() {
  const session = await getSession();
  if (session.role === "CLIENT") redirect("/portal");
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-extrabold">{t("notify.personalSettings", session.language)}</h1>
        <Card>
          <NotifySettingsClient lang={session.language} />
        </Card>
      </div>
    </main>
  );
}
