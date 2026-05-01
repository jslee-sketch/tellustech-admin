import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t, pickName } from "@/lib/i18n";
import { Badge, Card } from "@/components/ui";
import { ConfirmButton } from "./confirm-button";
import { getServicePayments } from "@/lib/portal-payment-status";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "primary" | "warn" | "success" | "accent" | "neutral" | "danger"> = {
  RECEIVED: "warn",
  IN_PROGRESS: "primary",
  DISPATCHED: "primary",
  COMPLETED: "accent",
  CONFIRMED: "success",
  CANCELED: "neutral",
};
const STATUS_LABEL_KEY: Record<string, string> = {
  RECEIVED: "portal.reqStatus.received",
  IN_PROGRESS: "portal.reqStatus.inProgress",
  DISPATCHED: "portal.reqStatus.dispatched",
  COMPLETED: "portal.reqStatus.completed",
  CONFIRMED: "portal.reqStatus.confirmed",
  CANCELED: "portal.reqStatus.canceled",
};

export default async function PortalHome() {
  const session = await getSession();
  const L = session.language;
  if (session.role !== "CLIENT") return <div className="p-8">{t("portal.clientOnly", L)}</div>;
  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
  if (!user?.clientAccount) return <div className="p-8">{t("portal.notLinked", L)}</div>;
  const client = user.clientAccount;

  const [oaContracts, tmRentals, repairs, calibrations, maintenance, purchases, tickets] = await Promise.all([
    prisma.itContract.findMany({ where: { clientId: client.id, deletedAt: null }, select: { id: true, equipment: { where: { removedAt: null }, select: { id: true } } } }),
    prisma.tmRental.findMany({ where: { clientId: client.id, deletedAt: null }, select: { id: true, items: { select: { id: true } } } }),
    prisma.sales.count({ where: { clientId: client.id, deletedAt: null, project: { is: { salesType: "REPAIR" } } } }),
    prisma.sales.count({ where: { clientId: client.id, deletedAt: null, project: { is: { salesType: "CALIBRATION" } } } }),
    prisma.sales.count({ where: { clientId: client.id, deletedAt: null, project: { is: { salesType: "MAINTENANCE" } } } }),
    prisma.sales.count({ where: { clientId: client.id, deletedAt: null, project: { is: { salesType: "TRADE" } } } }),
    prisma.asTicket.findMany({
      where: { clientId: client.id },
      orderBy: { receivedAt: "desc" },
      take: 10,
      select: { id: true, ticketNumber: true, kind: true, status: true, receivedAt: true, symptomKo: true, symptomVi: true, symptomEn: true, suppliesItems: true, serialNumber: true },
    }),
  ]);

  const types = ["oa_rental", "tm_rental", "repair", "calibration", "maintenance", "purchase"] as const;
  const summaries = await Promise.all(types.map((tt) => getServicePayments(client.id, tt)));
  const unpaid = summaries.reduce(
    (acc, s) => ({
      count: acc.count + s.summary.unpaidCount,
      amount: acc.amount + s.summary.totalUnpaid,
      overdueCount: acc.overdueCount + s.summary.overdueCount,
    }),
    { count: 0, amount: 0, overdueCount: 0 },
  );

  const oaEqCount = oaContracts.reduce((n, c) => n + c.equipment.length, 0);
  const tmEqCount = tmRentals.reduce((n, r) => n + r.items.length, 0);
  const blocked = client.receivableStatus === "BLOCKED";

  const cardCls = "rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] px-3 py-2 hover:bg-[color:var(--tts-card-hover)]";

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <div className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)]">{t("portal.title", L)}</div>
          <h1 className="mt-1 text-2xl font-extrabold">
            {pickName(client, L, "companyName")}
            <span className="ml-3 font-mono text-[13px] text-[color:var(--tts-primary)]">{client.clientCode}</span>
            {blocked && <span className="ml-2"><Badge tone="danger">{t("portal.arBlocked", L)}</Badge></span>}
          </h1>
        </div>

        {unpaid.count > 0 && (
          <div className={`mb-4 rounded-md px-4 py-2.5 text-[13px] ${unpaid.overdueCount > 0 ? "bg-[color:var(--tts-danger-dim)] text-[color:var(--tts-danger)]" : "bg-[color:var(--tts-warn-dim)] text-[color:var(--tts-warn)]"}`}>
            ⚠️ {t("portal.status.unpaidAlert", L).replace("{count}", String(unpaid.count)).replace("{amount}", new Intl.NumberFormat("vi-VN").format(unpaid.amount))}
            {unpaid.overdueCount > 0 && <> — {t("portal.status.overdueIncluded", L).replace("{n}", String(unpaid.overdueCount))}</>}
          </div>
        )}

        <h2 className="mb-3 text-[16px] font-extrabold text-[color:var(--tts-text)]">{t("portal.serviceSummary", L)}</h2>
        <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          <Link href="/portal/oa/rentals" className={cardCls}><div className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--tts-accent)]">OA</div><div className="text-[20px] font-extrabold">{oaContracts.length}</div><div className="text-[12px] font-medium text-[color:var(--tts-text)]">{oaEqCount} {t("portal.units", L)}</div></Link>
          <Link href="/portal/tm/rentals" className={cardCls}><div className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--tts-accent)]">TM</div><div className="text-[20px] font-extrabold">{tmRentals.length}</div><div className="text-[12px] font-medium text-[color:var(--tts-text)]">{tmEqCount} {t("portal.units", L)}</div></Link>
          <Link href="/portal/tm/calibrations" className={cardCls}><div className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--tts-accent)]">{t("portal.calibration", L)}</div><div className="text-[20px] font-extrabold">{calibrations}</div></Link>
          <Link href="/portal/tm/repairs" className={cardCls}><div className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--tts-accent)]">{t("portal.repair", L)}</div><div className="text-[20px] font-extrabold">{repairs}</div></Link>
          <Link href="/portal/tm/maintenance" className={cardCls}><div className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--tts-accent)]">{t("portal.maintenance", L)}</div><div className="text-[20px] font-extrabold">{maintenance}</div></Link>
          <Link href="/portal/tm/purchases" className={cardCls}><div className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--tts-accent)]">{t("portal.purchase", L)}</div><div className="text-[20px] font-extrabold">{purchases}</div></Link>
        </div>

        <Card title={t("portal.requestStatus", L)} count={tickets.length}>
          {tickets.length === 0 ? (
            <p className="text-[14px] font-medium text-[color:var(--tts-sub)]">{t("portal.noRequests", L)}</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="border-b border-[color:var(--tts-border)] text-[12px] font-bold text-[color:var(--tts-sub)]">
                <tr>
                  <th className="px-2 py-1 text-left">{t("portal.ticketNumber", L)}</th>
                  <th className="px-2 py-1 text-left">{t("portal.kindShort", L)}</th>
                  <th className="px-2 py-1 text-left">{t("portal.req.summary", L)}</th>
                  <th className="px-2 py-1 text-left">{t("portal.receivedAt", L)}</th>
                  <th className="px-2 py-1 text-left">{t("col.statusShort", L)}</th>
                  <th className="px-2 py-1 text-right" />
                </tr>
              </thead>
              <tbody>
                {tickets.map((tk) => {
                  const symptom = (L === "KO" ? tk.symptomKo : L === "EN" ? tk.symptomEn : tk.symptomVi)
                    ?? tk.symptomVi ?? tk.symptomEn ?? tk.symptomKo ?? "";
                  const suppliesCount = Array.isArray(tk.suppliesItems) ? (tk.suppliesItems as unknown[]).length : 0;
                  const summary = tk.kind === "SUPPLIES_REQUEST"
                    ? `${suppliesCount} ${t("yield.consumableInput", L)}${tk.serialNumber ? ` · ${tk.serialNumber}` : ""}`
                    : symptom.slice(0, 40) + (symptom.length > 40 ? "…" : "");
                  return (
                    <tr key={tk.id} className="border-b border-[color:var(--tts-border)]/50 hover:bg-[color:var(--tts-card-hover)]">
                      <td className="px-2 py-2 font-mono">
                        <Link href={`/portal/requests/${tk.id}`} className="text-[color:var(--tts-primary)] hover:underline">{tk.ticketNumber}</Link>
                      </td>
                      <td className="px-2 py-2">{tk.kind === "SUPPLIES_REQUEST" ? "📦" : "🛠"}</td>
                      <td className="px-2 py-2 text-[12px] text-[color:var(--tts-text)]">
                        <Link href={`/portal/requests/${tk.id}`} className="hover:underline hover:text-[color:var(--tts-primary)]">{summary || "—"}</Link>
                      </td>
                      <td className="px-2 py-2">{tk.receivedAt.toISOString().slice(0, 10)}</td>
                      <td className="px-2 py-2"><Badge tone={STATUS_TONE[tk.status] ?? "neutral"}>{STATUS_LABEL_KEY[tk.status] ? t(STATUS_LABEL_KEY[tk.status], L) : tk.status}</Badge></td>
                      <td className="px-2 py-2 text-right">{tk.status === "COMPLETED" && <ConfirmButton ticketId={tk.id} lang={L} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </main>
  );
}
