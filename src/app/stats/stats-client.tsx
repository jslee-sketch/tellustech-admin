"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Field, TextInput, Tabs, Button, DataTable, Badge } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import type { Lang } from "@/lib/i18n";

type Props = { lang: Lang };

function defaultRange() {
  const n = new Date();
  const from = new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0,10);
  const to   = new Date(n.getFullYear(), n.getMonth()+1, 0).toISOString().slice(0,10);
  return { from, to };
}

const fmtVnd = (v: unknown) => {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("vi-VN").format(n);
};
const fmtDate = (v: unknown) => {
  if (!v) return "-";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  try { return new Date(s).toISOString().slice(0,10); } catch { return s; }
};

export function StatsClient({ lang: _lang }: Props) {
  const init = defaultRange();
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [clients, setClients] = useState("");
  const [items, setItems] = useState("");
  const [projects, setProjects] = useState("");
  const [employees, setEmployees] = useState("");
  const [tab, setTab] = useState("sales");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    const q = new URLSearchParams({ from, to });
    if (clients) q.set("clients", clients);
    if (items) q.set("items", items);
    if (projects) q.set("projects", projects);
    if (employees) q.set("employees", employees);
    return q.toString();
  }, [from, to, clients, items, projects, employees]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/stats/${tab}?${queryString}`).then((r) => r.json());
      setData(r);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  const tabs = [
    { key: "sales",     label: "💵 매출현황" },
    { key: "purchases", label: "🛒 매입현황" },
    { key: "profit",    label: "📈 이익현황" },
    { key: "sn-profit", label: "🏷 SN별 이익" },
  ];

  // ── 컬럼 정의 (탭별) ──
  const salesCols: DataTableColumn<any>[] = [
    { key: "salesNumber", label: "매출번호", width: "140px", render: (v) => <span className="font-mono text-[color:var(--tts-primary)]">{String(v)}</span> },
    { key: "salesDate",   label: "일자",     width: "100px", render: (v) => <span className="text-[color:var(--tts-sub)]">{fmtDate(v)}</span> },
    { key: "client",      label: "거래처" },
    { key: "repItem",     label: "대표 품목" },
    { key: "project",     label: "프로젝트", width: "120px" },
    { key: "quantity",    label: "수량", align: "right", width: "60px" },
    { key: "amount",      label: "매출액 (VND)", align: "right", width: "140px",
      render: (v) => <span className="font-mono font-semibold text-[color:var(--tts-success)]">{fmtVnd(v)}</span> },
  ];
  const purchasesCols: DataTableColumn<any>[] = [
    { key: "purchaseNumber", label: "매입번호", width: "140px", render: (v) => <span className="font-mono text-[color:var(--tts-primary)]">{String(v)}</span> },
    { key: "purchaseDate",   label: "일자",     width: "100px", render: (v) => <span className="text-[color:var(--tts-sub)]">{fmtDate(v)}</span> },
    { key: "supplier",       label: "공급처" },
    { key: "repItem",        label: "대표 품목" },
    { key: "project",        label: "프로젝트", width: "120px" },
    { key: "quantity",       label: "수량", align: "right", width: "60px" },
    { key: "amount",         label: "매입액 (VND)", align: "right", width: "140px",
      render: (v) => <span className="font-mono font-semibold text-[color:var(--tts-warn)]">{fmtVnd(v)}</span> },
  ];
  const snCols: DataTableColumn<any>[] = [
    { key: "sn",             label: "S/N", width: "200px", render: (v) => <span className="font-mono text-[11px]">{String(v)}</span> },
    { key: "item",           label: "품목" },
    { key: "contractNumber", label: "계약번호", width: "140px", render: (v) => v && v !== "-" ? <Badge tone="primary">{String(v)}</Badge> : <span className="text-[color:var(--tts-muted)]">-</span> },
    { key: "client",         label: "고객" },
    { key: "project",        label: "프로젝트" },
    { key: "salesAmount",    label: "매출", align: "right", width: "100px",
      render: (v) => <span className="font-mono text-[color:var(--tts-success)]">{fmtVnd(v)}</span> },
    { key: "purchaseAmount", label: "매입", align: "right", width: "100px",
      render: (v) => <span className="font-mono text-[color:var(--tts-warn)]">{fmtVnd(v)}</span> },
    { key: "cost",           label: "비용", align: "right", width: "100px",
      render: (v) => <span className="font-mono text-[color:var(--tts-danger)]">{fmtVnd(v)}</span> },
    { key: "profit",         label: "이익", align: "right", width: "100px",
      render: (v) => {
        const n = Number(v ?? 0);
        const cls = n >= 0 ? "text-[color:var(--tts-primary)]" : "text-[color:var(--tts-danger)]";
        return <span className={`font-mono font-bold ${cls}`}>{fmtVnd(v)}</span>;
      } },
  ];

  return (
    <div className="space-y-4">
      {/* 검색조건 */}
      <Card title="검색조건">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Field label="시작일"><TextInput type="date" value={from} onChange={(e)=>setFrom(e.target.value)} /></Field>
          <Field label="종료일"><TextInput type="date" value={to}   onChange={(e)=>setTo(e.target.value)} /></Field>
          <Field label="거래처 (id, 쉼표)"><TextInput value={clients} onChange={(e)=>setClients(e.target.value)} placeholder="cuid"/></Field>
          <Field label="품목 (id, 쉼표)"><TextInput value={items} onChange={(e)=>setItems(e.target.value)} placeholder="cuid"/></Field>
          <Field label="프로젝트 (id, 쉼표)"><TextInput value={projects} onChange={(e)=>setProjects(e.target.value)} placeholder="cuid"/></Field>
          <Field label="영업사원 (id, 쉼표)"><TextInput value={employees} onChange={(e)=>setEmployees(e.target.value)} placeholder="cuid"/></Field>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={load} disabled={loading}>{loading ? "조회 중…" : "조회"}</Button>
          <span className="text-[11px] text-[color:var(--tts-muted)]">
            기본은 당월 1일 ~ 말일. 검색조건 변경 후 조회 버튼을 눌러주세요.
          </span>
        </div>
      </Card>

      <Tabs active={tab} onChange={setTab} tabs={tabs} />

      {/* 결과 */}
      {!data ? (
        <Card title="결과"><div className="text-[12px] text-[color:var(--tts-sub)]">조회를 눌러주세요.</div></Card>
      ) : tab === "profit" ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="총 매출" value={fmtVnd(data.totalSales)} sub={`${data.counts?.sales ?? 0} 건`} accent="success" />
            <KpiCard label="총 매입" value={fmtVnd(data.totalPurchase)} sub={`${data.counts?.purchases ?? 0} 건`} accent="warn" />
            <KpiCard label="총 비용" value={fmtVnd(data.totalExpense)} sub={`${data.counts?.expenses ?? 0} 건`} accent="danger" />
            <KpiCard
              label="순이익 (매출 − 매입 − 비용)"
              value={fmtVnd(data.profit)}
              sub={Number(data.profit ?? 0) >= 0 ? "흑자" : "적자"}
              accent={Number(data.profit ?? 0) >= 0 ? "primary" : "danger"}
              big
            />
          </div>
          <Card title="기간">
            <div className="text-[13px] text-[color:var(--tts-sub)]">
              {fmtDate(data.from)} ~ {fmtDate(data.to)} · 통화 단위: VND
            </div>
          </Card>
        </>
      ) : (
        <Card
          title={tabs.find(t => t.key === tab)?.label}
          count={data.count ?? data.rows?.length ?? 0}
          subtitle={`${fmtDate(data.from)} ~ ${fmtDate(data.to)} · 합계 ${fmtVnd(data.sumAmount)} VND`}
        >
          <DataTable
            columns={tab === "sales" ? salesCols : tab === "purchases" ? purchasesCols : snCols}
            data={data.rows ?? []}
            rowKey={(r: any, i) => r.id ?? r.sn ?? String(i)}
            emptyMessage="조회 결과가 없습니다."
          />
        </Card>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, accent, big }: { label: string; value: string; sub: string; accent: "primary"|"success"|"warn"|"danger"; big?: boolean }) {
  const accentMap: Record<string, string> = {
    primary: "border-[color:var(--tts-primary)] bg-[color:var(--tts-primary-dim)]/40",
    success: "border-[color:var(--tts-success)] bg-[color:var(--tts-success-dim,rgba(34,197,94,.12))]",
    warn:    "border-[color:var(--tts-warn)] bg-[color:var(--tts-warn-dim,rgba(250,204,21,.12))]",
    danger:  "border-[color:var(--tts-danger)] bg-[color:var(--tts-danger-dim)]/40",
  };
  const valColor: Record<string, string> = {
    primary: "text-[color:var(--tts-primary)]",
    success: "text-[color:var(--tts-success)]",
    warn:    "text-[color:var(--tts-warn)]",
    danger:  "text-[color:var(--tts-danger)]",
  };
  return (
    <div className={`rounded-xl border-l-4 ${accentMap[accent]} p-4`}>
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--tts-sub)]">{label}</div>
      <div className={`mt-2 font-mono font-extrabold ${valColor[accent]} ${big ? "text-[28px]" : "text-[22px]"}`}>{value}</div>
      <div className="mt-1 text-[11px] text-[color:var(--tts-muted)]">{sub} <span className="ml-1">· VND</span></div>
    </div>
  );
}
