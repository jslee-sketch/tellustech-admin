"use client";

import { useEffect, useState } from "react";
import { Card, Button, Field, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type PeriodClose = {
  id: string;
  yearMonth: string;
  status: "OPEN" | "VERIFIED" | "CLOSED" | "REOPENED";
  verifiedAt: string | null;
  closedAt: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
  verifyResult: { ok?: boolean; unbalanced?: { entryNo: string }[]; draftCount?: number } | null;
};

const STATUS_TONE: Record<string, string> = {
  OPEN: "text-amber-500",
  VERIFIED: "text-blue-500",
  CLOSED: "text-emerald-500",
  REOPENED: "text-rose-500",
};

export function ClosingsClient({ role, lang }: { role: string; lang: Lang }) {
  const now = new Date();
  const ym0 = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [ym, setYm] = useState(ym0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [closes, setCloses] = useState<PeriodClose[]>([]);

  async function loadCloses() {
    const r = await fetch("/api/finance/period-close");
    const j = await r.json();
    setCloses(j.data?.closes ?? []);
  }
  useEffect(() => { loadCloses(); }, []);

  async function close() {
    if (!confirm(t("closings.lockConfirm", lang).replace("{ym}", ym))) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/closings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ yearMonth: ym }) });
      const j = await r.json();
      setMsg(r.ok ? t("closings.lockResult", lang).replace("{s}", String(j.sales)).replace("{p}", String(j.purchases)).replace("{e}", String(j.expenses)).replace("{r}", String(j.payables)) : `${t("closings.failed", lang)}: ${j.error}`);
    } finally { setBusy(false); }
  }
  async function reopen() {
    if (!confirm(t("closings.unlockConfirm", lang).replace("{ym}", ym))) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/admin/closings?yearMonth=${ym}`, { method:'DELETE' });
      const j = await r.json();
      setMsg(r.ok ? t("closings.unlockResult", lang).replace("{s}", String(j.sales)).replace("{p}", String(j.purchases)).replace("{e}", String(j.expenses)).replace("{r}", String(j.payables)) : `${t("closings.failed", lang)}: ${j.error}`);
    } finally { setBusy(false); }
  }

  async function periodAction(action: "verify" | "close" | "reopen", reason?: string) {
    const labels: Record<string, string> = {
      verify: t("close.confirmVerify", lang),
      close: t("close.confirmClose", lang),
      reopen: t("close.confirmReopen", lang),
    };
    if (!confirm(labels[action].replace("{ym}", ym))) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/finance/period-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearMonth: ym, action, reason }),
      });
      const j = await r.json();
      if (r.ok) {
        if (action === "verify" && j.data?.verifyResult) {
          const v = j.data.verifyResult;
          setMsg(v.ok
            ? t("close.verifyOk", lang)
            : t("close.verifyFail", lang).replace("{u}", String(v.unbalanced?.length ?? 0)).replace("{d}", String(v.draftCount ?? 0)));
        } else {
          setMsg(t(`close.${action}Done`, lang));
        }
        await loadCloses();
      } else {
        setMsg(`${t("closings.failed", lang)}: ${j.error}`);
      }
    } finally { setBusy(false); }
  }

  const current = closes.find((c) => c.yearMonth === ym);

  return (
    <div className="space-y-6">
      <Card title={t("close.periodCloseTitle", lang)}>
        <Field label={t("closings.targetMonth", lang)}><TextInput value={ym} onChange={(e)=>setYm(e.target.value)} placeholder="2026-04" /></Field>
        {current && (
          <div className="mt-3 rounded-md border border-[color:var(--tts-border)] p-3 text-[12px]">
            <div>
              {t("common.status", lang)}: <span className={`font-bold ${STATUS_TONE[current.status]}`}>{t(`close.status.${current.status}`, lang)}</span>
            </div>
            {current.verifiedAt && <div className="text-[color:var(--tts-sub)]">verified: {current.verifiedAt.slice(0, 19)}</div>}
            {current.closedAt && <div className="text-[color:var(--tts-sub)]">closed: {current.closedAt.slice(0, 19)}</div>}
            {current.reopenedAt && <div className="text-[color:var(--tts-sub)]">reopened: {current.reopenedAt.slice(0, 19)} — {current.reopenReason}</div>}
            {current.verifyResult && !current.verifyResult.ok && (
              <div className="mt-2 text-rose-500">
                ✗ unbalanced: {current.verifyResult.unbalanced?.length ?? 0}, draft: {current.verifyResult.draftCount ?? 0}
              </div>
            )}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => periodAction("verify")} disabled={busy}>{t("close.btnVerify", lang)}</Button>
          {(current?.status === "VERIFIED") && (
            <Button onClick={() => periodAction("close")} disabled={busy} variant="primary">{t("close.btnClose", lang)}</Button>
          )}
          {(current?.status === "CLOSED" && role === "ADMIN") && (
            <Button onClick={() => {
              const reason = prompt(t("close.reopenPrompt", lang));
              if (reason) periodAction("reopen", reason);
            }} disabled={busy} variant="ghost">{t("close.btnReopen", lang)}</Button>
          )}
        </div>
        <div className="mt-3 text-[11px] text-[color:var(--tts-muted)]">{t("close.periodCloseNote", lang)}</div>
      </Card>

      <Card title={t("close.recentTitle", lang)}>
        <table className="w-full text-[12px]">
          <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
            <tr>
              <th className="py-2 text-left">{t("closings.targetMonth", lang)}</th>
              <th className="text-left">{t("common.status", lang)}</th>
              <th className="text-left">verified</th>
              <th className="text-left">closed</th>
            </tr>
          </thead>
          <tbody>
            {closes.slice(0, 12).map((c) => (
              <tr key={c.id} className="border-b border-[color:var(--tts-border)]/30 cursor-pointer hover:bg-[color:var(--tts-card-hover)]" onClick={() => setYm(c.yearMonth)}>
                <td className="py-1.5 font-mono">{c.yearMonth}</td>
                <td className={STATUS_TONE[c.status]}>{t(`close.status.${c.status}`, lang)}</td>
                <td className="text-[color:var(--tts-sub)]">{c.verifiedAt?.slice(0, 10) ?? "—"}</td>
                <td className="text-[color:var(--tts-sub)]">{c.closedAt?.slice(0, 10) ?? "—"}</td>
              </tr>
            ))}
            {closes.length === 0 && <tr><td colSpan={4} className="py-3 text-center text-[color:var(--tts-muted)]">{t("common.noData", lang)}</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card title={t("closings.cardTitle", lang) + " (legacy)"}>
        <div className="text-[11px] text-[color:var(--tts-sub)]">{t("close.legacyHint", lang)}</div>
        <div className="mt-3 flex gap-2">
          <Button onClick={close} disabled={busy} variant="ghost">{t("closings.btnLock", lang)}</Button>
          {role === "ADMIN" && <Button onClick={reopen} variant="ghost" disabled={busy}>{t("closings.btnUnlock", lang)}</Button>}
        </div>
        {msg && <div className="mt-3 text-[12px] text-[color:var(--tts-sub)]">{msg}</div>}
        <div className="mt-4 text-[11px] text-[color:var(--tts-muted)]">{t("closings.note", lang)}</div>
      </Card>
    </div>
  );
}
