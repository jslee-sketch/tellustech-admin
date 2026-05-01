"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, SearchBar } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Row = {
  id: string;
  salesNumber: string;
  clientCode: string;
  clientName: string;
  projectCode: string | null;
  totalAmount: string;
  billingMonth: string | null;
  salesConfirmedAt: string | null;
};

export function SalesConfirmClient({ rows, lang }: { rows: Row[]; lang: Lang }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Optimistic local copy — drops rows immediately on CFM, then syncs from props on next server fetch.
  const [localRows, setLocalRows] = useState<Row[]>(rows);
  useEffect(() => { setLocalRows(rows); }, [rows]);

  const filtered = localRows.filter((r) => {
    const ql = q.trim().toLowerCase();
    if (!ql) return true;
    return r.salesNumber.toLowerCase().includes(ql) || r.clientCode.toLowerCase().includes(ql) || r.clientName.toLowerCase().includes(ql);
  });

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function confirmOne(id: string) {
    setBusy(id);
    try {
      const r = await fetch(`/api/sales/${id}/finance-confirm`, { method: "POST" });
      if (r.ok) {
        setLocalRows((cur) => cur.filter((x) => x.id !== id));
        router.refresh();
      }
    } finally { setBusy(null); }
  }
  async function confirmBulk() {
    if (selected.size === 0) return;
    if (!window.confirm(t("salesConfirm.bulkPrompt", lang).replace("{n}", String(selected.size)))) return;
    setBusy("bulk");
    try {
      const ids = Array.from(selected);
      const results = await Promise.all(ids.map(async (id) => {
        const r = await fetch(`/api/sales/${id}/finance-confirm`, { method: "POST" });
        return r.ok ? id : null;
      }));
      const done = new Set(results.filter((x): x is string => !!x));
      setLocalRows((cur) => cur.filter((x) => !done.has(x.id)));
      setSelected(new Set());
      router.refresh();
    } finally { setBusy(null); }
  }

  return (
    <Card title={t("salesConfirm.cardTitle", lang)} count={filtered.length}>
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("salesConfirm.searchPlaceholder", lang)} />
        <Button onClick={confirmBulk} disabled={selected.size === 0 || busy === "bulk"} variant="accent">
          {busy === "bulk" ? "..." : t("salesConfirm.bulkBtn", lang).replace("{n}", String(selected.size))}
        </Button>
      </div>
      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
          <tr>
            <th className="px-2 py-1 w-6"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
            <th className="px-2 py-1 text-left">{t("col.salesNumber", lang)}</th>
            <th className="px-2 py-1 text-left">{t("col.client", lang)}</th>
            <th className="px-2 py-1 text-left">{t("col.billingMonth", lang)}</th>
            <th className="px-2 py-1 text-left">{t("salesConfirm.colSalesConfirmed", lang)}</th>
            <th className="px-2 py-1 text-right">{t("col.amountVnd", lang)}</th>
            <th className="px-2 py-1 text-right">{t("col.action", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && <tr><td colSpan={7} className="px-2 py-3 text-center text-[color:var(--tts-muted)]">{t("salesConfirm.empty", lang)}</td></tr>}
          {filtered.map((r) => (
            <tr key={r.id} className="border-b border-[color:var(--tts-border)]/50">
              <td className="px-2 py-1.5"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} /></td>
              <td className="px-2 py-1.5"><Link href={`/sales/${r.id}`} className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)] hover:underline">{r.salesNumber}</Link></td>
              <td className="px-2 py-1.5">{r.clientName} <span className="ml-1 text-[10px] text-[color:var(--tts-muted)]">{r.clientCode}</span></td>
              <td className="px-2 py-1.5">{r.billingMonth ?? "—"}</td>
              <td className="px-2 py-1.5 text-[10px] text-[color:var(--tts-muted)]">{r.salesConfirmedAt ?? "—"}</td>
              <td className="px-2 py-1.5 text-right font-mono">{Number(r.totalAmount).toLocaleString("vi-VN")}</td>
              <td className="px-2 py-1.5 text-right">
                <Button size="sm" onClick={() => confirmOne(r.id)} disabled={busy === r.id}>
                  {busy === r.id ? "..." : t("salesConfirm.btnSingle", lang)}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
