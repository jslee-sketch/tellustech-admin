"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Row, Select, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Center = { id: string; code: string; name: string; centerType: string; projectType: string | null; isActive: boolean };
type Budget = { id: string; costCenterId: string; yearMonth: string; budgetAmount: number; actualAmount: number | null };

export function CostCentersClient({ centers, budgets, lang }: { centers: Center[]; budgets: Budget[]; lang: Lang }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", centerType: "DEPARTMENT", projectType: "" });
  const [budgetForm, setBudgetForm] = useState({ costCenterId: "", yearMonth: new Date().toISOString().slice(0, 7), budgetAmount: "0" });
  const [busy, setBusy] = useState(false);

  async function saveCenter() {
    setBusy(true);
    const r = await fetch("/api/finance/cost-centers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setBusy(false);
    if (r.ok) { setShowAdd(false); router.refresh(); } else alert("save failed");
  }
  async function saveBudget() {
    if (!budgetForm.costCenterId) return alert("select cost center");
    setBusy(true);
    const r = await fetch("/api/finance/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(budgetForm) });
    setBusy(false);
    if (r.ok) router.refresh(); else alert("save failed");
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-[14px] font-bold">{t("finance.costCenter", lang)} ({centers.length})</h2>
          <Button onClick={() => setShowAdd(!showAdd)}>+ {t("finance.costCenter", lang)}</Button>
        </div>
        {showAdd && (
          <div className="mb-3 rounded-md border border-[color:var(--tts-border)] p-3">
            <Row>
              <Field label="Code" required width="160px"><TextInput value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CC-SALES-HN" /></Field>
              <Field label="Name" required><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label={t("finance.centerType", lang)} required width="140px">
                <Select value={form.centerType} onChange={(e) => setForm({ ...form, centerType: e.target.value })} options={[
                  { value: "DEPARTMENT", label: t("finance.centerType.DEPARTMENT", lang) },
                  { value: "BRANCH", label: t("finance.centerType.BRANCH", lang) },
                  { value: "PROJECT", label: t("finance.centerType.PROJECT", lang) },
                ]} />
              </Field>
              <Field label="Project Type"><TextInput value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} placeholder="RENTAL_IT 등" /></Field>
            </Row>
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>cancel</Button>
              <Button onClick={saveCenter} disabled={busy}>save</Button>
            </div>
          </div>
        )}
        <table className="w-full text-[12px]">
          <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
            <tr><th className="py-2 text-left">Code</th><th className="text-left">Name</th><th className="text-left">{t("finance.centerType", lang)}</th><th className="text-left">Project Type</th></tr>
          </thead>
          <tbody>
            {centers.map((c) => (
              <tr key={c.id} className="border-b border-[color:var(--tts-border)]/50">
                <td className="py-2 font-mono">{c.code}</td>
                <td>{c.name}</td>
                <td>{t(`finance.centerType.${c.centerType}`, lang)}</td>
                <td className="font-mono text-[11px]">{c.projectType ?? "—"}</td>
              </tr>
            ))}
            {centers.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-[color:var(--tts-muted)]">no cost centers yet</td></tr>}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-[14px] font-bold">{t("finance.budget", lang)} ({budgets.length})</h2>
        <div className="mb-3 rounded-md border border-[color:var(--tts-border)] p-3">
          <Row>
            <Field label={t("finance.costCenter", lang)} required width="240px">
              <Select value={budgetForm.costCenterId} onChange={(e) => setBudgetForm({ ...budgetForm, costCenterId: e.target.value })} options={[
                { value: "", label: "선택" },
                ...centers.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` })),
              ]} />
            </Field>
            <Field label="Month" required width="140px"><TextInput value={budgetForm.yearMonth} onChange={(e) => setBudgetForm({ ...budgetForm, yearMonth: e.target.value })} placeholder="YYYY-MM" /></Field>
            <Field label={t("finance.budget", lang)} required><TextInput type="number" value={budgetForm.budgetAmount} onChange={(e) => setBudgetForm({ ...budgetForm, budgetAmount: e.target.value })} /></Field>
            <Field label=" " width="100px"><Button onClick={saveBudget} disabled={busy}>{busy ? "..." : "save"}</Button></Field>
          </Row>
        </div>
        <table className="w-full text-[12px]">
          <thead className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]">
            <tr><th className="py-2 text-left">Month</th><th className="text-left">{t("finance.costCenter", lang)}</th><th className="text-right">{t("finance.budget", lang)}</th><th className="text-right">{t("finance.budgetActual", lang)}</th><th className="text-right">{t("finance.budgetVariance", lang)}</th></tr>
          </thead>
          <tbody>
            {budgets.map((b) => {
              const cc = centers.find((c) => c.id === b.costCenterId);
              const variance = b.actualAmount !== null ? b.budgetAmount - b.actualAmount : null;
              return (
                <tr key={b.id} className="border-b border-[color:var(--tts-border)]/50">
                  <td className="py-2 font-mono">{b.yearMonth}</td>
                  <td className="text-[11px]">{cc ? `${cc.code} · ${cc.name}` : b.costCenterId}</td>
                  <td className="text-right font-mono">{b.budgetAmount.toLocaleString()}</td>
                  <td className="text-right font-mono">{b.actualAmount !== null ? b.actualAmount.toLocaleString() : "—"}</td>
                  <td className={`text-right font-mono ${variance === null ? "" : variance < 0 ? "text-rose-500" : "text-emerald-500"}`}>{variance !== null ? variance.toLocaleString() : "—"}</td>
                </tr>
              );
            })}
            {budgets.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-[color:var(--tts-muted)]">no budgets yet</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
