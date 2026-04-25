import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Badge, Card } from "@/components/ui";
import LogoutButton from "../logout-button";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const session = await getSession();
  const L = session.language;
  if (session.role !== "CLIENT") {
    return <div className="p-8">{t("portal.clientOnly", L)}</div>;
  }

  // session.sub = user.id, clientId 찾기
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { clientAccount: true },
  });
  if (!user?.clientAccount) {
    return <div className="p-8">{t("portal.notLinked", L)}</div>;
  }
  const client = user.clientAccount;

  const [contracts, tickets, calibCerts] = await Promise.all([
    prisma.itContract.findMany({
      where: { clientId: client.id },
      orderBy: { contractNumber: "desc" },
      take: 10,
      include: { _count: { select: { equipment: true } } },
    }),
    prisma.asTicket.findMany({
      where: { clientId: client.id },
      orderBy: { receivedAt: "desc" },
      take: 10,
    }),
    prisma.salesItem.findMany({
      where: {
        sales: { clientId: client.id, project: { salesType: "CALIBRATION" } },
        OR: [{ certNumber: { not: null } }, { certFileId: { not: null } }],
      },
      orderBy: { issuedAt: "desc" },
      take: 20,
      select: {
        id: true,
        certNumber: true,
        certFileId: true,
        issuedAt: true,
        nextDueAt: true,
        item: { select: { name: true } },
      },
    }),
  ]);

  const blocked = client.receivableStatus === "BLOCKED";

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)]">{t("portal.title", L)}</div>
            <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
              {client.companyNameVi}
              <span className="ml-3 font-mono text-[13px] text-[color:var(--tts-primary)]">{client.clientCode}</span>
              {blocked && <span className="ml-2"><Badge tone="danger">{t("portal.arBlocked", L)}</Badge></span>}
            </h1>
          </div>
          <LogoutButton />
        </div>

        {blocked && (
          <div className="mb-4 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[13px] text-[color:var(--tts-danger)]">
            {t("portal.arBlockedDesc", L)}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title={t("portal.quickActions", L)}>
            <ul className="space-y-2 text-[14px]">
              <li>
                <Link
                  href="/portal/as-request"
                  className={blocked ? "text-[color:var(--tts-muted)] line-through" : "text-[color:var(--tts-primary)] hover:underline"}
                >
                  {t("portal.asRequest", L)}
                </Link>
              </li>
              <li>
                <Link
                  href="/portal/supplies-request"
                  className={blocked ? "text-[color:var(--tts-muted)] line-through" : "text-[color:var(--tts-primary)] hover:underline"}
                >
                  {t("portal.suppliesRequest", L)}
                </Link>
              </li>
              <li>
                <Link href="/portal/usage-confirm" className="text-[color:var(--tts-primary)] hover:underline">
                  {t("portal.usageConfirm", L)}
                </Link>
              </li>
            </ul>
          </Card>

          <Card title={t("portal.myItContracts", L)} count={contracts.length}>
            {contracts.length === 0 ? (
              <p className="text-[13px] text-[color:var(--tts-muted)]">{t("portal.noContracts", L)}</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {contracts.map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <span className="font-mono text-[color:var(--tts-primary)]">{c.contractNumber}</span>
                    <span className="text-[color:var(--tts-muted)]">
                      {c.status} · {c._count.equipment} {t("portal.equipUnit", L)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("portal.recentAs", L)} count={tickets.length}>
            {tickets.length === 0 ? (
              <p className="text-[13px] text-[color:var(--tts-muted)]">{t("portal.noAs", L)}</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {tickets.map((tk) => (
                  <li key={tk.id} className="flex justify-between">
                    <span className="font-mono">{tk.ticketNumber}</span>
                    <Badge
                      tone={
                        tk.status === "COMPLETED"
                          ? "success"
                          : tk.status === "CANCELED"
                          ? "neutral"
                          : tk.status === "DISPATCHED"
                          ? "accent"
                          : "primary"
                      }
                    >
                      {tk.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("portal.calCerts", L)} count={calibCerts.length}>
            {calibCerts.length === 0 ? (
              <p className="text-[13px] text-[color:var(--tts-muted)]">{t("portal.noCerts", L)}</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {calibCerts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span className="font-mono">{c.certNumber ?? c.item.name}</span>
                    {c.certFileId && (
                      <Link href={`/api/files/${c.certFileId}`} className="text-[color:var(--tts-primary)] hover:underline">
                        {t("portal.download", L)}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
