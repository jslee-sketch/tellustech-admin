"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

const CATEGORIES = ["MARKETING", "COMPANY_NEWS", "KOREA_NEWS", "VIETNAM_NEWS", "INDUSTRY_NEWS", "TIP", "COMMUNITY"] as const;
type Status = "all" | "draft" | "published";

type Post = {
  id: string;
  postCode: string;
  category: typeof CATEGORIES[number];
  titleKo: string | null; titleVi: string | null; titleEn: string | null;
  bodyKo: string | null; bodyVi: string | null; bodyEn: string | null;
  isPublished: boolean;
  isPinned: boolean;
  isAiGenerated: boolean;
  bonusPoints: number;
  viewCount: number;
  createdAt: string;
};

export function PostsAdminClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<Post[]>([]);
  const [tab, setTab] = useState<Status>("all");
  const [editing, setEditing] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCategory, setAiCategory] = useState<typeof CATEGORIES[number]>("MARKETING");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);

  async function refetch() {
    const r = await fetch("/api/admin/portal-posts", { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);

  const filtered = useMemo(() => {
    if (tab === "draft") return items.filter((x) => !x.isPublished);
    if (tab === "published") return items.filter((x) => x.isPublished);
    return items;
  }, [items, tab]);
  const draftCount = items.filter((x) => !x.isPublished).length;
  const publishedCount = items.filter((x) => x.isPublished).length;

  async function aiGenerate() {
    if (!aiTopic) return;
    setAiBusy(true); setAiMsg(null);
    try {
      const r = await fetch("/api/admin/portal-posts/ai-generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ category: aiCategory, topic: aiTopic }),
      });
      const j = await r.json();
      if (!r.ok) {
        setAiMsg(`❌ ${j?.error ?? "fail"}${j?.details?.hint ? " — " + j.details.hint : ""}`);
        return;
      }
      setAiMsg(`✓ AI 초안 생성: "${j?.generated?.titleKo ?? ""}" — 검토 탭에서 확인 후 발행하세요`);
      setAiTopic("");
      setTab("draft"); // 자동으로 초안 탭으로 이동
      await refetch();
      // 방금 생성한 글 자동 열기
      if (j?.post) setEditing(j.post);
    } finally { setAiBusy(false); }
  }

  async function togglePublish(post: Post, next: boolean) {
    await fetch(`/api/admin/portal-posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ isPublished: next }) });
    refetch();
  }
  async function togglePinned(post: Post, next: boolean) {
    await fetch(`/api/admin/portal-posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ isPinned: next }) });
    refetch();
  }
  async function remove(id: string) {
    if (!confirm("이 게시글을 영구 삭제합니다. 계속하시겠습니까?")) return;
    await fetch(`/api/admin/portal-posts/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (editing?.id === id) setEditing(null);
    refetch();
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-2xl font-extrabold">📰 {t("admin.posts.title", lang)}</h1>

        {/* AI 생성 + 직접 작성 */}
        <Card title="🤖 AI 초안 생성">
          <div className="flex flex-wrap items-center gap-2">
            <select value={aiCategory} onChange={(e) => setAiCategory(e.target.value as any)} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="text" value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="주제 입력 (예: 2026년 5월 베트남 공휴일 안내)"
              className="flex-1 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[12px]"
              onKeyDown={(e) => { if (e.key === "Enter" && !aiBusy) aiGenerate(); }}
            />
            <button onClick={aiGenerate} disabled={!aiTopic || aiBusy} className="rounded bg-[color:var(--tts-accent)] px-4 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">{aiBusy ? "생성중…" : "🤖 AI 초안 생성"}</button>
            <button onClick={() => setCreating(true)} className="rounded border border-[color:var(--tts-border)] px-3 py-1.5 text-[12px]">+ 직접 작성</button>
          </div>
          {aiMsg && <div className={`mt-2 rounded px-3 py-2 text-[12px] ${aiMsg.startsWith("❌") ? "bg-[color:var(--tts-danger-dim)] text-[color:var(--tts-danger)]" : "bg-[color:var(--tts-success-dim)] text-[color:var(--tts-success)]"}`}>{aiMsg}</div>}
          <div className="mt-2 text-[11px] text-[color:var(--tts-muted)]">생성된 글은 자동으로 <b>초안 탭</b>에 추가됩니다. 검토 후 [발행] 토글로 게시하세요.</div>
        </Card>

        {/* 상태 탭 */}
        <div className="mt-4 mb-2 flex gap-1 border-b border-[color:var(--tts-border)]">
          <TabBtn active={tab === "all"} onClick={() => setTab("all")}>전체 ({items.length})</TabBtn>
          <TabBtn active={tab === "draft"} onClick={() => setTab("draft")}>📝 초안 ({draftCount})</TabBtn>
          <TabBtn active={tab === "published"} onClick={() => setTab("published")}>✅ 발행됨 ({publishedCount})</TabBtn>
        </div>

        {/* 카드 형식 리스트 — 클릭 시 편집 모달 */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card><p className="text-center text-[13px] text-[color:var(--tts-muted)]">게시글이 없습니다</p></Card>
          ) : (
            filtered.map((p) => (
              <PostRow key={p.id} post={p} onClick={() => setEditing(p)} onTogglePublish={() => togglePublish(p, !p.isPublished)} onTogglePinned={() => togglePinned(p, !p.isPinned)} onDelete={() => remove(p.id)} />
            ))
          )}
        </div>

        {/* 편집/생성 모달 */}
        {editing && <EditModal post={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refetch(); }} />}
        {creating && <EditModal post={null} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refetch(); }} />}
      </div>
    </main>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`px-4 py-2 text-[13px] font-bold ${active ? "border-b-2 border-[color:var(--tts-accent)] text-[color:var(--tts-accent)]" : "text-[color:var(--tts-muted)] hover:text-[color:var(--tts-text)]"}`}>{children}</button>;
}

function PostRow({ post, onClick, onTogglePublish, onTogglePinned, onDelete }: { post: Post; onClick: () => void; onTogglePublish: () => void; onTogglePinned: () => void; onDelete: () => void }) {
  const title = post.titleKo || post.titleVi || post.titleEn || "(제목 없음)";
  const preview = (post.bodyKo || post.bodyVi || post.bodyEn || "").slice(0, 100);
  return (
    <div className={`rounded border ${post.isPublished ? "border-[color:var(--tts-border)]" : "border-[color:var(--tts-warn)]"} bg-[color:var(--tts-card)] p-3 hover:bg-[color:var(--tts-card-hover)] cursor-pointer`} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px]">
            <Badge tone="primary">{post.category}</Badge>
            {post.isAiGenerated && <Badge tone="accent">🤖 AI</Badge>}
            {!post.isPublished && <Badge tone="warn">📝 초안</Badge>}
            {post.isPublished && <Badge tone="success">✅ 발행됨</Badge>}
            {post.isPinned && <span title="상단 고정">📌</span>}
            {post.bonusPoints > 0 && <Badge tone="warn">+{post.bonusPoints}d</Badge>}
            <span className="text-[color:var(--tts-muted)]">{post.postCode} · {String(post.createdAt).slice(0, 10)} · 조회 {post.viewCount}</span>
          </div>
          <div className="text-[14px] font-bold">{title}</div>
          {preview && <div className="mt-1 text-[12px] text-[color:var(--tts-sub)] line-clamp-2">{preview}…</div>}
        </div>
        <div className="flex shrink-0 flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={onTogglePublish} className={`rounded px-2 py-1 text-[11px] font-bold ${post.isPublished ? "bg-[color:var(--tts-success)] text-white" : "bg-[color:var(--tts-accent)] text-white"}`}>{post.isPublished ? "발행취소" : "발행하기"}</button>
          <button onClick={onTogglePinned} className="rounded border border-[color:var(--tts-border)] px-2 py-1 text-[11px]">{post.isPinned ? "고정해제" : "📌 고정"}</button>
          <button onClick={onDelete} className="rounded border border-[color:var(--tts-danger)] px-2 py-1 text-[11px] text-[color:var(--tts-danger)]">삭제</button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ post, onClose, onSaved }: { post: Post | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!post;
  const [category, setCategory] = useState<typeof CATEGORIES[number]>(post?.category ?? "MARKETING");
  const [titleKo, setTitleKo] = useState(post?.titleKo ?? "");
  const [titleVi, setTitleVi] = useState(post?.titleVi ?? "");
  const [titleEn, setTitleEn] = useState(post?.titleEn ?? "");
  const [bodyKo, setBodyKo] = useState(post?.bodyKo ?? "");
  const [bodyVi, setBodyVi] = useState(post?.bodyVi ?? "");
  const [bodyEn, setBodyEn] = useState(post?.bodyEn ?? "");
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? false);
  const [isPinned, setIsPinned] = useState(post?.isPinned ?? false);
  const [bonusPoints, setBonusPoints] = useState(post?.bonusPoints ?? 0);
  const [bodyTab, setBodyTab] = useState<"ko" | "vi" | "en">("ko");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true); setErr(null);
    try {
      if (isEdit) {
        const r = await fetch(`/api/admin/portal-posts/${post!.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
          body: JSON.stringify({ category, titleKo, titleVi, titleEn, bodyKo, bodyVi, bodyEn, isPublished, isPinned, bonusPoints }),
        });
        const j = await r.json();
        if (!r.ok) { setErr(j?.error ?? "fail"); return; }
      } else {
        const r = await fetch("/api/admin/portal-posts", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
          body: JSON.stringify({ category, titleKo, titleVi, titleEn, bodyKo, bodyVi, bodyEn, isPublished, isPinned, bonusPoints }),
        });
        const j = await r.json();
        if (!r.ok) { setErr(j?.error ?? "fail"); return; }
      }
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-[color:var(--tts-card)] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[color:var(--tts-border)] p-4">
          <h2 className="text-lg font-bold">{isEdit ? `편집: ${post!.postCode}` : "새 게시글 작성"}</h2>
          <button onClick={onClose} className="text-[18px] text-[color:var(--tts-muted)] hover:text-[color:var(--tts-text)]">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {/* 카테고리 + 옵션 */}
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            <div>
              <label className="text-[11px] font-bold text-[color:var(--tts-muted)]">카테고리</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[color:var(--tts-muted)]">보너스 포인트 (열람 시)</label>
              <input type="number" value={bonusPoints} onChange={(e) => setBonusPoints(Number(e.target.value))} className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
            </div>
            <div className="flex items-end gap-3 text-[12px]">
              <label className="flex items-center gap-1"><input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} /> 발행</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} /> 📌 고정</label>
            </div>
          </div>

          {/* 제목 3언어 */}
          <div className="mb-3 space-y-1">
            <label className="text-[11px] font-bold text-[color:var(--tts-muted)]">제목 (3언어 — KO 만 입력해도 자동 번역)</label>
            <input value={titleKo} onChange={(e) => setTitleKo(e.target.value)} placeholder="KO 제목" className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
            <input value={titleVi} onChange={(e) => setTitleVi(e.target.value)} placeholder="VI" className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
            <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="EN" className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px]" />
          </div>

          {/* 본문 — 언어 탭 */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] font-bold text-[color:var(--tts-muted)]">본문</label>
              <div className="flex gap-1">
                {(["ko", "vi", "en"] as const).map((l) => (
                  <button key={l} onClick={() => setBodyTab(l)} className={`rounded px-2 py-0.5 text-[11px] ${bodyTab === l ? "bg-[color:var(--tts-accent)] text-white" : "border border-[color:var(--tts-border)]"}`}>{l.toUpperCase()}</button>
                ))}
              </div>
            </div>
            {bodyTab === "ko" && <textarea rows={12} value={bodyKo} onChange={(e) => setBodyKo(e.target.value)} placeholder="한국어 본문" className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px] font-mono whitespace-pre-wrap" />}
            {bodyTab === "vi" && <textarea rows={12} value={bodyVi} onChange={(e) => setBodyVi(e.target.value)} placeholder="Tiếng Việt" className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px] font-mono whitespace-pre-wrap" />}
            {bodyTab === "en" && <textarea rows={12} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} placeholder="English" className="w-full rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1.5 text-[13px] font-mono whitespace-pre-wrap" />}
          </div>

          {err && <div className="mt-2 rounded bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{err}</div>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[color:var(--tts-border)] p-3">
          <div className="text-[11px] text-[color:var(--tts-muted)]">
            {isPublished ? <span className="text-[color:var(--tts-success)] font-bold">✅ 저장 시 즉시 포탈에 표시</span> : <span className="text-[color:var(--tts-warn)] font-bold">📝 초안으로 저장 (포탈에 표시 안 됨)</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded border border-[color:var(--tts-border)] px-4 py-1.5 text-[12px]">취소</button>
            <button onClick={save} disabled={saving || !(titleKo || titleVi || titleEn)} className="rounded bg-[color:var(--tts-accent)] px-5 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">{saving ? "저장중…" : "저장"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
