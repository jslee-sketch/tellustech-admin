"use client";
import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";

type Row = {
  id: string; createdAt: string; channel: string; status: string;
  recipientCode: string; recipientName: string; recipientAddress: string;
  eventType: string; title: string;
  errorMessage: string | null; retryCount: number;
};

const STATUS_TONE: Record<string, string> = {
  SENT: "text-emerald-500", FAILED: "text-rose-500",
  PENDING: "text-amber-500", RETRY: "text-blue-500",
};
const CHANNEL_ICON: Record<string, string> = { EMAIL: "📧", ZALO: "💬", CHAT: "💻" };

export function NotificationHistoryClient({ rows, lang }: { rows: Row[]; lang: Lang }) {
  const [filterChannel, setFilterChannel] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const visible = rows.filter((r) => {
    if (filterChannel !== "ALL" && r.channel !== filterChannel) return false;
    if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]">
          <option value="ALL">{t("common.all", lang)}</option>
          <option value="EMAIL">📧 Email</option><option value="ZALO">💬 Zalo</option><option value="CHAT">💻 Chat</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]">
          <option value="ALL">{t("common.all", lang)}</option>
          <option value="SENT">{t("notify.status.sent", lang)}</option>
          <option value="FAILED">{t("notify.status.failed", lang)}</option>
          <option value="PENDING">{t("notify.status.pending", lang)}</option>
        </select>
        <span className="ml-auto text-[12px] text-[color:var(--tts-sub)]">{visible.length} / {rows.length}</span>
      </div>

      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
          <tr>
            <th className="py-2 text-left">{t("notify.time", lang)}</th>
            <th className="text-left">{t("notify.event", lang)}</th>
            <th className="text-left">{t("notify.recipient", lang)}</th>
            <th className="text-center">CH</th>
            <th className="text-left">{t("common.status", lang)}</th>
            <th className="text-left">{t("notify.message", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.id} className="border-b border-[color:var(--tts-border)]/40">
              <td className="py-1.5 font-mono text-[10px]">{r.createdAt.slice(5, 16).replace("T", " ")}</td>
              <td className="font-mono text-[10px]">{r.eventType}</td>
              <td className="text-[11px]">{r.recipientCode} {r.recipientName} <span className="text-[color:var(--tts-muted)]">({r.recipientAddress.slice(0, 30)})</span></td>
              <td className="text-center">{CHANNEL_ICON[r.channel] ?? r.channel}</td>
              <td className={`font-bold ${STATUS_TONE[r.status] ?? ""}`}>{t(`notify.status.${r.status.toLowerCase()}`, lang)}{r.retryCount > 0 ? ` (R${r.retryCount})` : ""}</td>
              <td className="text-[11px]">
                {r.title}
                {r.errorMessage && <div className="text-[10px] text-rose-500">⚠ {r.errorMessage}</div>}
              </td>
            </tr>
          ))}
          {visible.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-[color:var(--tts-muted)]">{t("common.noData", lang)}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
