"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Note, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Item = { id: string; itemCode: string; name: string; itemType: string; description: string; colorChannel?: string | null; unit?: string | null };
type Result = { searched: Item; compatible: Item[] };

export function CompatSearchClient({ lang }: { lang: Lang }) {
  const [direction, setDirection] = useState<"product_to_parts" | "parts_to_product">("product_to_parts");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);

  async function search() {
    if (!q.trim()) { setResults([]); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/items/compatibility-search?q=${encodeURIComponent(q)}&direction=${direction}`, { credentials: "same-origin" });
      const j = await r.json();
      setResults(j?.results ?? []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-3 text-2xl font-extrabold">🔍 {t("nav.itemCompat", lang)}</h1>
        <Card>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div>
              <div className="mb-1 text-[11px] font-bold text-[color:var(--tts-muted)]">{t("compat.direction", lang)}</div>
              <div className="flex gap-1 rounded-md bg-[color:var(--tts-input)] p-1">
                <button type="button" onClick={() => setDirection("product_to_parts")} className={`rounded px-3 py-1 text-[12px] font-semibold ${direction === "product_to_parts" ? "bg-[color:var(--tts-primary)] text-white" : "text-[color:var(--tts-sub)]"}`}>
                  {t("compat.productToParts", lang)}
                </button>
                <button type="button" onClick={() => setDirection("parts_to_product")} className={`rounded px-3 py-1 text-[12px] font-semibold ${direction === "parts_to_product" ? "bg-[color:var(--tts-primary)] text-white" : "text-[color:var(--tts-sub)]"}`}>
                  {t("compat.partsToProduct", lang)}
                </button>
              </div>
            </div>
            <div className="flex-1 min-w-[260px]">
              <div className="mb-1 text-[11px] font-bold text-[color:var(--tts-muted)]">{lang === "VI" ? "Tìm kiếm" : lang === "EN" ? "Search" : "검색"}</div>
              <TextInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") search(); }}
                placeholder={lang === "VI" ? "Mã / tên / mô tả" : lang === "EN" ? "Code / name / description" : "코드 / 이름 / 설명"}
              />
            </div>
            <button onClick={search} disabled={busy} className="rounded bg-[color:var(--tts-accent)] px-4 py-2 text-[13px] font-bold text-white">
              {busy ? "..." : "🔍"}
            </button>
          </div>
          <Note tone="info">{t("compat.recommendRegister", lang)}</Note>

          <div className="mt-4 space-y-4">
            {results.length === 0 && q && !busy && (
              <div className="text-center text-[12px] text-[color:var(--tts-muted)]">결과 없음</div>
            )}
            {results.map((r) => (
              <div key={r.searched.id} className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-3">
                <div className="mb-2">
                  📌 <Link href={`/master/items/${r.searched.id}`} className="font-bold hover:underline">{r.searched.name}</Link>
                  <span className="ml-2 font-mono text-[11px] text-[color:var(--tts-primary)]">{r.searched.itemCode}</span>
                  <span className="ml-2 rounded bg-[color:var(--tts-card-hover)] px-2 py-0.5 text-[10px]">{r.searched.itemType}</span>
                  {r.searched.description && <div className="mt-0.5 text-[11px] text-[color:var(--tts-muted)]">{r.searched.description}</div>}
                </div>
                <div className="ml-3">
                  <div className="text-[11px] font-bold text-[color:var(--tts-sub)]">
                    {direction === "product_to_parts" ? "호환 소모품/부품" : "호환 장비"} ({r.compatible.length}건)
                  </div>
                  {r.compatible.length === 0 ? (
                    <div className="mt-1 text-[11px] text-[color:var(--tts-muted)]">매핑된 항목 없음 — 품목 등록 화면에서 등록 가능</div>
                  ) : (
                    <table className="mt-1 w-full text-[12px]">
                      <thead className="border-b border-[color:var(--tts-border)] text-[10px] text-[color:var(--tts-muted)]">
                        <tr>
                          <th className="px-2 py-1 text-left">품목코드</th>
                          <th className="px-2 py-1 text-left">품목명</th>
                          <th className="px-2 py-1 text-left">유형</th>
                          <th className="px-2 py-1 text-left">설명</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.compatible.map((c) => (
                          <tr key={c.id} className="border-b border-[color:var(--tts-border)]/40">
                            <td className="px-2 py-1.5">
                              <Link href={`/master/items/${c.id}`} className="font-mono text-[11px] text-[color:var(--tts-primary)] hover:underline">{c.itemCode}</Link>
                            </td>
                            <td className="px-2 py-1.5">{c.name}</td>
                            <td className="px-2 py-1.5">{c.itemType}</td>
                            <td className="px-2 py-1.5 text-[11px] text-[color:var(--tts-muted)]">{c.description ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
