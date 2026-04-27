"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export function FeedbackAdminClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  const [reply, setReply] = useState<Record<string, { ko: string; vi: string; en: string }>>({});

  async function refetch() {
    const r = await fetch("/api/admin/feedback", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function saveReply(id: string) {
    const r = reply[id];
    if (!r || (!r.ko && !r.vi && !r.en)) return;
    const res = await fetch(`/api/admin/feedback/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ replyKo: r.ko, replyVi: r.vi, replyEn: r.en }) });
    if (res.ok) { setReply({ ...reply, [id]: { ko: "", vi: "", en: "" } }); refetch(); }
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-2xl font-extrabold">🌟 {t("admin.feedback.title", lang)}</h1>
        <Card title={t("admin.feedback.title", lang)} count={items.length}>
          <ul className="space-y-3">
            {items.map((f) => (
              <li key={f.id} className="rounded border border-[color:var(--tts-border)] p-3 text-[12px]">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge tone={f.kind === "PRAISE" ? "success" : f.kind === "IMPROVE" ? "warn" : "primary"}>{f.kind}</Badge>
                    <span className="text-[11px] text-[color:var(--tts-muted)]">{f.feedbackCode} · {f.client.clientCode}/{f.client.companyNameVi}</span>
                    {f.targetEmployee && <span className="text-[11px] text-[color:var(--tts-accent)]">→ {f.targetEmployee.employeeCode}</span>}
                  </div>
                  <span className="text-[10px]">{String(f.createdAt).slice(0, 10)}</span>
                </div>
                <div className="mb-2 text-[13px]">{f.contentKo || f.contentVi || f.contentEn}</div>
                {f.replyKo ? (
                  <div className="rounded bg-[color:var(--tts-card-hover)] p-2 text-[12px]"><span className="text-[10px] font-bold text-[color:var(--tts-muted)]">{t("portal.feedback.reply", lang)}:</span> {f.replyKo}</div>
                ) : (
                  <div className="space-y-1 border-t border-[color:var(--tts-border)] pt-2">
                    <textarea rows={1} placeholder="KO 답변" value={reply[f.id]?.ko ?? ""} onChange={(e) => setReply({ ...reply, [f.id]: { ...reply[f.id], ko: e.target.value, vi: reply[f.id]?.vi ?? "", en: reply[f.id]?.en ?? "" } })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]" />
                    <button onClick={() => saveReply(f.id)} className="rounded bg-[color:var(--tts-accent)] px-3 py-1 text-[11px] font-bold text-white">{t("admin.feedback.replySave", lang)}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}
