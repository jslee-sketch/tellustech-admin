import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { NotificationsClient } from "./notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSession();
  if (session.role === "CLIENT") redirect("/portal");
  const notifications = await prisma.notification.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-extrabold">{t("notify.myList", session.language)}</h1>
        <Card>
          <NotificationsClient
            rows={notifications.map((n) => ({
              id: n.id,
              title: n.titleKo ?? n.titleVi ?? n.titleEn ?? "",
              body: n.bodyKo ?? n.bodyVi ?? n.bodyEn ?? "",
              eventType: (n.eventType as string) ?? null,
              linkUrl: n.linkUrl,
              createdAt: n.createdAt.toISOString(),
              readAt: n.readAt?.toISOString() ?? null,
            }))}
            lang={session.language}
          />
        </Card>
      </div>
    </main>
  );
}
