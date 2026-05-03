"use client";
import { useMemo, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

type Account = {
  id: string;
  code: string;
  nameVi: string; nameEn: string; nameKo: string;
  type: string;
  parentCode: string | null;
  level: number;
  isLeaf: boolean;
  isActive: boolean;
};

const TYPE_TONES: Record<string, string> = {
  ASSET: "text-blue-500",
  LIABILITY: "text-amber-500",
  EQUITY: "text-purple-500",
  REVENUE: "text-emerald-500",
  EXPENSE: "text-rose-500",
};

export function ChartOfAccountsClient({ accounts, lang }: { accounts: Account[]; lang: Lang }) {
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const localizedName = (a: Account) => (lang === "VI" ? a.nameVi : lang === "EN" ? a.nameEn : a.nameKo);

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      if (filter !== "ALL" && a.type !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.code.includes(q) && !localizedName(a).toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [accounts, filter, search, lang]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: accounts.length };
    for (const a of accounts) c[a.type] = (c[a.type] ?? 0) + 1;
    return c;
  }, [accounts]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {["ALL", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map((tp) => (
          <button
            key={tp}
            onClick={() => setFilter(tp)}
            className={`rounded-md border px-3 py-1.5 text-[12px] ${filter === tp ? "border-[color:var(--tts-primary)] bg-[color:var(--tts-primary)]/10 text-[color:var(--tts-primary)]" : "border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"}`}
          >
            {tp === "ALL" ? t("common.all", lang) : t(`coa.type.${tp}`, lang)}
            <span className="ml-1.5 text-[11px] opacity-70">({counts[tp] ?? 0})</span>
          </button>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.search", lang)}
          className="ml-auto rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-1.5 text-[12px]"
        />
      </div>

      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
          <tr>
            <th className="py-2 text-left">{t("coa.code", lang)}</th>
            <th className="text-left">{t("coa.name", lang)}</th>
            <th className="text-left">{t("coa.type", lang)}</th>
            <th className="text-center">{t("coa.level", lang)}</th>
            <th className="text-center">{t("coa.isLeaf", lang)}</th>
            <th className="text-center">{t("common.status", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((a) => (
            <tr key={a.id} className="border-b border-[color:var(--tts-border)]/40">
              <td className="py-2 font-mono">{a.code}</td>
              <td style={{ paddingLeft: `${(a.level - 1) * 16}px` }}>
                <span className={a.isLeaf ? "" : "font-bold"}>{localizedName(a)}</span>
              </td>
              <td className={TYPE_TONES[a.type] ?? ""}>{t(`coa.type.${a.type}`, lang)}</td>
              <td className="text-center">{a.level}</td>
              <td className="text-center">{a.isLeaf ? "✓" : "—"}</td>
              <td className="text-center">{a.isActive ? "✓" : "✗"}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={6} className="py-4 text-center text-[color:var(--tts-muted)]">{t("common.noData", lang)}</td></tr>
          )}
        </tbody>
      </table>
      <div className="mt-3 text-[11px] text-[color:var(--tts-muted)]">{t("coa.hint", lang)}</div>
    </div>
  );
}
