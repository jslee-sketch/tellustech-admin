"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

const CATEGORIES = ["", "MARKETING", "COMPANY_NEWS", "KOREA_NEWS", "VIETNAM_NEWS", "INDUSTRY_NEWS", "TIP", "COMMUNITY"] as const;

export function PostsClient({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  const [cat, setCat] = useState<string>("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openContent, setOpenContent] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function refetch() {
    const url = "/api/portal/posts" + (cat ? `?category=${cat}` : "");
    const r = await fetch(url, { credentials: "same-origin" });
    const j = await r.json();
    setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, [cat]);

  async function open(id: string) {
    setOpenId(id);
    const r = await fetch(`/api/portal/posts/${id}`, { credentials: "same-origin" });
    const j = await r.json();
    setOpenContent(j?.post);
    if (j?.pointsEarned) setToast(`🏆 +${j.pointsEarned}d`);
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-2xl font-extrabold">📰 {t("portal.sidebar.posts", lang)}</h1>
        <div className="mb-3 flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded px-2 py-1 text-[12px] ${cat === c ? "bg-[color:var(--tts-accent)] text-white" : "border border-[color:var(--tts-border)]"}`}>
              {c === "" ? t("portal.posts.allCategory", lang) : c}
            </button>
          ))}
        </div>
        {toast && <div className="mb-3 rounded bg-[color:var(--tts-success-dim)] px-3 py-1.5 text-[13px] text-[color:var(--tts-success)]">{toast}</div>}
        <Card count={items.length}>
          {items.length === 0 ? (<p className="text-[13px] text-[color:var(--tts-muted)]">{t("portal.posts.empty", lang)}</p>) : (
            <ul className="space-y-1">
              {items.map((p) => (
                <li key={p.id} className="border-b border-[color:var(--tts-border)]/50 py-2">
                  <button onClick={() => open(p.id)} className="flex w-full items-center justify-between text-left hover:bg-[color:var(--tts-card-hover)]">
                    <span className="flex items-center gap-2 text-[13px]">
                      {p.isPinned && <span className="text-[color:var(--tts-warn)]">📌</span>}
                      <Badge tone="primary">{p.category}</Badge>
                      <span className="font-bold">{p.titleKo || p.titleVi || p.titleEn}</span>
                      {p.bonusPoints > 0 && <Badge tone="warn">{t("portal.posts.bonusBadge", lang).replace("{n}", String(p.bonusPoints))}</Badge>}
                    </span>
                    <span className="text-[11px] text-[color:var(--tts-muted)]">{String(p.publishedAt ?? p.createdAt).slice(0, 10)} · {p.viewCount} {t("portal.posts.viewCount", lang)}</span>
                  </button>
                  {openId === p.id && openContent && (
                    <div className="mt-2 rounded bg-[color:var(--tts-card-hover)] p-3 text-[13px] whitespace-pre-wrap">{openContent.bodyKo || openContent.bodyVi || openContent.bodyEn}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
