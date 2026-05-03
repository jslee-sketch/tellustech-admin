"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Row = {
  id: string;
  title: string;
  body: string;
  eventType: string | null;
  linkUrl: string | null;
  createdAt: string;
  readAt: string | null;
};

export function NotificationsClient({ rows, lang }: { rows: Row[]; lang: Lang }) {
  const [filter, setFilter] = useState<"all" | "unread">("unread");

  const visible = filter === "unread" ? rows.filter((r) => !r.readAt) : rows;

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => undefined);
    location.reload();
  }
  async function markAllRead() {
    await Promise.all(rows.filter((r) => !r.readAt).map((r) => fetch(`/api/notifications/${r.id}/read`, { method: "POST" })));
    location.reload();
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          className={`rounded px-3 py-1 text-[12px] ${filter === "unread" ? "bg-[color:var(--tts-primary)] text-white" : "border border-[color:var(--tts-border)]"}`}
          onClick={() => setFilter("unread")}
        >{t("notify.unread", lang)}</button>
        <button
          className={`rounded px-3 py-1 text-[12px] ${filter === "all" ? "bg-[color:var(--tts-primary)] text-white" : "border border-[color:var(--tts-border)]"}`}
          onClick={() => setFilter("all")}
        >{t("common.all", lang)}</button>
        <Button variant="ghost" onClick={markAllRead}>{t("notify.markAllRead", lang)}</Button>
        <span className="ml-auto text-[12px] text-[color:var(--tts-sub)]">{visible.length}</span>
      </div>

      <ul className="divide-y divide-[color:var(--tts-border)]">
        {visible.map((r) => (
          <li key={r.id} className={`py-3 ${r.readAt ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 flex-none rounded-full" style={{ background: r.readAt ? "var(--tts-muted)" : "var(--tts-primary)" }} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold">{r.title}</span>
                  {r.eventType && <span className="rounded bg-[color:var(--tts-bg)]/60 px-1.5 py-0.5 font-mono text-[9px] text-[color:var(--tts-sub)]">{r.eventType}</span>}
                </div>
                <div className="mt-1 whitespace-pre-line text-[12px] text-[color:var(--tts-sub)]">{r.body}</div>
                <div className="mt-1 text-[10px] text-[color:var(--tts-muted)]">{r.createdAt.slice(0, 16).replace("T", " ")}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {r.linkUrl && <Link href={r.linkUrl} className="text-[11px] text-[color:var(--tts-primary)] hover:underline">{t("common.open", lang)} ↗</Link>}
                {!r.readAt && <button onClick={() => markRead(r.id)} className="text-[11px] text-[color:var(--tts-sub)] hover:underline">{t("notify.markRead", lang)}</button>}
              </div>
            </div>
          </li>
        ))}
        {visible.length === 0 && <li className="py-4 text-center text-[color:var(--tts-muted)]">{t("common.noData", lang)}</li>}
      </ul>
    </div>
  );
}
