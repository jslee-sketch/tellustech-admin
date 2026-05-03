import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { NotificationRulesClient } from "./rules-client";

export const dynamic = "force-dynamic";

export default async function NotificationRulesPage() {
  const session = await getSession();
  if (session.role !== "ADMIN") redirect("/");
  const rules = await prisma.notificationRule.findMany({ orderBy: { eventType: "asc" } });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="mb-6 text-2xl font-extrabold">{t("nav.notifyRules", session.language)}</h1>
        <Card>
          <NotificationRulesClient rules={rules.map((r) => ({
            id: r.id, eventType: r.eventType as string, targetType: r.targetType as string,
            targetRoleId: r.targetRoleId, channelEmail: r.channelEmail, channelZalo: r.channelZalo, channelChat: r.channelChat,
            isActive: r.isActive, companyCode: r.companyCode as string,
            templateKo: r.templateKo, templateVi: r.templateVi, templateEn: r.templateEn,
          }))} lang={session.language} />
        </Card>
      </div>
    </main>
  );
}
