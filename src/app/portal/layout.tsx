import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { pickName, t } from "@/lib/i18n";
import { PortalSidebar } from "./portal-sidebar";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let clientName = "";
  let mustChangePassword = false;
  if (session.role === "CLIENT") {
    const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
    if (user?.clientAccount) clientName = pickName(user.clientAccount, session.language);
    mustChangePassword = user?.mustChangePassword ?? false;
  }
  return (
    <div className="flex min-h-screen">
      <PortalSidebar initialLang={session.language} clientName={clientName} />
      <div className="flex-1 overflow-x-hidden">
        {mustChangePassword && (
          <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[color:var(--tts-danger)] bg-[color:var(--tts-danger-dim)] px-4 py-2 text-[13px] font-bold text-[color:var(--tts-danger)]">
            <span>⚠️ {t("portal.acc.mustChangeBanner", session.language)}</span>
            <Link href="/portal/account" className="rounded bg-[color:var(--tts-danger)] px-3 py-1 text-[12px] text-white">{t("portal.acc.changeBtn", session.language)}</Link>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
