"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import type { Lang } from "@/lib/i18n";

type Tab = "models" | "readings" | "equipment";

export function SnmpAdminClient({ lang }: { lang: Lang }) {
  const [tab, setTab] = useState<Tab>("models");
  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-2xl font-extrabold">📡 SNMP 관리</h1>
        <div className="mb-4 flex gap-1 border-b border-[color:var(--tts-border)]">
          {([["models", "모델 OID 관리"], ["readings", "수집 현황"], ["equipment", "장비 토큰"]] as [Tab, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-[13px] font-bold ${tab === k ? "border-b-2 border-[color:var(--tts-accent)] text-[color:var(--tts-accent)]" : "text-[color:var(--tts-muted)] hover:text-[color:var(--tts-text)]"}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === "models" && <ModelsTab />}
        {tab === "readings" && <ReadingsTab />}
        {tab === "equipment" && <EquipmentTab />}
      </div>
    </main>
  );
}

function ModelsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ deviceModel: "", brand: "", modelName: "", oidTotal: "1.3.6.1.2.1.43.10.2.1.4.1.1", oidBw: "", oidColor: "", oidSerial: "1.3.6.1.2.1.43.5.1.1.17.1", isMonoOnly: false });
  async function refetch() {
    const r = await fetch("/api/admin/snmp/models", { credentials: "same-origin" });
    const j = await r.json(); setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);
  async function create() {
    const r = await fetch("/api/admin/snmp/models", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(form) });
    if (r.ok) { setOpen(false); refetch(); }
    else alert("등록 실패");
  }
  return (
    <Card title={`모델 OID — ${items.length}건`}>
      <button onClick={() => setOpen(!open)} className="mb-3 rounded bg-[color:var(--tts-accent)] px-3 py-1.5 text-[12px] font-bold text-white">+ 모델 추가</button>
      {open && (
        <div className="mb-3 grid grid-cols-2 gap-2 rounded border border-[color:var(--tts-border)] p-3">
          <input value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })} placeholder="deviceModel (예: SAMSUNG_X1234)" className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]" />
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="브랜드 (Samsung)" className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]" />
          <input value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })} placeholder="모델명 (X-1234)" className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]" />
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={form.isMonoOnly} onChange={(e) => setForm({ ...form, isMonoOnly: e.target.checked })} /> 흑백 전용</label>
          <input value={form.oidTotal} onChange={(e) => setForm({ ...form, oidTotal: e.target.value })} placeholder="oidTotal" className="col-span-2 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px] font-mono" />
          <input value={form.oidBw} onChange={(e) => setForm({ ...form, oidBw: e.target.value })} placeholder="oidBw (선택)" className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px] font-mono" />
          <input value={form.oidColor} onChange={(e) => setForm({ ...form, oidColor: e.target.value })} placeholder="oidColor (선택)" disabled={form.isMonoOnly} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px] font-mono disabled:opacity-50" />
          <input value={form.oidSerial} onChange={(e) => setForm({ ...form, oidSerial: e.target.value })} placeholder="oidSerial" className="col-span-2 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px] font-mono" />
          <button onClick={create} className="col-span-2 rounded bg-[color:var(--tts-accent)] px-3 py-1.5 text-[12px] font-bold text-white">등록</button>
        </div>
      )}
      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
          <tr><th className="px-2 py-1 text-left">deviceModel</th><th className="px-2 py-1 text-left">브랜드</th><th className="px-2 py-1 text-left">모델</th><th className="px-2 py-1 text-left">컬러</th><th className="px-2 py-1 text-left">oidTotal</th></tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id} className="border-b border-[color:var(--tts-border)]/50">
              <td className="px-2 py-1.5 font-mono">{m.deviceModel}</td>
              <td className="px-2 py-1.5">{m.brand}</td>
              <td className="px-2 py-1.5">{m.modelName}</td>
              <td className="px-2 py-1.5">{m.isMonoOnly ? "⚫ 흑백전용" : "🌈 컬러"}</td>
              <td className="px-2 py-1.5 font-mono text-[10px]">{m.oidTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function ReadingsTab() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/admin/snmp/readings", { credentials: "same-origin" }).then((r) => r.json()).then((j) => setItems(j?.items ?? []));
  }, []);
  return (
    <Card title={`수집 현황 — ${items.length}건 (최근 500)`}>
      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
          <tr><th className="px-2 py-1 text-left">수집일시</th><th className="px-2 py-1 text-left">계약</th><th className="px-2 py-1 text-left">S/N</th><th className="px-2 py-1 text-left">모델</th><th className="px-2 py-1 text-right">총 페이지</th><th className="px-2 py-1 text-right">흑백</th><th className="px-2 py-1 text-right">컬러</th><th className="px-2 py-1 text-left">방식</th></tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-b border-[color:var(--tts-border)]/50">
              <td className="px-2 py-1.5">{new Date(r.collectedAt).toISOString().slice(0, 16).replace("T", " ")}</td>
              <td className="px-2 py-1.5 font-mono">{r.contract.contractNumber}</td>
              <td className="px-2 py-1.5 font-mono">{r.serialNumber}</td>
              <td className="px-2 py-1.5">{r.brand} {r.itemName}</td>
              <td className="px-2 py-1.5 text-right font-mono">{r.totalPages.toLocaleString()}</td>
              <td className="px-2 py-1.5 text-right font-mono">{r.bwPages?.toLocaleString() ?? "—"}</td>
              <td className="px-2 py-1.5 text-right font-mono">{r.colorPages?.toLocaleString() ?? "—"}</td>
              <td className="px-2 py-1.5"><Badge tone={r.collectedBy === "AGENT" ? "primary" : "neutral"}>{r.collectedBy}</Badge>{r.isCounterReset && <Badge tone="danger">⚠ 리셋</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function EquipmentTab() {
  const [items, setItems] = useState<any[]>([]);
  async function refetch() {
    const r = await fetch("/api/admin/snmp/equipment", { credentials: "same-origin" });
    const j = await r.json(); setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);
  async function generateToken(equipmentId: string) {
    if (!confirm("토큰을 새로 발급합니다. 이미 발급된 경우 기존 토큰은 무효화됩니다.")) return;
    const r = await fetch("/api/admin/snmp/generate-token", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ equipmentId }) });
    const j = await r.json();
    if (r.ok) { alert(`✅ 새 토큰: ${j.deviceToken}\n\n에이전트 config.json 에 등록하세요.`); refetch(); }
  }
  async function revokeToken(equipmentId: string) {
    if (!confirm("토큰을 즉시 폐기합니다. 해당 에이전트는 다음 전송부터 401 오류가 발생합니다.")) return;
    await fetch("/api/admin/snmp/revoke-token", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ equipmentId }) });
    refetch();
  }
  async function generatePackage(contractId: string) {
    const r = await fetch("/api/admin/snmp/generate-package", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ contractId }) });
    if (!r.ok) { alert("패키지 생성 실패"); return; }
    // Blob 다운로드
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `config-${contractId}.json`; a.click();
    URL.revokeObjectURL(url);
    refetch();
  }
  // 계약별 그룹화
  const byContract: Record<string, any[]> = {};
  items.forEach((it) => { (byContract[it.contractNumber] ||= []).push(it); });
  return (
    <Card title={`장비 토큰 — ${items.length}대`}>
      {Object.entries(byContract).map(([contractNumber, eqs]) => (
        <div key={contractNumber} className="mb-4 rounded border border-[color:var(--tts-border)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-mono font-bold text-[color:var(--tts-accent)]">{contractNumber}</div>
            <button onClick={() => generatePackage(eqs[0]?.id ? "TODO_contract_id_lookup" : "")} className="rounded bg-[color:var(--tts-accent)] px-3 py-1 text-[11px] font-bold text-white">📦 에이전트 패키지 다운로드</button>
          </div>
          <div className="text-[11px] text-[color:var(--tts-sub)] mb-2">{eqs[0]?.clientCode} · {eqs[0]?.clientName}</div>
          <table className="w-full text-[12px]">
            <thead className="border-b border-[color:var(--tts-border)] text-[10px] text-[color:var(--tts-sub)]">
              <tr><th className="px-1 text-left">S/N</th><th className="px-1 text-left">품목</th><th className="px-1 text-left">IP</th><th className="px-1 text-left">모델</th><th className="px-1 text-left">토큰</th><th className="px-1 text-left">마지막 수집</th><th className="px-1 text-right">액션</th></tr>
            </thead>
            <tbody>
              {eqs.map((eq) => (
                <tr key={eq.id} className="border-b border-[color:var(--tts-border)]/50">
                  <td className="px-1 py-1 font-mono">{eq.serialNumber}</td>
                  <td className="px-1 py-1">{eq.itemName}</td>
                  <td className="px-1 py-1 font-mono text-[11px]">{eq.deviceIp ?? "—"}</td>
                  <td className="px-1 py-1 font-mono text-[11px]">{eq.deviceModel ?? "—"}</td>
                  <td className="px-1 py-1">{eq.hasToken ? <Badge tone="success">활성</Badge> : eq.tokenRevokedAt ? <Badge tone="danger">폐기</Badge> : <Badge tone="warn">미발급</Badge>}</td>
                  <td className="px-1 py-1 text-[11px]">{eq.lastReadingAt ? new Date(eq.lastReadingAt).toISOString().slice(0, 10) : "—"}</td>
                  <td className="px-1 py-1 text-right whitespace-nowrap">
                    <button onClick={() => generateToken(eq.id)} className="mr-1 rounded bg-[color:var(--tts-warn)] px-2 py-0.5 text-[10px] text-white">🔑 발급</button>
                    {eq.hasToken && <button onClick={() => revokeToken(eq.id)} className="rounded border border-[color:var(--tts-danger)] px-2 py-0.5 text-[10px] text-[color:var(--tts-danger)]">폐기</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </Card>
  );
}
