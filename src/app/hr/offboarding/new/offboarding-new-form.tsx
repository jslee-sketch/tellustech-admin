"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, SignatureCanvas, Textarea } from "@/components/ui";

export function OffboardingNewForm({ employees }: { employees: { value: string; label: string }[] }) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [returnedItems, setReturnedItems] = useState("");
  const [paidItems, setPaidItems] = useState("");
  const [stoppedItems, setStoppedItems] = useState("");
  const [issuedItems, setIssuedItems] = useState("");
  const [hrSig, setHrSig] = useState<string | null>(null);
  const [acctSig, setAcctSig] = useState<string | null>(null);
  const [empSig, setEmpSig] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSubmitting(true); setError(null);
    try {
      const toObj = (t: string) => (t ? { text: t } : null);
      const res = await fetch("/api/hr/offboarding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          returnedItems: toObj(returnedItems),
          paidItems: toObj(paidItems),
          stoppedItems: toObj(stoppedItems),
          issuedItems: toObj(issuedItems),
          hrSignature: hrSig, accountingSignature: acctSig, employeeSignature: empSig,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.details?.message ?? "저장 실패"); return; }
      router.push("/hr/offboarding"); router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">코드 자동 발급 <span className="font-mono">OFF-YYMMDD-###</span>. 각 체크리스트는 자유 서술로 기재.</Note>
      <Row><Field label="직원" required><Select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="선택" options={employees} /></Field></Row>
      <SectionTitle icon="📦" title="반납 (노트북, 사원증, 열쇠 등)" />
      <Textarea rows={3} value={returnedItems} onChange={(e) => setReturnedItems(e.target.value)} />
      <SectionTitle icon="💸" title="지급 (미지급 급여, 퇴직금, 연차 정산)" />
      <Textarea rows={3} value={paidItems} onChange={(e) => setPaidItems(e.target.value)} />
      <SectionTitle icon="🛑" title="중지 (계정 · 권한 · 이메일 · VPN)" />
      <Textarea rows={3} value={stoppedItems} onChange={(e) => setStoppedItems(e.target.value)} />
      <SectionTitle icon="📄" title="발급 (재직증명서 · 경력증명서)" />
      <Textarea rows={3} value={issuedItems} onChange={(e) => setIssuedItems(e.target.value)} />

      <SectionTitle icon="✍️" title="인사팀 서명" />
      <SignatureCanvas value={hrSig} onChange={setHrSig} />
      <SectionTitle icon="✍️" title="회계팀 서명" />
      <SignatureCanvas value={acctSig} onChange={setAcctSig} />
      <SectionTitle icon="✍️" title="퇴사자 서명" />
      <SignatureCanvas value={empSig} onChange={setEmpSig} />

      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? "저장 중..." : "퇴사카드 등록"}</Button><Button type="button" variant="ghost" onClick={() => router.push("/hr/offboarding")}>취소</Button></div>
    </form>
  );
}
