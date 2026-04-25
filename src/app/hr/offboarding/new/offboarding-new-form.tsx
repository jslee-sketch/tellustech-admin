"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, SignatureCanvas, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export function OffboardingNewForm({ employees, lang }: { employees: { value: string; label: string }[]; lang: Lang }) {
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
      const toObj = (txt: string) => (txt ? { text: txt } : null);
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
      if (!res.ok) { setError(body.details?.message ?? t("msg.saveFailedGeneric", lang)); return; }
      router.push("/hr/offboarding"); router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">{t("note.offboardingAuto", lang)}<span className="font-mono">OFF-YYMMDD-###</span>{t("note.offboardingAutoSuffix", lang)}</Note>
      <Row><Field label={t("label.empLabel", lang)} required><Select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder={t("placeholder.select", lang)} options={employees} /></Field></Row>
      <SectionTitle icon="📦" title={t("section.returnedItems", lang)} />
      <Textarea rows={3} value={returnedItems} onChange={(e) => setReturnedItems(e.target.value)} />
      <SectionTitle icon="💸" title={t("section.paidItems", lang)} />
      <Textarea rows={3} value={paidItems} onChange={(e) => setPaidItems(e.target.value)} />
      <SectionTitle icon="🛑" title={t("section.stoppedItems", lang)} />
      <Textarea rows={3} value={stoppedItems} onChange={(e) => setStoppedItems(e.target.value)} />
      <SectionTitle icon="📄" title={t("section.issuedItems", lang)} />
      <Textarea rows={3} value={issuedItems} onChange={(e) => setIssuedItems(e.target.value)} />

      <SectionTitle icon="✍️" title={t("section.hrSig", lang)} />
      <SignatureCanvas value={hrSig} onChange={setHrSig} />
      <SectionTitle icon="✍️" title={t("section.acctSig", lang)} />
      <SignatureCanvas value={acctSig} onChange={setAcctSig} />
      <SectionTitle icon="✍️" title={t("section.empSig", lang)} />
      <SignatureCanvas value={empSig} onChange={setEmpSig} />

      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? t("action.saving", lang) : t("btn.offboardingRegister", lang)}</Button><Button type="button" variant="ghost" onClick={() => router.push("/hr/offboarding")}>{t("action.cancel", lang)}</Button></div>
    </form>
  );
}
