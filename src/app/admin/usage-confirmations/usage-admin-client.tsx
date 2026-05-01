"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

const STATUS_TONE: Record<string, "warn" | "primary" | "accent" | "success" | "neutral"> = {
  COLLECTED: "warn",
  CUSTOMER_NOTIFIED: "primary",
  CUSTOMER_CONFIRMED: "accent",
  ADMIN_CONFIRMED: "primary",
  PDF_GENERATED: "success",
  BILLED: "success",
};

const STATUS_LABEL_KEY: Record<string, string> = {
  COLLECTED: "uc.statusCollected",
  CUSTOMER_NOTIFIED: "uc.statusNotified",
  CUSTOMER_CONFIRMED: "uc.statusCustomerConfirmed",
  ADMIN_CONFIRMED: "uc.statusAdminConfirmed",
  PDF_GENERATED: "uc.statusPdfGenerated",
  BILLED: "uc.statusBilled",
};

export function UsageConfirmAdminClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  async function refetch() {
    const r = await fetch("/api/usage-confirmations", { credentials: "same-origin" });
    const j = await r.json(); setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function action(id: string, path: string, body?: any) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/usage-confirmations/${id}/${path}`, { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, credentials: "same-origin", body: body ? JSON.stringify(body) : undefined });
      const j = await r.json();
      if (!r.ok) { alert(t("uc.failed", lang).replace("{e}", String(j?.error ?? "unknown"))); return; }
      refetch();
    } finally { setBusyId(null); }
  }

  async function notify(id: string) { action(id, "notify"); }
  async function manualConfirm(id: string) {
    const note = prompt(t("uc.manualNotePrompt", lang));
    if (!note) return;
    action(id, "manual-confirm", { customerNote: note });
  }
  async function adminConfirm(id: string) { action(id, "admin-confirm"); }
  async function generatePdf(id: string) { action(id, "generate-pdf"); }
  async function createBilling(id: string) {
    if (!confirm(t("uc.salesGenConfirm", lang))) return;
    action(id, "create-billing");
  }
  async function downloadPdf(fileId: string) {
    window.open(`/api/files/${fileId}/download`, "_blank");
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-4 text-2xl font-extrabold">📋 {t("uc.pageTitle", lang)}</h1>
        <Card count={items.length}>
          <table className="w-full text-[12px]">
            <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
              <tr>
                <th className="px-2 py-1 text-left">{t("uc.colConfirmCode", lang)}</th>
                <th className="px-2 py-1 text-left">{t("snmp.colContract", lang)}</th>
                <th className="px-2 py-1 text-left">{t("nav.clients", lang)}</th>
                <th className="px-2 py-1 text-left">{t("uc.colMonth", lang)}</th>
                <th className="px-2 py-1 text-right">{t("pr.amountField", lang)}</th>
                <th className="px-2 py-1 text-left">{t("col.statusShort", lang)}</th>
                <th className="px-2 py-1 text-right">{t("snmp.colAction", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-b border-[color:var(--tts-border)]/50">
                  <td className="px-2 py-1.5 font-mono">{u.confirmCode}</td>
                  <td className="px-2 py-1.5 font-mono">{u.contract.contractNumber}</td>
                  <td className="px-2 py-1.5">{u.client.clientCode} {u.client.companyNameVi}</td>
                  <td className="px-2 py-1.5">{u.billingMonth}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{Number(u.totalAmount).toLocaleString("vi-VN")}₫</td>
                  <td className="px-2 py-1.5"><Badge tone={STATUS_TONE[u.status]}>{STATUS_LABEL_KEY[u.status] ? t(STATUS_LABEL_KEY[u.status], lang) : u.status}</Badge></td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    {u.status === "COLLECTED" && <button disabled={busyId === u.id} onClick={() => notify(u.id)} className="rounded bg-[color:var(--tts-accent)] px-2 py-0.5 text-[10px] text-white">{t("uc.btnNotify", lang)}</button>}
                    {u.status === "CUSTOMER_NOTIFIED" && (
                      <>
                        <button disabled={busyId === u.id} onClick={() => notify(u.id)} className="mr-1 rounded border border-[color:var(--tts-border)] px-2 py-0.5 text-[10px]">{t("uc.btnRenotify", lang)}</button>
                        <button disabled={busyId === u.id} onClick={() => manualConfirm(u.id)} className="rounded bg-[color:var(--tts-warn)] px-2 py-0.5 text-[10px] text-white">{t("uc.btnManualCfm", lang)}</button>
                      </>
                    )}
                    {u.status === "CUSTOMER_CONFIRMED" && <button disabled={busyId === u.id} onClick={() => adminConfirm(u.id)} className="rounded bg-[color:var(--tts-success)] px-2 py-0.5 text-[10px] text-white">{t("uc.btnAdminCfm", lang)}</button>}
                    {u.status === "ADMIN_CONFIRMED" && <button disabled={busyId === u.id} onClick={() => generatePdf(u.id)} className="rounded bg-[color:var(--tts-accent)] px-2 py-0.5 text-[10px] text-white">{t("uc.btnGeneratePdf", lang)}</button>}
                    {u.status === "PDF_GENERATED" && (
                      <>
                        {u.pdfFileId && <button onClick={() => downloadPdf(u.pdfFileId)} className="mr-1 rounded border border-[color:var(--tts-border)] px-2 py-0.5 text-[10px]">📄 PDF</button>}
                        <button disabled={busyId === u.id} onClick={() => createBilling(u.id)} className="rounded bg-[color:var(--tts-success)] px-2 py-0.5 text-[10px] text-white">{t("uc.btnCreateBilling", lang)}</button>
                      </>
                    )}
                    {u.status === "BILLED" && u.pdfFileId && <button onClick={() => downloadPdf(u.pdfFileId)} className="rounded border border-[color:var(--tts-border)] px-2 py-0.5 text-[10px]">📄 PDF</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </main>
  );
}
