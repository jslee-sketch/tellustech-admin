import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Note } from "@/components/ui";
import { SuppliesRequestForm } from "./supplies-request-form";

export const dynamic = "force-dynamic";

export default async function PortalSuppliesPage() {
  const session = await getSession();
  const L = session.language;
  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
  if (!user?.clientAccount) return <div className="p-8">{t("portal.notLinked", L)}</div>;
  const client = user.clientAccount;
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/portal" className="text-[11px] font-bold text-[color:var(--tts-accent)]">{t("page.portal.back", L)}</Link>
        <h1 className="mt-1 mb-3 text-2xl font-extrabold">{t("page.portal.supplies", L)}</h1>
        {client.receivableStatus === "BLOCKED" ? (
          <Note tone="danger">{t("portal.suppliesBlocked", L)}</Note>
        ) : (
          <SuppliesRequestForm clientId={client.id} lang={L} />
        )}
      </div>
    </main>
  );
}
