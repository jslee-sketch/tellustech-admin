"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

const NEXT_STATUS = ["SUBMITTED", "CONTACTED", "MEETING", "CONTRACTED", "PAID", "DECLINED"] as const;

export function ReferralsAdminClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  async function refetch() {
    const r = await fetch("/api/admin/referrals", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/referrals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: "status", status }) });
    refetch();
  }
  async function firstPayment(id: string) {
    if (!confirm("첫 입금 발생 처리 → 추천인에게 100,000d 적립?")) return;
    const r = await fetch(`/api/admin/referrals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: "first_payment" }) });
    const j = await r.json();
    if (r.ok && j.pointsEarned) alert(`+${j.pointsEarned}d 적립`);
    refetch();
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-2xl font-extrabold">🤝 {t("admin.referrals.title", lang)}</h1>
        <Card count={items.length}>
          <table className="w-full text-[12px]">
            <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
              <tr>
                <th className="px-2 py-1 text-left">{t("portal.points.date", lang)}</th>
                <th className="px-2 py-1 text-left">{t("col.refReceipt", lang)}</th>
                <th className="px-2 py-1 text-left">추천인</th>
                <th className="px-2 py-1 text-left">{t("portal.referrals.companyName", lang)}</th>
                <th className="px-2 py-1 text-left">{t("portal.referrals.contactName", lang)}</th>
                <th className="px-2 py-1 text-left">{t("col.statusShort", lang)}</th>
                <th className="px-2 py-1 text-right" />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-[color:var(--tts-border)]/50">
                  <td className="px-2 py-1.5">{String(r.createdAt).slice(0, 10)}</td>
                  <td className="px-2 py-1.5 font-mono">{r.referralCode}</td>
                  <td className="px-2 py-1.5">{r.referrerClient.clientCode}/{r.referrerClient.companyNameVi}</td>
                  <td className="px-2 py-1.5">{r.companyName}</td>
                  <td className="px-2 py-1.5">{r.contactName}<br /><span className="text-[10px] text-[color:var(--tts-muted)]">{r.contactPhone}</span></td>
                  <td className="px-2 py-1.5"><Badge tone={r.status === "PAID" ? "success" : "warn"}>{r.status}</Badge></td>
                  <td className="px-2 py-1.5 text-right">
                    <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-1 py-0.5 text-[11px]">
                      {NEXT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {r.status === "CONTRACTED" && (
                      <button onClick={() => firstPayment(r.id)} className="ml-1 rounded bg-[color:var(--tts-success)] px-2 py-0.5 text-[11px] font-bold text-white">첫 입금</button>
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
