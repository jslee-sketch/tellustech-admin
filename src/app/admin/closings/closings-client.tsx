"use client";

import { useState } from "react";
import { Card, Button, Field, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export function ClosingsClient({ role, lang }: { role: string; lang: Lang }) {
  const now = new Date();
  const ym0 = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [ym, setYm] = useState(ym0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

  return (
    <Card title={t("closings.cardTitle", lang)}>
      <Field label={t("closings.targetMonth", lang)}><TextInput value={ym} onChange={(e)=>setYm(e.target.value)} placeholder="2026-04" /></Field>
      <div className="mt-3 flex gap-2">
        <Button onClick={close} disabled={busy}>{t("closings.btnLock", lang)}</Button>
        {role === "ADMIN" && <Button onClick={reopen} variant="ghost" disabled={busy}>{t("closings.btnUnlock", lang)}</Button>}
      </div>
      {msg && <div className="mt-3 text-[12px] text-[color:var(--tts-sub)]">{msg}</div>}
      <div className="mt-4 text-[11px] text-[color:var(--tts-muted)]">
        {t("closings.note", lang)}
      </div>
    </Card>
  );
}
