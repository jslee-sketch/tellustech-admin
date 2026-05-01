"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

// 사용자 UI 언어 우선 → 폴백 순서로 3언어 자유서술 필드 선택.
function pick3(rec: { contentVi?: string | null; contentEn?: string | null; contentKo?: string | null } | null | undefined, lang: Lang): string {
  if (!rec) return "";
  const order: Lang[] = lang === "VI" ? ["VI", "EN", "KO"] : lang === "EN" ? ["EN", "VI", "KO"] : ["KO", "VI", "EN"];
  for (const l of order) {
    const k = `content${l[0]}${l[1].toLowerCase()}` as "contentVi" | "contentEn" | "contentKo";
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}
function pickReply(rec: { replyVi?: string | null; replyEn?: string | null; replyKo?: string | null } | null | undefined, lang: Lang): string {
  if (!rec) return "";
  const order: Lang[] = lang === "VI" ? ["VI", "EN", "KO"] : lang === "EN" ? ["EN", "VI", "KO"] : ["KO", "VI", "EN"];
  for (const l of order) {
    const k = `reply${l[0]}${l[1].toLowerCase()}` as "replyVi" | "replyEn" | "replyKo";
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

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

  function setReplyField(id: string, field: "ko" | "vi" | "en", value: string) {
    setReply((cur) => ({ ...cur, [id]: { ko: cur[id]?.ko ?? "", vi: cur[id]?.vi ?? "", en: cur[id]?.en ?? "", [field]: value } }));
  }

  // 답변 입력 placeholder 는 사용자 UI 언어 따라 1개만 노출 (저장 시 fillTranslations 가 나머지 2개 자동 채움)
  const inputField: "ko" | "vi" | "en" = lang === "KO" ? "ko" : lang === "EN" ? "en" : "vi";
  const replyPlaceholder = lang === "KO" ? "답변 (자동으로 3언어 번역)" : lang === "EN" ? "Reply (auto-translated to 3 languages)" : "Trả lời (tự động dịch sang 3 ngôn ngữ)";

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
                <div className="mb-2 text-[13px]">{pick3(f, lang)}</div>
                {(f.replyKo || f.replyVi || f.replyEn) ? (
                  <div className="rounded bg-[color:var(--tts-card-hover)] p-2 text-[12px]"><span className="text-[10px] font-bold text-[color:var(--tts-muted)]">{t("portal.feedback.reply", lang)}:</span> {pickReply(f, lang)}</div>
                ) : (
                  <div className="space-y-1 border-t border-[color:var(--tts-border)] pt-2">
                    <textarea rows={1} placeholder={replyPlaceholder} value={reply[f.id]?.[inputField] ?? ""} onChange={(e) => setReplyField(f.id, inputField, e.target.value)} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]" />
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
