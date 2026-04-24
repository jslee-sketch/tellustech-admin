"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, TextInput, Textarea } from "@/components/ui";
import { CURRENCY_OPTIONS, formatCurrency } from "@/lib/currency";

type AllocDraft = { projectId: string; departmentId: string; basis: string; weight: string; amount: string };

type Option = { value: string; label: string };

export function ExpenseNewForm({
  projects,
  departments,
  salesOptions,
  purchaseOptions,
}: {
  projects: Option[];
  departments: Option[];
  salesOptions: Option[];
  purchaseOptions: Option[];
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
      if (expenseType === "SALES" && !linkedSalesId) { setError("매출 전표를 선택하세요."); return; }
      if (expenseType === "PURCHASE" && !linkedPurchaseId) { setError("매입 전표를 선택하세요."); return; }
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
      if (!res.ok) { setError("저장 실패"); return; }
      router.push("/finance/expenses"); router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">코드 자동 발급 <span className="font-mono">EXP-YYMMDD-###</span>. 원가 배분은 선택 — 프로젝트/부서별 수량·금액 기준 분배.</Note>
      <Row>
        <Field label="비용 구분" required width="180px">
          <Select required value={expenseType} onChange={(e) => setExpenseType(e.target.value)} options={[
            { value: "GENERAL", label: "일반" }, { value: "PURCHASE", label: "매입관련" }, { value: "SALES", label: "매출관련" },
          ]} />
        </Field>
        <Field label={`금액 (${currency})`} required width="200px"><TextInput type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="발생일" required width="200px"><TextInput type="date" required value={incurredAt} onChange={(e) => setIncurredAt(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label="통화" required width="200px">
          <Select
            required
            value={currency}
            onChange={(e) => setCurrency(e.target.value as typeof currency)}
            options={CURRENCY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
          />
        </Field>
        <Field label="환율 (1 단위 → VND)" width="200px" hint={currency === "VND" ? "VND 는 기본 1" : `1 ${currency} = ? VND`}>
          <TextInput type="number" step="0.000001" min={0} value={fxRate} onChange={(e) => setFxRate(e.target.value)} disabled={currency === "VND"} />
        </Field>
        {currency !== "VND" && (
          <Field label="≈ VND 환산" width="200px">
            <div className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] px-3 py-2 font-mono text-[13px] text-[color:var(--tts-sub)]">
              {formatCurrency(Number(amount) * Number(fxRate || 1), "VND")}
            </div>
          </Field>
        )}
      </Row>
      {expenseType === "SALES" && (
        <Row>
          <Field label="연결 매출 전표" required>
            {salesOptions.length === 0 ? (
              <div className="text-[12px] text-[color:var(--tts-muted)]">등록된 매출이 없습니다. 먼저 매출을 등록하세요.</div>
            ) : (
              <Select required value={linkedSalesId} onChange={(e) => setLinkedSalesId(e.target.value)} placeholder="매출번호 선택" options={salesOptions} />
            )}
          </Field>
        </Row>
      )}
      {expenseType === "PURCHASE" && (
        <Row>
          <Field label="연결 매입 전표" required>
            {purchaseOptions.length === 0 ? (
              <div className="text-[12px] text-[color:var(--tts-muted)]">등록된 매입이 없습니다. 먼저 매입을 등록하세요.</div>
            ) : (
              <Select required value={linkedPurchaseId} onChange={(e) => setLinkedPurchaseId(e.target.value)} placeholder="매입번호 선택" options={purchaseOptions} />
            )}
          </Field>
        </Row>
      )}

      <Row><Field label="비고"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field></Row>

      <SectionTitle icon="📊" title="원가 배분 (선택)" />
      {allocs.map((a, i) => (
        <div key={i} className="mb-2 flex gap-2 items-end rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-2">
          <Field label="프로젝트"><Select value={a.projectId} onChange={(e) => setA(i, "projectId", e.target.value)} placeholder="선택 안 함" options={projects} /></Field>
          <Field label="부서"><Select value={a.departmentId} onChange={(e) => setA(i, "departmentId", e.target.value)} placeholder="선택 안 함" options={departments} /></Field>
          <Field label="기준" width="120px"><Select value={a.basis} onChange={(e) => setA(i, "basis", e.target.value)} options={[{ value: "AMOUNT", label: "금액" }, { value: "QUANTITY", label: "수량" }]} /></Field>
          <Field label="비중" width="100px"><TextInput type="number" step="0.01" value={a.weight} onChange={(e) => setA(i, "weight", e.target.value)} /></Field>
          <Field label="금액" width="140px"><TextInput type="number" value={a.amount} onChange={(e) => setA(i, "amount", e.target.value)} /></Field>
          <Button type="button" size="sm" variant="ghost" onClick={() => rmAlloc(i)}>×</Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={addAlloc}>+ 원가 배분 행 추가</Button>

      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? "저장 중..." : "비용 등록"}</Button><Button type="button" variant="ghost" onClick={() => router.push("/finance/expenses")}>취소</Button></div>
    </form>
  );
}
