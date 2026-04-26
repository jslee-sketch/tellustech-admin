"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Field, TextInput, Tabs, Button } from "@/components/ui";
import type { Lang } from "@/lib/i18n";

type Props = { lang: Lang };

function defaultRange() {
  const n = new Date();
  const from = new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0,10);
  const to   = new Date(n.getFullYear(), n.getMonth()+1, 0).toISOString().slice(0,10);
  return { from, to };
}

export function StatsClient({ lang }: Props) {
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
    { key: "sales",     label: "매출현황" },
    { key: "purchases", label: "매입현황" },
    { key: "profit",    label: "이익현황" },
    { key: "sn-profit", label: "SN별 이익" },
  ];

  return (
    <div className="space-y-4">
      <Card title="검색조건">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Field label="시작일"><TextInput type="date" value={from} onChange={(e)=>setFrom(e.target.value)} /></Field>
          <Field label="종료일"><TextInput type="date" value={to}   onChange={(e)=>setTo(e.target.value)} /></Field>
          <Field label="거래처(쉼표)"><TextInput value={clients} onChange={(e)=>setClients(e.target.value)} placeholder="cuid,cuid"/></Field>
          <Field label="품목(쉼표)"><TextInput value={items} onChange={(e)=>setItems(e.target.value)} placeholder="cuid,cuid"/></Field>
          <Field label="프로젝트(쉼표)"><TextInput value={projects} onChange={(e)=>setProjects(e.target.value)} placeholder="cuid,cuid"/></Field>
          <Field label="영업사원(쉼표)"><TextInput value={employees} onChange={(e)=>setEmployees(e.target.value)} placeholder="cuid,cuid"/></Field>
        </div>
        <div className="mt-3"><Button onClick={load} disabled={loading}>{loading ? "조회 중…" : "조회"}</Button></div>
      </Card>

      <Tabs active={tab} onChange={setTab} tabs={tabs} />

      <Card title="결과">
        {!data ? <div className="text-[12px] text-[color:var(--tts-sub)]">조회를 눌러주세요.</div> : (
          <>
            {tab === "profit" ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[14px] md:grid-cols-4">
                <dt>총매출</dt><dd className="font-mono text-right">{Number(data.totalSales ?? 0).toLocaleString()}</dd>
                <dt>총매입</dt><dd className="font-mono text-right">{Number(data.totalPurchase ?? 0).toLocaleString()}</dd>
                <dt>총비용</dt><dd className="font-mono text-right">{Number(data.totalExpense ?? 0).toLocaleString()}</dd>
                <dt className="font-bold text-[color:var(--tts-primary)]">이익</dt>
                <dd className="font-mono text-right font-bold text-[color:var(--tts-primary)]">{Number(data.profit ?? 0).toLocaleString()}</dd>
              </dl>
            ) : (
              <div className="overflow-x-auto">
                <div className="mb-2 text-[12px] text-[color:var(--tts-sub)]">총 {data.count ?? 0}건 · 합계 {Number(data.sumAmount ?? 0).toLocaleString()}</div>
                <table className="w-full text-[12px]">
                  <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
                    <tr>{(data.rows?.[0] ? Object.keys(data.rows[0]).filter(k => k !== 'id') : []).map(k => <th key={k} className="px-2 py-1 text-left">{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(data.rows ?? []).map((r: any, i: number) => (
                      <tr key={i} className="border-b border-[color:var(--tts-border)]/50">
                        {Object.entries(r).filter(([k]) => k !== 'id').map(([k, v]) => (
                          <td key={k} className="px-2 py-1 font-mono">{typeof v === 'string' || typeof v === 'number' ? String(v) : (v == null ? '-' : (v instanceof Date ? v.toISOString().slice(0,10) : JSON.stringify(v)))}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
