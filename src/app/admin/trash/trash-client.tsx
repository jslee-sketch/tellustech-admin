"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui";

type Row = { id: string; label: string; deletedAt: Date | null };
type Bucket = { model: string; label: string; rows: Row[] };

export function TrashClient({ buckets }: { buckets: Bucket[] }) {
  const [busy, setBusy] = useState(false);
  async function restore(model: string, id: string) {
    if (!confirm(`${model} ${id} 복구?`)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/restore/${model}/${id}`, { method: 'POST' });
      const j = await r.json();
      if (r.ok) location.reload();
      else alert(`실패: ${j?.error}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      {buckets.map((b) => (
        <Card key={b.model} title={`${b.label} — ${b.rows.length}건`}>
          {b.rows.length === 0 ? <div className="text-[12px] text-[color:var(--tts-sub)]">비어있음</div> : (
            <ul className="space-y-1 text-[13px]">
              {b.rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded border border-[color:var(--tts-border)] px-3 py-2">
                  <span className="font-mono">{r.label} <span className="ml-2 text-[11px] text-[color:var(--tts-sub)]">({r.deletedAt ? new Date(r.deletedAt).toISOString().slice(0,19) : '-'})</span></span>
                  <Button size="sm" variant="ghost" onClick={() => restore(b.model, r.id)} disabled={busy}>복구</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
