import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t, type Lang, pickName } from "@/lib/i18n";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "warn" | "primary" | "accent" | "success" | "neutral" | "danger"> = {
  RECEIVED: "warn", IN_PROGRESS: "primary", COMPLETED: "success", CANCELED: "neutral",
};

function pickSymptom(t: { symptomKo: string | null; symptomEn: string | null; symptomVi: string | null }, lang: Lang): string {
  if (lang === "KO") return t.symptomKo ?? t.symptomVi ?? t.symptomEn ?? "";
  if (lang === "EN") return t.symptomEn ?? t.symptomVi ?? t.symptomKo ?? "";
  return t.symptomVi ?? t.symptomEn ?? t.symptomKo ?? "";
}

type SuppliesLine = { itemId?: string; quantity?: number; note?: string };

export default async function PortalRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (session.role !== "CLIENT") notFound();
  const L = session.language;

  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
  if (!user?.clientAccount) notFound();

  const ticket = await prisma.asTicket.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { employeeCode: true, nameVi: true, nameKo: true, nameEn: true } },
    },
  });
  if (!ticket || ticket.clientId !== user.clientAccount.id) notFound();

  // 출동 정보 (없을 수도 있음)
  const dispatches = await prisma.asDispatch.findMany({
    where: { asTicketId: id },
    orderBy: { createdAt: "asc" },
    include: {
      dispatchEmployee: { select: { employeeCode: true, nameVi: true, nameKo: true, nameEn: true } },
      parts: { include: { item: { select: { itemCode: true, name: true } } } },
    },
  });

  // 소모품 요청이면 suppliesItems(JSON) 풀어서 item 정보 join
  let suppliesLines: Array<{ itemCode: string; itemName: string; quantity: number; note?: string }> = [];
  if (ticket.kind === "SUPPLIES_REQUEST" && Array.isArray(ticket.suppliesItems)) {
    const lines = (ticket.suppliesItems as unknown as SuppliesLine[]) ?? [];
    const ids = lines.map((l) => l.itemId).filter((x): x is string => !!x);
    const items = ids.length > 0 ? await prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, name: true } }) : [];
    const map = new Map(items.map((i) => [i.id, i]));
    suppliesLines = lines.map((l) => {
      const it = map.get(l.itemId ?? "");
      return { itemCode: it?.itemCode ?? "—", itemName: it?.name ?? "—", quantity: l.quantity ?? 1, note: l.note };
    });
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3">
          <Link href="/portal" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">{t("page.portal.back", L)}</Link>
        </div>
        <h1 className="mb-2 text-2xl font-extrabold">
          {ticket.kind === "SUPPLIES_REQUEST" ? "📦" : "🛠️"} {ticket.kind === "SUPPLIES_REQUEST" ? t("portal.req.kindSupplies", L) : t("portal.req.kindAs", L)}
          <span className="ml-3 font-mono text-[14px] text-[color:var(--tts-primary)]">{ticket.ticketNumber}</span>
        </h1>

        <Card>
          {/* 요약 */}
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div><div className="text-[10px] font-bold text-[color:var(--tts-muted)]">{t("portal.req.received", L)}</div><div>{ticket.receivedAt.toISOString().slice(0, 10)}</div></div>
            <div><div className="text-[10px] font-bold text-[color:var(--tts-muted)]">{t("col.statusShort", L)}</div><div><Badge tone={STATUS_TONE[ticket.status] ?? "neutral"}>{ticket.status}</Badge></div></div>
            <div><div className="text-[10px] font-bold text-[color:var(--tts-muted)]">{t("portal.req.assigned", L)}</div><div>{ticket.assignedTo ? pickName(ticket.assignedTo as any, L, "name") : "—"}</div></div>
            <div><div className="text-[10px] font-bold text-[color:var(--tts-muted)]">{t("portal.req.completed", L)}</div><div>{ticket.completedAt ? ticket.completedAt.toISOString().slice(0, 10) : "—"}</div></div>
            {ticket.serialNumber && (
              <div className="col-span-2"><div className="text-[10px] font-bold text-[color:var(--tts-muted)]">{t("portal.req.targetSn", L)}</div><div className="font-mono">{ticket.serialNumber}</div></div>
            )}
          </div>

          {/* 증상 (AS_REQUEST) */}
          {ticket.kind === "AS_REQUEST" && (
            <div className="mt-4">
              <div className="mb-1 text-[12px] font-bold">{t("portal.req.symptom", L)}</div>
              <div className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] px-3 py-2 text-[13px] whitespace-pre-wrap">
                {pickSymptom(ticket, L) || "—"}
              </div>
            </div>
          )}

          {/* 요청 품목 (SUPPLIES_REQUEST) */}
          {ticket.kind === "SUPPLIES_REQUEST" && suppliesLines.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-[12px] font-bold">{t("portal.req.requestedItems", L)} ({suppliesLines.length})</div>
              <table className="w-full text-[12px]">
                <thead className="border-b border-[color:var(--tts-border)] text-[10px] text-[color:var(--tts-muted)]">
                  <tr>
                    <th className="px-2 py-1 text-left">{t("col.itemCode", L)}</th>
                    <th className="px-2 py-1 text-left">{t("col.itemNameCol", L)}</th>
                    <th className="px-2 py-1 text-right">{t("yield.consumableInput", L)}</th>
                    <th className="px-2 py-1 text-left">{t("portal.req.note", L)}</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliesLines.map((l, i) => (
                    <tr key={i} className="border-b border-[color:var(--tts-border)]/50">
                      <td className="px-2 py-1.5 font-mono text-[11px]">{l.itemCode}</td>
                      <td className="px-2 py-1.5">{l.itemName}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{l.quantity}</td>
                      <td className="px-2 py-1.5 text-[11px] text-[color:var(--tts-muted)]">{l.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* 진행 단계 타임라인 */}
        <Card className="mt-3" title={t("portal.req.progress", L)}>
          <ol className="relative border-l border-[color:var(--tts-border)] pl-4">
            <li className="mb-3">
              <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-[color:var(--tts-success)]" />
              <div className="text-[12px] font-bold">📥 {t("portal.req.stepReceived", L)}</div>
              <div className="text-[11px] text-[color:var(--tts-muted)]">{ticket.receivedAt.toISOString().replace("T", " ").slice(0, 16)}</div>
            </li>
            {dispatches.map((d, i) => (
              <li key={d.id} className="mb-3">
                <span className={`absolute -left-1.5 h-3 w-3 rounded-full ${d.completedAt ? "bg-[color:var(--tts-success)]" : "bg-[color:var(--tts-primary)]"}`} />
                <div className="text-[12px] font-bold">🚚 {t("portal.req.stepDispatch", L)} #{i + 1}</div>
                <div className="text-[11px] text-[color:var(--tts-muted)]">
                  {d.dispatchEmployee ? pickName(d.dispatchEmployee as any, L, "name") : "—"}
                  {d.departedAt && <> · {t("portal.req.departed", L)} {d.departedAt.toISOString().slice(5, 16).replace("T", " ")}</>}
                  {d.completedAt && <> · {t("portal.req.completed", L)} {d.completedAt.toISOString().slice(5, 16).replace("T", " ")}</>}
                </div>
                {d.parts.length > 0 && (
                  <ul className="mt-1 text-[11px] text-[color:var(--tts-sub)]">
                    {d.parts.map((p) => (
                      <li key={p.id}>• {p.item.name} ×{p.quantity}{p.serialNumber ? ` (S/N ${p.serialNumber})` : ""}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {ticket.completedAt && (
              <li>
                <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-[color:var(--tts-success)]" />
                <div className="text-[12px] font-bold">✅ {t("portal.req.stepCompleted", L)}</div>
                <div className="text-[11px] text-[color:var(--tts-muted)]">{ticket.completedAt.toISOString().replace("T", " ").slice(0, 16)}</div>
              </li>
            )}
            {!ticket.completedAt && (
              <li>
                <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-[color:var(--tts-muted)]" />
                <div className="text-[12px] text-[color:var(--tts-muted)]">⏳ {t("portal.req.stepPending", L)}</div>
              </li>
            )}
          </ol>
        </Card>
      </div>
    </main>
  );
}
