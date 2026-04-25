"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, TextInput, Textarea } from "@/components/ui";
import { CURRENCY_OPTIONS, formatCurrency } from "@/lib/currency";
import { t, type Lang } from "@/lib/i18n";

type AllocDraft = { projectId: string; departmentId: string; basis: string; weight: string; amount: string };

type Option = { value: string; label: string };

export function ExpenseNewForm({
  projects,
  departments,
  salesOptions,
  purchaseOptions,
  lang,
}: {
  projects: Option[];
  departments: Option[];
  salesOptions: Option[];
  purchaseOptions: Option[];
  lang: Lang;
}) {
  const router = useRouter();
  const [expenseType, setExpenseType] = useState("GENERAL");
  const [amount, setAmount] = useState("0");
  const [currency, setCurrency] = useState<"VND" | "USD" | "KRW" | "JPY" | "CNY">("VND");
  const [fxRate, setFxRate] = useState("1");
  const [incurredAt, setIncurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [linkedSalesId, setLinkedSalesId] = useState("");
  const [linkedPurchaseId, setLinkedPurchaseId] = useState("");
  const [allocs, setAllocs] = useState<AllocDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addAlloc() { setAllocs((p) => [...p, { projectId: "", departmentId: "", basis: "AMOUNT", weight: "1", amount: "0" }]); }
  function rmAlloc(i: number) { setAllocs((p) => p.filter((_, x) => x !== i)); }
  function setA<K extends keyof AllocDraft>(i: number, k: K, v: AllocDraft[K]) {
    setAllocs((p) => p.map((a, x) => x === i ? { ...a, [k]: v } : a));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSubmitting(true); setError(null);
    try {
      if (expenseType === "SALES" && !linkedSalesId) { setError(t("msg.salesRequired", lang)); return; }
      if (expenseType === "PURCHASE" && !linkedPurchaseId) { setError(t("msg.purchaseRequired", lang)); return; }
      const res = await fetch("/api/finance/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseType, amount, currency, fxRate, incurredAt, note: note || null,
          linkedSalesId: expenseType === "SALES" ? linkedSalesId : null,
          linkedPurchaseId: expenseType === "PURCHASE" ? linkedPurchaseId : null,
          allocations: allocs.map((a) => ({
            projectId: a.projectId || null,
            departmentId: a.departmentId || null,
            basis: a.basis,
            weight: a.weight,
            amount: a.amount,
          })),
        }),
      });
      if (!res.ok) { setError(t("msg.saveFailedShort", lang)); return; }
      router.push("/finance/expenses"); router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">{t("note.expenseAuto", lang)}<span className="font-mono">EXP-YYMMDD-###</span>{t("note.expenseAutoSuffix", lang)}</Note>
      <Row>
        <Field label={t("field.expenseType", lang)} required width="180px">
          <Select required value={expenseType} onChange={(e) => setExpenseType(e.target.value)} options={[
            { value: "GENERAL", label: t("expenseType.general", lang) },
            { value: "PURCHASE", label: t("expenseType.purchase", lang) },
            { value: "SALES", label: t("expenseType.sales", lang) },
            { value: "TRANSPORT", label: t("expenseType.transport", lang) },
            { value: "MEAL", label: t("expenseType.meal", lang) },
            { value: "ENTERTAINMENT", label: t("expenseType.entertainment", lang) },
            { value: "RENT", label: t("expenseType.rent", lang) },
            { value: "UTILITY", label: t("expenseType.utility", lang) },
            { value: "OTHER", label: t("expenseType.other", lang) },
          ]} />
        </Field>
        <Field label={t("field.amountCurrency", lang).replace("{currency}", currency)} required width="200px"><TextInput type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label={t("field.incurredAt", lang)} required width="200px"><TextInput type="date" required value={incurredAt} onChange={(e) => setIncurredAt(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={t("field.currency", lang)} required width="200px">
          <Select
            required
            value={currency}
            onChange={(e) => setCurrency(e.target.value as typeof currency)}
            options={CURRENCY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
          />
        </Field>
        <Field label={t("field.fxRate", lang)} width="200px" hint={currency === "VND" ? t("hint.fxRateVndDefault", lang) : t("hint.fxRateConversion", lang).replace("{currency}", currency)}>
          <TextInput type="number" step="0.000001" min={0} value={fxRate} onChange={(e) => setFxRate(e.target.value)} disabled={currency === "VND"} />
        </Field>
        {currency !== "VND" && (
          <Field label={t("field.fxConvert", lang)} width="200px">
            <div className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] px-3 py-2 font-mono text-[13px] text-[color:var(--tts-sub)]">
              {formatCurrency(Number(amount) * Number(fxRate || 1), "VND")}
            </div>
          </Field>
        )}
      </Row>
      {expenseType === "SALES" && (
        <Row>
          <Field label={t("field.linkedSales", lang)} required>
            {salesOptions.length === 0 ? (
              <div className="text-[12px] text-[color:var(--tts-muted)]">{t("msg.noSalesYet", lang)}</div>
            ) : (
              <Select required value={linkedSalesId} onChange={(e) => setLinkedSalesId(e.target.value)} placeholder={t("placeholder.salesPick", lang)} options={salesOptions} />
            )}
          </Field>
        </Row>
      )}
      {expenseType === "PURCHASE" && (
        <Row>
          <Field label={t("field.linkedPurchase", lang)} required>
            {purchaseOptions.length === 0 ? (
              <div className="text-[12px] text-[color:var(--tts-muted)]">{t("msg.noPurchaseYet", lang)}</div>
            ) : (
              <Select required value={linkedPurchaseId} onChange={(e) => setLinkedPurchaseId(e.target.value)} placeholder={t("placeholder.purchasePick", lang)} options={purchaseOptions} />
            )}
          </Field>
        </Row>
      )}

      <Row><Field label={t("field.note", lang)}><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field></Row>

      <SectionTitle icon="📊" title={t("section.costAlloc", lang)} />
      {allocs.map((a, i) => (
        <div key={i} className="mb-2 flex gap-2 items-end rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-2">
          <Field label={t("field.project", lang)}><Select value={a.projectId} onChange={(e) => setA(i, "projectId", e.target.value)} placeholder={t("placeholder.notSelected", lang)} options={projects} /></Field>
          <Field label={t("field.department", lang)}><Select value={a.departmentId} onChange={(e) => setA(i, "departmentId", e.target.value)} placeholder={t("placeholder.notSelected", lang)} options={departments} /></Field>
          <Field label={t("field.basis", lang)} width="120px"><Select value={a.basis} onChange={(e) => setA(i, "basis", e.target.value)} options={[{ value: "AMOUNT", label: t("basis.amount", lang) }, { value: "QUANTITY", label: t("basis.quantity", lang) }]} /></Field>
          <Field label={t("field.weight", lang)} width="100px"><TextInput type="number" step="0.01" value={a.weight} onChange={(e) => setA(i, "weight", e.target.value)} /></Field>
          <Field label={t("field.amount", lang)} width="140px"><TextInput type="number" value={a.amount} onChange={(e) => setA(i, "amount", e.target.value)} /></Field>
          <Button type="button" size="sm" variant="ghost" onClick={() => rmAlloc(i)}>×</Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={addAlloc}>{t("btn.addAllocRow", lang)}</Button>

      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? t("action.saving", lang) : t("btn.expenseSubmit", lang)}</Button><Button type="button" variant="ghost" onClick={() => router.push("/finance/expenses")}>{t("action.cancel", lang)}</Button></div>
    </form>
  );
}
