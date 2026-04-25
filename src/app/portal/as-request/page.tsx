import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { PortalAsRequestForm } from "./portal-as-request-form";

export const dynamic = "force-dynamic";

export default async function PortalAsRequestPage() {
  const session = await getSession();
  const L = session.language;
  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
  if (!user?.clientAccount) return <div className="p-8">권한 없음</div>;
  const client = user.clientAccount;
  if (client.receivableStatus === "BLOCKED") {
    return (
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-2xl">
          <Link href="/portal" className="text-[11px] font-bold text-[color:var(--tts-accent)]">{t("page.portal.back", L)}</Link>
          <h1 className="mt-1 mb-3 text-2xl font-extrabold">{t("page.portal.asRequest", L)}</h1>
          <div className="rounded-md bg-[color:var(--tts-danger-dim)] p-4 text-[color:var(--tts-danger)]">
            미수금 차단 상태입니다. 재경팀 확인 후 접수 가능합니다.
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/portal" className="text-[11px] font-bold text-[color:var(--tts-accent)]">{t("page.portal.back", L)}</Link>
        <h1 className="mt-1 mb-3 text-2xl font-extrabold">{t("page.portal.asRequest", L)}</h1>
        <Card>
          <PortalAsRequestForm lang={L} clientId={client.id} defaultLang={session.language} />
        </Card>
      </div>
    </main>
  );
}
