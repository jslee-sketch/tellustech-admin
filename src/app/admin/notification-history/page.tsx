import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { NotificationHistoryClient } from "./history-client";

export const dynamic = "force-dynamic";

export default async function NotificationHistoryPage() {
  const session = await getSession();
  if (session.role !== "ADMIN") redirect("/");
  const deliveries = await prisma.notificationDelivery.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      notification: { select: { eventType: true, titleKo: true, titleVi: true, titleEn: true, linkUrl: true } },
    },
  });
  // 수신자 직원 정보
  const empIds = Array.from(new Set(deliveries.map((d) => d.recipientId)));
  const emps = await prisma.employee.findMany({ where: { id: { in: empIds } }, select: { id: true, employeeCode: true, nameKo: true, nameVi: true } });
  const empMap = new Map(emps.map((e) => [e.id, e]));

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="mb-6 text-2xl font-extrabold">{t("nav.notifyHistory", session.language)}</h1>
        <Card>
          <NotificationHistoryClient
            rows={deliveries.map((d) => ({
              id: d.id,
              createdAt: d.createdAt.toISOString(),
              channel: d.channel as string,
              status: d.status as string,
              recipientCode: empMap.get(d.recipientId)?.employeeCode ?? d.recipientId.slice(0, 6),
              recipientName: empMap.get(d.recipientId)?.nameKo ?? empMap.get(d.recipientId)?.nameVi ?? "—",
              recipientAddress: d.recipientAddress,
              eventType: d.notification.eventType ?? "—",
              title: d.notification.titleKo ?? d.notification.titleVi ?? d.notification.titleEn ?? "",
              errorMessage: d.errorMessage,
              retryCount: d.retryCount,
            }))}
            lang={session.language}
          />
        </Card>
      </div>
    </main>
  );
}
