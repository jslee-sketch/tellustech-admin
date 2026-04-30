import Link from "next/link";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { CalCertsClient } from "./cal-certs-client";

export const dynamic = "force-dynamic";

export default async function PortalCalCertsPage() {
  const session = await getSession();
  const L = session.language;
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/portal" className="text-[11px] font-bold text-[color:var(--tts-accent)]">{t("portal.cert.back", L)}</Link>
        <h1 className="mt-1 mb-3 text-2xl font-extrabold">{t("portal.cert.pageTitle", L)}</h1>
        <CalCertsClient lang={L} />
      </div>
    </main>
  );
}
