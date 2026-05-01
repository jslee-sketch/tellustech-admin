"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Tab = "models" | "readings" | "equipment";

export function SnmpAdminClient({ lang }: { lang: Lang }) {
  const [tab, setTab] = useState<Tab>("models");
  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-2xl font-extrabold">📡 {t("snmp.pageTitle", lang)}</h1>
        <div className="mb-4 flex gap-1 border-b border-[color:var(--tts-border)]">
          {([["models", "snmp.tabModels"], ["readings", "snmp.tabReadings"], ["equipment", "snmp.tabEquipment"]] as [Tab, string][]).map(([k, key]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-[13px] font-bold ${tab === k ? "border-b-2 border-[color:var(--tts-accent)] text-[color:var(--tts-accent)]" : "text-[color:var(--tts-muted)] hover:text-[color:var(--tts-text)]"}`}>
              {t(key, lang)}
            </button>
          ))}
        </div>
        {tab === "models" && <ModelsTab lang={lang} />}
        {tab === "readings" && <ReadingsTab lang={lang} />}
        {tab === "equipment" && <EquipmentTab lang={lang} />}
      </div>
    </main>
  );
}

function ModelsTab({ lang }: { lang: Lang }) {
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
    else alert(t("snmp.registerFailed", lang));
  }
  return (
    <Card title={t("snmp.modelTitle", lang).replace("{n}", String(items.length))}>
      <button onClick={() => setOpen(!open)} className="mb-3 rounded bg-[color:var(--tts-accent)] px-3 py-1.5 text-[12px] font-bold text-white">+ {t("snmp.addModel", lang)}</button>
      {open && (
        <div className="mb-3 grid grid-cols-2 gap-2 rounded border border-[color:var(--tts-border)] p-3">
          <input value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })} placeholder={t("snmp.deviceModelPh", lang)} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]" />
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder={t("snmp.brandPlaceholder", lang)} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]" />
          <input value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })} placeholder={t("snmp.modelNamePlaceholder", lang)} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px]" />
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={form.isMonoOnly} onChange={(e) => setForm({ ...form, isMonoOnly: e.target.checked })} /> {t("snmp.monoOnly", lang)}</label>
          <input value={form.oidTotal} onChange={(e) => setForm({ ...form, oidTotal: e.target.value })} placeholder="oidTotal" className="col-span-2 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px] font-mono" />
          <input value={form.oidBw} onChange={(e) => setForm({ ...form, oidBw: e.target.value })} placeholder={t("snmp.oidBwPh", lang)} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px] font-mono" />
          <input value={form.oidColor} onChange={(e) => setForm({ ...form, oidColor: e.target.value })} placeholder={t("snmp.oidColorPh", lang)} disabled={form.isMonoOnly} className="rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px] font-mono disabled:opacity-50" />
          <input value={form.oidSerial} onChange={(e) => setForm({ ...form, oidSerial: e.target.value })} placeholder="oidSerial" className="col-span-2 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-2 py-1 text-[12px] font-mono" />
          <button onClick={create} className="col-span-2 rounded bg-[color:var(--tts-accent)] px-3 py-1.5 text-[12px] font-bold text-white">{t("snmp.registerBtn", lang)}</button>
        </div>
      )}
      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
          <tr><th className="px-2 py-1 text-left">deviceModel</th><th className="px-2 py-1 text-left">{t("snmp.colBrand", lang)}</th><th className="px-2 py-1 text-left">{t("snmp.colModel", lang)}</th><th className="px-2 py-1 text-left">{t("snmp.colColor", lang)}</th><th className="px-2 py-1 text-left">oidTotal</th></tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id} className="border-b border-[color:var(--tts-border)]/50">
              <td className="px-2 py-1.5 font-mono">{m.deviceModel}</td>
              <td className="px-2 py-1.5">{m.brand}</td>
              <td className="px-2 py-1.5">{m.modelName}</td>
              <td className="px-2 py-1.5">{m.isMonoOnly ? `⚫ ${t("snmp.monoOnly", lang)}` : `🌈 ${t("snmp.colorTag", lang)}`}</td>
              <td className="px-2 py-1.5 font-mono text-[10px]">{m.oidTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function ReadingsTab({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/admin/snmp/readings", { credentials: "same-origin" }).then((r) => r.json()).then((j) => setItems(j?.items ?? []));
  }, []);
  return (
    <Card title={t("snmp.readingsTitle", lang).replace("{n}", String(items.length))}>
      <table className="w-full text-[12px]">
        <thead className="border-b border-[color:var(--tts-border)] text-[11px] text-[color:var(--tts-sub)]">
          <tr><th className="px-2 py-1 text-left">{t("snmp.colCollectedAt", lang)}</th><th className="px-2 py-1 text-left">{t("snmp.colContract", lang)}</th><th className="px-2 py-1 text-left">S/N</th><th className="px-2 py-1 text-left">{t("snmp.colModel", lang)}</th><th className="px-2 py-1 text-right">{t("snmp.colTotalPages", lang)}</th><th className="px-2 py-1 text-right">{t("snmp.colBw", lang)}</th><th className="px-2 py-1 text-right">{t("snmp.colColor", lang)}</th><th className="px-2 py-1 text-left">{t("snmp.colMethod", lang)}</th></tr>
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
              <td className="px-2 py-1.5"><Badge tone={r.collectedBy === "AGENT" ? "primary" : "neutral"}>{r.collectedBy}</Badge>{r.isCounterReset && <Badge tone="danger">⚠ {t("snmp.resetTag", lang)}</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function EquipmentTab({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<any[]>([]);
  async function refetch() {
    const r = await fetch("/api/admin/snmp/equipment", { credentials: "same-origin" });
    const j = await r.json(); setItems(j?.items ?? []);
  }
  useEffect(() => { refetch(); }, []);
  async function generateToken(equipmentId: string) {
    if (!confirm(t("snmp.tokenIssueConfirm", lang))) return;
    const r = await fetch("/api/admin/snmp/generate-token", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ equipmentId }) });
    const j = await r.json();
    if (r.ok) { alert(t("snmp.tokenIssueDone", lang).replace("{tk}", j.deviceToken)); refetch(); }
  }
  async function revokeToken(equipmentId: string) {
    if (!confirm(t("snmp.tokenRevokeConfirm", lang))) return;
    await fetch("/api/admin/snmp/revoke-token", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ equipmentId }) });
    refetch();
  }
  async function generatePackage(contractId: string) {
    const r = await fetch("/api/admin/snmp/generate-package", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ contractId }) });
    if (!r.ok) { alert(t("snmp.packageFailed", lang)); return; }
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
    <Card title={t("snmp.tokenTitle", lang).replace("{n}", String(items.length))}>
      {Object.entries(byContract).map(([contractNumber, eqs]) => (
        <div key={contractNumber} className="mb-4 rounded border border-[color:var(--tts-border)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-mono font-bold text-[color:var(--tts-accent)]">{contractNumber}</div>
            <button onClick={() => generatePackage(eqs[0]?.id ? "TODO_contract_id_lookup" : "")} className="rounded bg-[color:var(--tts-accent)] px-3 py-1 text-[11px] font-bold text-white">📦 {t("snmp.agentPackageDownload", lang)}</button>
          </div>
          <div className="text-[11px] text-[color:var(--tts-sub)] mb-2">{eqs[0]?.clientCode} · {eqs[0]?.clientName}</div>
          <table className="w-full text-[12px]">
            <thead className="border-b border-[color:var(--tts-border)] text-[10px] text-[color:var(--tts-sub)]">
              <tr><th className="px-1 text-left">S/N</th><th className="px-1 text-left">{t("snmp.colItem", lang)}</th><th className="px-1 text-left">IP</th><th className="px-1 text-left">{t("snmp.colModel", lang)}</th><th className="px-1 text-left">{t("snmp.colToken", lang)}</th><th className="px-1 text-left">{t("snmp.colLastReading", lang)}</th><th className="px-1 text-right">{t("snmp.colAction", lang)}</th></tr>
            </thead>
            <tbody>
              {eqs.map((eq) => (
                <tr key={eq.id} className="border-b border-[color:var(--tts-border)]/50">
                  <td className="px-1 py-1 font-mono">{eq.serialNumber}</td>
                  <td className="px-1 py-1">{eq.itemName}</td>
                  <td className="px-1 py-1 font-mono text-[11px]">{eq.deviceIp ?? "—"}</td>
                  <td className="px-1 py-1 font-mono text-[11px]">{eq.deviceModel ?? "—"}</td>
                  <td className="px-1 py-1">{eq.hasToken ? <Badge tone="success">{t("snmp.tagActive", lang)}</Badge> : eq.tokenRevokedAt ? <Badge tone="danger">{t("snmp.tagRevoked", lang)}</Badge> : <Badge tone="warn">{t("snmp.tagNotIssued", lang)}</Badge>}</td>
                  <td className="px-1 py-1 text-[11px]">{eq.lastReadingAt ? new Date(eq.lastReadingAt).toISOString().slice(0, 10) : "—"}</td>
                  <td className="px-1 py-1 text-right whitespace-nowrap">
                    <button onClick={() => generateToken(eq.id)} className="mr-1 rounded bg-[color:var(--tts-warn)] px-2 py-0.5 text-[10px] text-white">🔑 {t("snmp.issueShort", lang)}</button>
                    {eq.hasToken && <button onClick={() => revokeToken(eq.id)} className="rounded border border-[color:var(--tts-danger)] px-2 py-0.5 text-[10px] text-[color:var(--tts-danger)]">{t("snmp.tagRevoked", lang)}</button>}
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
