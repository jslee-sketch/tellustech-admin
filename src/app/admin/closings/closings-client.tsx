"use client";

import { useState } from "react";
import { Card, Button, Field, TextInput } from "@/components/ui";

export function ClosingsClient({ role }: { role: string }) {
  const now = new Date();
  const ym0 = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [ym, setYm] = useState(ym0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function close() {
    if (!confirm(`${ym} 회계 마감을 진행합니다. 매출/매입/비용/PR 행이 잠깁니다. 계속?`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/closings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ yearMonth: ym }) });
      const j = await r.json();
      setMsg(r.ok ? `잠금 완료: 매출 ${j.sales} / 매입 ${j.purchases} / 비용 ${j.expenses} / PR ${j.payables}` : `실패: ${j.error}`);
    } finally { setBusy(false); }
  }
  async function reopen() {
    if (!confirm(`${ym} 마감 해제 (ADMIN 전용). 계속?`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/admin/closings?yearMonth=${ym}`, { method:'DELETE' });
      const j = await r.json();
      setMsg(r.ok ? `해제 완료: 매출 ${j.sales} / 매입 ${j.purchases} / 비용 ${j.expenses} / PR ${j.payables}` : `실패: ${j.error}`);
    } finally { setBusy(false); }
  }

  return (
    <Card title="월별 마감">
      <Field label="대상 월 (YYYY-MM)"><TextInput value={ym} onChange={(e)=>setYm(e.target.value)} placeholder="2026-04" /></Field>
      <div className="mt-3 flex gap-2">
        <Button onClick={close} disabled={busy}>마감 (lock)</Button>
        {role === "ADMIN" && <Button onClick={reopen} variant="ghost" disabled={busy}>마감 해제 (unlock)</Button>}
      </div>
      {msg && <div className="mt-3 text-[12px] text-[color:var(--tts-sub)]">{msg}</div>}
      <div className="mt-4 text-[11px] text-[color:var(--tts-muted)]">
        ※ 마감 시 해당 월의 매출/매입/비용/PR 모두에 lockedAt + lockReason="회계 마감 YYYY-MM" 부여.
        잠긴 행은 PATCH/Adjust/Amend 가 409 로 거절됨. 마감 해제는 ADMIN 만 가능.
      </div>
    </Card>
  );
}
