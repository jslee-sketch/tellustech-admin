import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { pickName } from "@/lib/i18n";
import { PortalSidebar } from "./portal-sidebar";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let clientName = "";
  if (session.role === "CLIENT") {
    const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
    if (user?.clientAccount) clientName = pickName(user.clientAccount, session.language);
  }
  return (
    <div className="flex min-h-screen">
      <PortalSidebar initialLang={session.language} clientName={clientName} />
      <div className="flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
