"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

const CATEGORIES = ["MARKETING", "COMPANY_NEWS", "KOREA_NEWS", "VIETNAM_NEWS", "INDUSTRY_NEWS", "TIP", "COMMUNITY"] as const;

export function PostsAdminClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "MARKETING" as typeof CATEGORIES[number], titleKo: "", bodyKo: "", isPublished: true, bonusPoints: 0, isPinned: false });
  const [aiTopic, setAiTopic] = useState("");

  async function refetch() {
    const r = await fetch("/api/admin/portal-posts", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  async function create() {
    const r = await fetch("/api/admin/portal-posts", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(form) });
    if (r.ok) { setOpen(false); setForm({ category: "MARKETING", titleKo: "", bodyKo: "", isPublished: true, bonusPoints: 0, isPinned: false }); refetch(); }
  }
  async function aiGenerate() {
    if (!aiTopic) return;
    const r = await fetch("/api/admin/portal-posts/ai-generate", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ category: form.category, topic: aiTopic }) });
    if (r.ok) { setAiTopic(""); refetch(); }
  }
  async function togglePublish(id: string, current: boolean) {
    await fetch(`/api/admin/portal-posts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ isPublished: !current }) });
    refetch();
  }
  async function remove(id: string) {
    if (!confirm("삭제?")) return;
    await fetch(`/api/admin/portal-posts/${id}`, { method: "DELETE", credentials: "same-origin" });
    refetch();
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-2xl font-extrabold">📰 {t("admin.posts.title", lang)}</h1>

        <Card>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setOpen(!open)} className="rounded bg-[color:var(--tts-accent)] px-3 py-1.5 text-[12px] font-bold text-white">+ {t("admin.posts.newPost", lang)}</button>
            <input type="text" placeholder={t("admin.posts.aiGenerate", lang)} value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="flex-1 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]" />
            <button onClick={aiGenerate} disabled={!aiTopic} className="rounded border border-[color:var(--tts-accent)] px-3 py-1.5 text-[12px] font-bold text-[color:var(--tts-accent)] disabled:opacity-50">🤖 AI</button>
          </div>
          {open && (
            <div className="mt-3 space-y-2 border-t border-[color:var(--tts-border)] pt-3">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={form.titleKo} onChange={(e) => setForm({ ...form, titleKo: e.target.value })} placeholder="제목 (KO)" className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
              <textarea rows={4} value={form.bodyKo} onChange={(e) => setForm({ ...form, bodyKo: e.target.value })} placeholder="본문 (KO) — 저장 시 3언어 자동 번역" className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
              <div className="flex flex-wrap gap-3 text-[12px]">
                <label><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> 발행</label>
                <label><input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} /> 상단 고정</label>
                <label>보너스 포인트 <input type="number" value={form.bonusPoints} onChange={(e) => setForm({ ...form, bonusPoints: Number(e.target.value) })} className="ml-1 w-20 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-1 py-0.5" /></label>
              </div>
              <button onClick={create} className="rounded bg-[color:var(--tts-accent)] px-3 py-1 text-[12px] font-bold text-white">저장</button>
            </div>
          )}
        </Card>

        <div className="mt-4">
          <Card count={items.length}>
            <table className="w-full text-[12px]">
              <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
                <tr>
                  <th className="px-2 py-1 text-left">{t("portal.points.date", lang)}</th>
                  <th className="px-2 py-1 text-left">{t("col.refReceipt", lang)}</th>
                  <th className="px-2 py-1 text-left">카테고리</th>
                  <th className="px-2 py-1 text-left">제목</th>
                  <th className="px-2 py-1 text-center">조회</th>
                  <th className="px-2 py-1 text-center">발행</th>
                  <th className="px-2 py-1 text-right" />
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-[color:var(--tts-border)]/50">
                    <td className="px-2 py-1.5">{String(p.createdAt).slice(0, 10)}</td>
                    <td className="px-2 py-1.5 font-mono">{p.postCode}</td>
                    <td className="px-2 py-1.5"><Badge tone="primary">{p.category}</Badge></td>
                    <td className="px-2 py-1.5">{p.isAiGenerated && "🤖 "}{p.titleKo || p.titleVi || p.titleEn}{p.isPinned && " 📌"}</td>
                    <td className="px-2 py-1.5 text-center">{p.viewCount}</td>
                    <td className="px-2 py-1.5 text-center"><button onClick={() => togglePublish(p.id, p.isPublished)} className={`rounded px-2 py-0.5 text-[10px] ${p.isPublished ? "bg-[color:var(--tts-success)] text-white" : "border border-[color:var(--tts-border)]"}`}>{p.isPublished ? "발행" : "초안"}</button></td>
                    <td className="px-2 py-1.5 text-right"><button onClick={() => remove(p.id)} className="rounded border border-[color:var(--tts-danger)] px-2 py-0.5 text-[10px] text-[color:var(--tts-danger)]">삭제</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </main>
  );
}
