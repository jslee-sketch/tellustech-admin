"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Field, Note, Row, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type YieldBadgeT = "BLUE" | "GREEN" | "YELLOW" | "ORANGE" | "RED";

const BADGE_META: Record<YieldBadgeT, { tone: "primary" | "success" | "warn" | "accent" | "danger"; emoji: string; key: string }> = {
  BLUE:   { tone: "primary", emoji: "🔵", key: "yield.badge.blue" },
  GREEN:  { tone: "success", emoji: "🟢", key: "yield.badge.green" },
  YELLOW: { tone: "warn",    emoji: "🟡", key: "yield.badge.yellow" },
  ORANGE: { tone: "accent",  emoji: "🟠", key: "yield.badge.orange" },
  RED:    { tone: "danger",  emoji: "🔴", key: "yield.badge.red" },
};

type AnalysisItem = {
  id: string;
  equipmentId: string;
  contractId: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  actualPagesBw: number;
  actualPagesColor: number;
  expectedPagesBw: number;
  expectedPagesColor: number;
  yieldRateBw: string;
  yieldRateColor: string | null;
  badgeBw: YieldBadgeT;
  badgeColor: YieldBadgeT | null;
  isFraudSuspect: boolean;
  fraudNote: string | null;
  fraudReviewedAt: string | null;
  consumablesUsed: any;
  equipment: { id: string; serialNumber: string; item: { name: string } };
  contract: { id: string; contractNumber: string; client: { id: string; clientCode: string; companyNameKo: string | null; companyNameVi: string | null } };
};

type YieldConfig = {
  thresholdBlue: number;
  thresholdGreen: number;
  thresholdYellow: number;
  thresholdOrange: number;
  fraudAlertThreshold: number;
};

type Tab = "overview" | "fraud" | "tech" | "config";

export function YieldAdminClient({ lang }: { lang: Lang }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<YieldConfig | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  // 검색·필터 (전체현황/부정관리 공용)
  const [filterContract, setFilterContract] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterSn, setFilterSn] = useState("");
  const [filterBadge, setFilterBadge] = useState<YieldBadgeT | "">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());

  async function refetch(fraudOnly = false) {
    setLoading(true);
    try {
      const url = fraudOnly ? "/api/yield-analysis?fraudOnly=1" : "/api/yield-analysis";
      const r = await fetch(url, { credentials: "same-origin" });
      const j = await r.json();
      setItems(j?.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function loadConfig() {
    const r = await fetch("/api/admin/yield-config", { credentials: "same-origin" });
    const j = await r.json();
    if (j?.config) setConfig(j.config);
  }

  useEffect(() => {
    if (tab === "overview") refetch(false);
    if (tab === "fraud") refetch(true);
    if (tab === "config") loadConfig();
    if (tab === "tech") refetch(false);
  }, [tab]);

  // 필터 적용 — 계약/거래처/장비S/N/뱃지/기간 부분일치.
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (filterContract && !it.contract.contractNumber.toLowerCase().includes(filterContract.toLowerCase())) return false;
      if (filterClient) {
        const blob = `${it.contract.client.clientCode} ${it.contract.client.companyNameKo ?? ""} ${it.contract.client.companyNameVi ?? ""}`.toLowerCase();
        if (!blob.includes(filterClient.toLowerCase())) return false;
      }
      if (filterSn) {
        const eq = `${it.equipment.serialNumber} ${it.equipment.item.name}`.toLowerCase();
        if (!eq.includes(filterSn.toLowerCase())) return false;
      }
      if (filterBadge && it.badgeBw !== filterBadge) return false;
      if (filterFrom && it.periodEnd.slice(0, 10) < filterFrom) return false;
      if (filterTo && it.periodStart.slice(0, 10) > filterTo) return false;
      return true;
    });
  }, [items, filterContract, filterClient, filterSn, filterBadge, filterFrom, filterTo]);

  const distribution = useMemo(() => {
    const counts: Record<YieldBadgeT, number> = { BLUE: 0, GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0 };
    for (const it of filteredItems) counts[it.badgeBw] += 1;
    return counts;
  }, [filteredItems]);

  // 계약별 그룹핑 (전체현황 펼치기용)
  const contractsGrouped = useMemo(() => {
    const map = new Map<string, { contract: AnalysisItem["contract"]; equipments: AnalysisItem[] }>();
    for (const it of filteredItems) {
      const key = it.contract.id;
      const cur = map.get(key) ?? { contract: it.contract, equipments: [] };
      cur.equipments.push(it);
      map.set(key, cur);
    }
    // 계약별 평균 적정율 — 가장 낮은(위험한) 장비 기준 정렬
    return Array.from(map.values()).sort((a, b) => {
      const aMin = Math.min(...a.equipments.map((e) => Number(e.yieldRateBw)));
      const bMin = Math.min(...b.equipments.map((e) => Number(e.yieldRateBw)));
      return aMin - bMin;
    });
  }, [filteredItems]);

  function toggleContract(id: string) {
    setExpandedContracts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearFilters() {
    setFilterContract(""); setFilterClient(""); setFilterSn("");
    setFilterBadge(""); setFilterFrom(""); setFilterTo("");
  }

  const techStats = useMemo(() => {
    const map = new Map<string, { name: string; total: number; suspect: number; rateSum: number }>();
    for (const it of filteredItems) {
      const parts = (it.consumablesUsed ?? []) as any[];
      // tech 정보는 consumable-history API 가 있어야 정확. 여기서는 단순 client 별 집계로 대체.
      const key = it.contract.client.clientCode;
      const name = it.contract.client.companyNameKo ?? it.contract.client.companyNameVi ?? key;
      const cur = map.get(key) ?? { name, total: 0, suspect: 0, rateSum: 0 };
      cur.total += 1;
      if (it.isFraudSuspect) cur.suspect += 1;
      cur.rateSum += Number(it.yieldRateBw);
      map.set(key, cur);
    }
    return Array.from(map.entries()).map(([code, v]) => ({
      code, name: v.name, total: v.total, suspect: v.suspect,
      avgRate: v.total > 0 ? Math.round((v.rateSum / v.total) * 10) / 10 : 0,
    })).sort((a, b) => a.avgRate - b.avgRate);
  }, [items]);

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-4 text-2xl font-extrabold">📊 {t("yield.dashboard.title", lang)}</h1>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-md bg-[color:var(--tts-input)] p-1">
          {(["overview", "fraud", "tech", "config"] as const).map((tp) => (
            <button
              key={tp}
              onClick={() => setTab(tp)}
              className={`flex-1 rounded px-3 py-2 text-[13px] font-semibold transition ${tab === tp ? "bg-[color:var(--tts-primary)] text-white" : "text-[color:var(--tts-sub)] hover:text-[color:var(--tts-text)]"}`}
            >
              {t(`yield.tab.${tp}`, lang)}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <FilterBar
              filterContract={filterContract} setFilterContract={setFilterContract}
              filterClient={filterClient} setFilterClient={setFilterClient}
              filterSn={filterSn} setFilterSn={setFilterSn}
              filterBadge={filterBadge} setFilterBadge={setFilterBadge}
              filterFrom={filterFrom} setFilterFrom={setFilterFrom}
              filterTo={filterTo} setFilterTo={setFilterTo}
              onClear={clearFilters} lang={lang}
            />

            {/* 분포 — 필터 적용 후 */}
            <Card className="mb-4">
              <div className="mb-2 text-[12px] font-bold text-[color:var(--tts-sub)]">분포 (필터 결과)</div>
              <div className="flex flex-wrap gap-3 text-[12px]">
                {(Object.keys(BADGE_META) as YieldBadgeT[]).map((b) => (
                  <div key={b} className="flex items-center gap-1">
                    <span>{BADGE_META[b].emoji}</span>
                    <span>{t(BADGE_META[b].key, lang)}:</span>
                    <span className="font-bold">{distribution[b]}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 계약 단위 그룹 — 클릭 시 장비 행 펼쳐짐 */}
            <Card count={contractsGrouped.length}>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
                    <tr>
                      <th className="w-6 px-2 py-1"></th>
                      <th className="px-2 py-1 text-left">계약번호</th>
                      <th className="px-2 py-1 text-left">거래처</th>
                      <th className="px-2 py-1 text-right">장비 수</th>
                      <th className="px-2 py-1 text-right">최저 적정율</th>
                      <th className="px-2 py-1 text-left">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan={6} className="px-2 py-3 text-center text-[color:var(--tts-muted)]">…</td></tr>}
                    {!loading && contractsGrouped.length === 0 && (
                      <tr><td colSpan={6} className="px-2 py-3 text-center text-[color:var(--tts-muted)]">결과 없음</td></tr>
                    )}
                    {contractsGrouped.map((grp) => {
                      const expanded = expandedContracts.has(grp.contract.id);
                      const minRate = Math.min(...grp.equipments.map((e) => Number(e.yieldRateBw)));
                      const minEq = grp.equipments.find((e) => Number(e.yieldRateBw) === minRate);
                      const minBadge = minEq?.badgeBw ?? "GREEN";
                      const fraudCount = grp.equipments.filter((e) => e.isFraudSuspect).length;
                      return (
                        <FragmentGroup key={grp.contract.id}>
                          <tr
                            onClick={() => toggleContract(grp.contract.id)}
                            className="cursor-pointer border-b border-[color:var(--tts-border)]/50 hover:bg-[color:var(--tts-card-hover)]"
                          >
                            <td className="px-2 py-1.5 text-center text-[color:var(--tts-muted)]">{expanded ? "▾" : "▸"}</td>
                            <td className="px-2 py-1.5 font-mono font-bold text-[color:var(--tts-primary)]">{grp.contract.contractNumber}</td>
                            <td className="px-2 py-1.5">{grp.contract.client.companyNameKo ?? grp.contract.client.companyNameVi ?? grp.contract.client.clientCode}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{grp.equipments.length}</td>
                            <td className="px-2 py-1.5 text-right font-mono font-bold">{minRate}%</td>
                            <td className="px-2 py-1.5">
                              <Badge tone={BADGE_META[minBadge].tone}>
                                {BADGE_META[minBadge].emoji} {t(BADGE_META[minBadge].key, lang)}
                              </Badge>
                              {fraudCount > 0 && <span className="ml-2 text-[10px] text-[color:var(--tts-danger)]">⚠️ 부정 {fraudCount}건</span>}
                            </td>
                          </tr>
                          {expanded && grp.equipments.map((it) => (
                            <tr key={it.id} className="border-b border-[color:var(--tts-border)]/30 bg-[color:var(--tts-input)]/30">
                              <td className="px-2 py-1.5"></td>
                              <td className="px-2 py-1.5 pl-6 text-[11px] text-[color:var(--tts-muted)]">└ S/N</td>
                              <td className="px-2 py-1.5 font-mono text-[11px]">{it.equipment.serialNumber} · <span className="text-[color:var(--tts-sub)]">{it.equipment.item.name}</span></td>
                              <td className="px-2 py-1.5 text-right text-[10px] text-[color:var(--tts-muted)]">{it.periodStart.slice(0, 10)} ~ {it.periodEnd.slice(0, 10)}</td>
                              <td className="px-2 py-1.5 text-right font-mono">
                                <span className="text-[color:var(--tts-sub)] text-[10px]">B/W</span> <span className="font-bold">{it.yieldRateBw}%</span>
                                {it.yieldRateColor !== null && (
                                  <> · <span className="text-[color:var(--tts-sub)] text-[10px]">C</span> <span className="font-bold">{it.yieldRateColor}%</span></>
                                )}
                              </td>
                              <td className="px-2 py-1.5">
                                <Badge tone={BADGE_META[it.badgeBw].tone}>
                                  {BADGE_META[it.badgeBw].emoji} {t(BADGE_META[it.badgeBw].key, lang)}
                                </Badge>
                                {it.badgeColor && it.badgeColor !== it.badgeBw && (
                                  <Badge tone={BADGE_META[it.badgeColor].tone}>
                                    {BADGE_META[it.badgeColor].emoji} {t(BADGE_META[it.badgeColor].key, lang)}
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </FragmentGroup>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {tab === "fraud" && (
          <>
            <FilterBar
              filterContract={filterContract} setFilterContract={setFilterContract}
              filterClient={filterClient} setFilterClient={setFilterClient}
              filterSn={filterSn} setFilterSn={setFilterSn}
              filterBadge={filterBadge} setFilterBadge={setFilterBadge}
              filterFrom={filterFrom} setFilterFrom={setFilterFrom}
              filterTo={filterTo} setFilterTo={setFilterTo}
              onClear={clearFilters} lang={lang}
            />
          <Card count={filteredItems.length}>
            <Note tone="warn">⚠️ {t("yield.fraudSuspect", lang)}</Note>
            <table className="mt-3 w-full text-[12px]">
              <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
                <tr>
                  <th className="px-2 py-1 text-left">계약</th>
                  <th className="px-2 py-1 text-left">기간</th>
                  <th className="px-2 py-1 text-left">거래처</th>
                  <th className="px-2 py-1 text-left">장비</th>
                  <th className="px-2 py-1 text-right">적정율</th>
                  <th className="px-2 py-1 text-left">상태</th>
                  <th className="px-2 py-1 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 && (
                  <tr><td colSpan={7} className="px-2 py-3 text-center text-[color:var(--tts-muted)]">부정 의심 건 없음</td></tr>
                )}
                {filteredItems.filter((it) => it.isFraudSuspect).map((it) => (
                  <tr key={it.id} className="border-b border-[color:var(--tts-border)]/50">
                    <td className="px-2 py-1.5 font-mono text-[11px]">{it.contract.contractNumber}</td>
                    <td className="px-2 py-1.5 text-[11px]">{it.periodStart.slice(0, 10)} ~ {it.periodEnd.slice(0, 10)}</td>
                    <td className="px-2 py-1.5">{it.contract.client.companyNameKo ?? it.contract.client.companyNameVi ?? it.contract.client.clientCode}</td>
                    <td className="px-2 py-1.5 font-mono text-[11px]">{it.equipment.serialNumber} · <span className="text-[color:var(--tts-sub)]">{it.equipment.item.name}</span></td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-[color:var(--tts-danger)]">{it.yieldRateBw}%</td>
                    <td className="px-2 py-1.5 text-[11px]">
                      {it.fraudReviewedAt
                        ? <span className="text-[color:var(--tts-success)]">✅ 조사완료 ({it.fraudReviewedAt.slice(0, 10)})</span>
                        : <span className="text-[color:var(--tts-warn)]">⚠️ 미조사</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        onClick={() => setReviewingId(it.id)}
                        className="rounded bg-[color:var(--tts-accent)] px-2 py-0.5 text-[10px] text-white"
                      >
                        {it.fraudNote ? t("yield.viewInvestigation", lang) : t("yield.investigation", lang)}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          </>
        )}

        {tab === "tech" && (
          <Card count={techStats.length}>
            <Note tone="info">기사별 통계는 AsDispatchPart 의 dispatchEmployee 집계로 향후 확장. 현재는 거래처별 통계로 대체.</Note>
            <table className="mt-3 w-full text-[12px]">
              <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
                <tr>
                  <th className="px-2 py-1 text-left">거래처</th>
                  <th className="px-2 py-1 text-right">분석 건수</th>
                  <th className="px-2 py-1 text-right">평균 적정율</th>
                  <th className="px-2 py-1 text-right">부정 의심 건수</th>
                </tr>
              </thead>
              <tbody>
                {techStats.map((row) => (
                  <tr key={row.code} className="border-b border-[color:var(--tts-border)]/50">
                    <td className="px-2 py-1.5">{row.name}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{row.total}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold">{row.avgRate}%</td>
                    <td className="px-2 py-1.5 text-right font-mono">{row.suspect > 0 ? <span className="text-[color:var(--tts-danger)]">{row.suspect}</span> : "0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {tab === "config" && config && (
          <ConfigPanel config={config} onSaved={(c) => setConfig(c)} lang={lang} />
        )}
      </div>

      {reviewingId && (
        <ReviewModal
          id={reviewingId}
          existing={items.find((i) => i.id === reviewingId)?.fraudNote ?? ""}
          lang={lang}
          onClose={(refreshed) => {
            setReviewingId(null);
            if (refreshed) refetch(true);
          }}
        />
      )}
    </main>
  );
}

function ConfigPanel({ config, onSaved, lang }: { config: YieldConfig; onSaved: (c: YieldConfig) => void; lang: Lang }) {
  const [draft, setDraft] = useState<YieldConfig>(config);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/yield-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(draft),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j?.details?.reason ?? j?.error ?? "save_failed");
        return;
      }
      onSaved(j.config);
      alert(t("common.saved", lang));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <Note tone="info">뱃지 임계값은 단조감소여야 함 (Blue &gt; Green &gt; Yellow &gt; Orange &gt; 0).</Note>
      <Row>
        <Field label="🔵 BLUE 임계 (≥)" width="180px">
          <TextInput type="number" value={String(draft.thresholdBlue)} onChange={(e) => setDraft({ ...draft, thresholdBlue: Number(e.target.value) })} />
        </Field>
        <Field label="🟢 GREEN 임계 (≥)" width="180px">
          <TextInput type="number" value={String(draft.thresholdGreen)} onChange={(e) => setDraft({ ...draft, thresholdGreen: Number(e.target.value) })} />
        </Field>
        <Field label="🟡 YELLOW 임계 (≥)" width="180px">
          <TextInput type="number" value={String(draft.thresholdYellow)} onChange={(e) => setDraft({ ...draft, thresholdYellow: Number(e.target.value) })} />
        </Field>
        <Field label="🟠 ORANGE 임계 (≥)" width="180px">
          <TextInput type="number" value={String(draft.thresholdOrange)} onChange={(e) => setDraft({ ...draft, thresholdOrange: Number(e.target.value) })} />
        </Field>
        <Field label="🔴 부정 알림 임계" width="180px">
          <TextInput type="number" value={String(draft.fraudAlertThreshold)} onChange={(e) => setDraft({ ...draft, fraudAlertThreshold: Number(e.target.value) })} />
        </Field>
      </Row>
      {err && <div className="mt-2 text-[12px] text-[color:var(--tts-danger)]">{err}</div>}
      <div className="mt-3"><Button onClick={save} disabled={saving} variant="accent">{saving ? t("common.saving", lang) : t("common.save", lang)}</Button></div>
    </Card>
  );
}

function ReviewModal({ id, existing, onClose, lang }: { id: string; existing: string; onClose: (refreshed: boolean) => void; lang: Lang }) {
  const [note, setNote] = useState(existing);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!note.trim()) {
      alert("조사 메모를 입력하세요");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/yield-analysis/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fraudNote: note }),
      });
      if (!r.ok) {
        const j = await r.json();
        alert("저장 실패: " + (j?.error ?? "unknown"));
        return;
      }
      onClose(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-4">
        <div className="mb-3 text-[14px] font-bold">부정 의심 건 — 조사 메모</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] p-2 text-[13px]"
          placeholder="예: 04-26 전화 확인. 기사 Khang 이 토너 2개 과다 지급. 재고 조정 완료."
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onClose(false)}>취소</Button>
          <Button variant="accent" onClick={save} disabled={saving}>{saving ? t("common.saving", lang) : t("common.save", lang)}</Button>
        </div>
      </div>
    </div>
  );
}

// 검색·필터 바 (전체현황/부정관리 공용)
function FilterBar({
  filterContract, setFilterContract,
  filterClient, setFilterClient,
  filterSn, setFilterSn,
  filterBadge, setFilterBadge,
  filterFrom, setFilterFrom,
  filterTo, setFilterTo,
  onClear,
  lang,
}: {
  filterContract: string; setFilterContract: (v: string) => void;
  filterClient: string;   setFilterClient: (v: string) => void;
  filterSn: string;       setFilterSn: (v: string) => void;
  filterBadge: YieldBadgeT | ""; setFilterBadge: (v: YieldBadgeT | "") => void;
  filterFrom: string;     setFilterFrom: (v: string) => void;
  filterTo: string;       setFilterTo: (v: string) => void;
  onClear: () => void;
  lang: Lang;
}) {
  const inputCls = "rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px] outline-none focus:border-[color:var(--tts-border-focus)]";
  return (
    <Card className="mb-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <div className="mb-0.5 text-[10px] font-bold text-[color:var(--tts-muted)]">계약번호</div>
          <input value={filterContract} onChange={(e) => setFilterContract(e.target.value)} placeholder="TLS-..." className={`${inputCls} w-32 font-mono`} />
        </div>
        <div>
          <div className="mb-0.5 text-[10px] font-bold text-[color:var(--tts-muted)]">거래처</div>
          <input value={filterClient} onChange={(e) => setFilterClient(e.target.value)} placeholder="이름/코드" className={`${inputCls} w-36`} />
        </div>
        <div>
          <div className="mb-0.5 text-[10px] font-bold text-[color:var(--tts-muted)]">장비 S/N</div>
          <input value={filterSn} onChange={(e) => setFilterSn(e.target.value)} placeholder="SN-..." className={`${inputCls} w-32 font-mono`} />
        </div>
        <div>
          <div className="mb-0.5 text-[10px] font-bold text-[color:var(--tts-muted)]">기간 시작</div>
          <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={`${inputCls} w-36`} />
        </div>
        <div>
          <div className="mb-0.5 text-[10px] font-bold text-[color:var(--tts-muted)]">기간 종료</div>
          <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={`${inputCls} w-36`} />
        </div>
        <div>
          <div className="mb-0.5 text-[10px] font-bold text-[color:var(--tts-muted)]">뱃지</div>
          <select value={filterBadge} onChange={(e) => setFilterBadge(e.target.value as YieldBadgeT | "")} className={`${inputCls} w-32`}>
            <option value="">전체</option>
            {(["BLUE","GREEN","YELLOW","ORANGE","RED"] as YieldBadgeT[]).map((b) => (
              <option key={b} value={b}>{BADGE_META[b].emoji} {t(BADGE_META[b].key, lang)}</option>
            ))}
          </select>
        </div>
        <Button variant="ghost" onClick={onClear}>초기화</Button>
      </div>
    </Card>
  );
}

// 그룹 행 + 펼침 행을 같은 tbody 에 배치하기 위한 fragment wrapper.
function FragmentGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
