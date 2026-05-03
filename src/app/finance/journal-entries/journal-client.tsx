"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Line = {
  lineNo: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string | null;
};

type Entry = {
  id: string;
  entryNo: string;
  entryDate: string;
  description: string;
  status: string;
  source: string;
  sourceModuleId: string | null;
  lines: Line[];
};

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-amber-500/15 text-amber-500",
  POSTED: "bg-emerald-500/15 text-emerald-500",
  REVERSED: "bg-rose-500/15 text-rose-500",
};

const SOURCE_TONE: Record<string, string> = {
  MANUAL: "bg-slate-500/15 text-slate-400",
  SALES: "bg-blue-500/15 text-blue-400",
  PURCHASE: "bg-violet-500/15 text-violet-400",
  CASH: "bg-emerald-500/15 text-emerald-400",
  EXPENSE: "bg-rose-500/15 text-rose-400",
  PAYROLL: "bg-orange-500/15 text-orange-400",
  ADJUSTMENT: "bg-fuchsia-500/15 text-fuchsia-400",
};

export function JournalEntriesClient({ entries, lang }: { entries: Entry[]; lang: Lang }) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
        if (sourceFilter !== "ALL" && e.source !== sourceFilter) return false;
        return true;
      }),
    [entries, statusFilter, sourceFilter],
  );

  async function postEntry(id: string) {
    if (!confirm(t("journal.confirmPost", lang))) return;
    const r = await fetch(`/api/finance/journal-entries/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "post" }),
    });
    if (r.ok) location.reload();
    else alert(`failed: ${(await r.json())?.error ?? "unknown"}`);
  }

  async function reverseEntry(id: string) {
    if (!confirm(t("journal.confirmReverse", lang))) return;
    const r = await fetch(`/api/finance/journal-entries/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reverse" }),
    });
    if (r.ok) location.reload();
    else alert(`failed: ${(await r.json())?.error ?? "unknown"}`);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {["ALL", "DRAFT", "POSTED", "REVERSED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-md border px-2.5 py-1 text-[11px] ${statusFilter === st ? "border-[color:var(--tts-primary)] text-[color:var(--tts-primary)]" : "border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"}`}
            >
              {st === "ALL" ? t("common.all", lang) : t(`journal.status.${st}`, lang)}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {["ALL", "MANUAL", "SALES", "PURCHASE", "CASH", "EXPENSE", "PAYROLL", "ADJUSTMENT"].map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`rounded-md border px-2.5 py-1 text-[11px] ${sourceFilter === s ? "border-[color:var(--tts-primary)] text-[color:var(--tts-primary)]" : "border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"}`}
            >
              {s === "ALL" ? t("common.all", lang) : t(`journal.source.${s}`, lang)}
            </button>
          ))}
        </div>
      </div>

      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
          <tr>
            <th className="py-2 text-left">{t("journal.entryNo", lang)}</th>
            <th className="text-left">{t("journal.entryDate", lang)}</th>
            <th className="text-left">{t("journal.description", lang)}</th>
            <th className="text-left">{t("journal.source", lang)}</th>
            <th className="text-left">{t("common.status", lang)}</th>
            <th className="text-right">{t("journal.totalDebit", lang)}</th>
            <th className="text-right">{t("journal.totalCredit", lang)}</th>
            <th className="text-center">{t("common.actions", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((e) => {
            const totalDr = e.lines.reduce((s, l) => s + l.debit, 0);
            const totalCr = e.lines.reduce((s, l) => s + l.credit, 0);
            const isOpen = expanded.has(e.id);
            return (
              <>
                <tr key={e.id} className="border-b border-[color:var(--tts-border)]/40">
                  <td className="py-2 font-mono">
                    <button
                      onClick={() => {
                        const s = new Set(expanded);
                        if (s.has(e.id)) s.delete(e.id); else s.add(e.id);
                        setExpanded(s);
                      }}
                      className="text-left text-[color:var(--tts-primary)] hover:underline"
                    >
                      {isOpen ? "▼ " : "▶ "}{e.entryNo}
                    </button>
                  </td>
                  <td>{e.entryDate}</td>
                  <td className="max-w-[300px] truncate">{e.description}</td>
                  <td>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${SOURCE_TONE[e.source] ?? ""}`}>
                      {t(`journal.source.${e.source}`, lang)}
                    </span>
                  </td>
                  <td>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[e.status] ?? ""}`}>
                      {t(`journal.status.${e.status}`, lang)}
                    </span>
                  </td>
                  <td className="text-right font-mono">{Math.round(totalDr).toLocaleString()}</td>
                  <td className="text-right font-mono">{Math.round(totalCr).toLocaleString()}</td>
                  <td className="text-center">
                    {e.status === "DRAFT" && <Button variant="primary" onClick={() => postEntry(e.id)}>{t("journal.post", lang)}</Button>}
                    {e.status === "POSTED" && <Button variant="ghost" onClick={() => reverseEntry(e.id)}>{t("journal.reverse", lang)}</Button>}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-[color:var(--tts-border)]/40 bg-[color:var(--tts-bg)]/40">
                    <td colSpan={8} className="px-4 py-2">
                      <table className="w-full text-[11px]">
                        <thead className="text-[color:var(--tts-muted)]">
                          <tr>
                            <th className="text-left">#</th>
                            <th className="text-left">{t("journal.account", lang)}</th>
                            <th className="text-left">{t("journal.lineDescription", lang)}</th>
                            <th className="text-right">{t("journal.debit", lang)}</th>
                            <th className="text-right">{t("journal.credit", lang)}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e.lines.map((l) => (
                            <tr key={l.lineNo}>
                              <td>{l.lineNo}</td>
                              <td className="font-mono">{l.accountCode} <span className="text-[color:var(--tts-sub)]">— {l.accountName}</span></td>
                              <td className="text-[color:var(--tts-sub)]">{l.description}</td>
                              <td className="text-right font-mono">{l.debit ? Math.round(l.debit).toLocaleString() : ""}</td>
                              <td className="text-right font-mono">{l.credit ? Math.round(l.credit).toLocaleString() : ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={8} className="py-4 text-center text-[color:var(--tts-muted)]">{t("common.noData", lang)}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
