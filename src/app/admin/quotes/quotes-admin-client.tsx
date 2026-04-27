"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export function QuotesAdminClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  async function refetch() {
    const r = await fetch("/api/admin/quotes", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function quote(id: string) {
    const amt = prompt(t("portal.quotes.quotedAmount", lang));
    if (!amt) return;
    const note = prompt(t("portal.quotes.description", lang));
    const r = await fetch(`/api/admin/quotes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: "quote", quotedAmount: Number(amt), quotedNote: note }) });
    if (r.ok) refetch();
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-2xl font-extrabold">💬 {t("admin.quotes.title", lang)}</h1>
        <Card count={items.length}>
          <table className="w-full text-[12px]">
            <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
              <tr>
                <th className="px-2 py-1 text-left">{t("portal.points.date", lang)}</th>
                <th className="px-2 py-1 text-left">{t("col.refReceipt", lang)}</th>
                <th className="px-2 py-1 text-left">{t("filter.client", lang)}</th>
                <th className="px-2 py-1 text-left">{t("portal.quotes.type", lang)}</th>
                <th className="px-2 py-1 text-left">{t("col.statusShort", lang)}</th>
                <th className="px-2 py-1 text-right">{t("portal.quotes.quotedAmount", lang)}</th>
                <th className="px-2 py-1 text-right" />
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id} className="border-b border-[color:var(--tts-border)]/50">
                  <td className="px-2 py-1.5">{String(q.createdAt).slice(0, 10)}</td>
                  <td className="px-2 py-1.5 font-mono">{q.quoteCode}</td>
                  <td className="px-2 py-1.5">{q.client.clientCode}/{q.client.companyNameVi}</td>
                  <td className="px-2 py-1.5">{q.quoteType}</td>
                  <td className="px-2 py-1.5"><Badge tone="warn">{q.status}</Badge></td>
                  <td className="px-2 py-1.5 text-right font-mono">{q.quotedAmount ? new Intl.NumberFormat("vi-VN").format(Number(q.quotedAmount)) : "—"}</td>
                  <td className="px-2 py-1.5 text-right">
                    {(q.status === "REQUESTED" || q.status === "ASSIGNED") && (
                      <button onClick={() => quote(q.id)} className="rounded bg-[color:var(--tts-accent)] px-2 py-0.5 text-[11px] font-bold text-white">{t("portal.quotes.submit", lang)}</button>
                    )}
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
