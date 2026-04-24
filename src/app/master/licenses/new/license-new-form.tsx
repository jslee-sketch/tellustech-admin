"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput } from "@/components/ui";

export function LicenseNewForm({ employeeOptions }: { employeeOptions: { value: string; label: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState({
    name: "", ownerEmployeeId: "", acquiredAt: "", expiresAt: "",
    renewalCost: "", alertBeforeDays: "30",
  });
  const set = <K extends keyof typeof v>(k: K, val: typeof v[K]) => setV((p) => ({ ...p, [k]: val }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/master/licenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name,
          ownerEmployeeId: v.ownerEmployeeId || null,
          acquiredAt: v.acquiredAt, expiresAt: v.expiresAt,
          renewalCost: v.renewalCost || null,
          alertBeforeDays: v.alertBeforeDays,
        }),
      });
      if (!res.ok) { setError("저장 실패"); return; }
      router.push("/master/licenses"); router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">코드는 저장 시 <span className="font-mono">LIC-YYMMDD-###</span> 자동 발급.</Note>
      <Row>
        <Field label="라이선스명" required><TextInput required value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="예: ISO 9001, 법인 인감 등록" /></Field>
        <Field label="담당자" width="260px">
          <Select value={v.ownerEmployeeId} onChange={(e) => set("ownerEmployeeId", e.target.value)} placeholder="선택 안 함" options={employeeOptions} />
        </Field>
      </Row>
      <Row>
        <Field label="취득일" required width="200px"><TextInput type="date" required value={v.acquiredAt} onChange={(e) => set("acquiredAt", e.target.value)} /></Field>
        <Field label="만료일" required width="200px"><TextInput type="date" required value={v.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} /></Field>
        <Field label="사전알림 (일)" width="160px"><TextInput type="number" value={v.alertBeforeDays} onChange={(e) => set("alertBeforeDays", e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label="갱신 비용 (VND, 옵션)" width="240px"><TextInput type="number" value={v.renewalCost} onChange={(e) => set("renewalCost", e.target.value)} /></Field>
      </Row>
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? "저장 중..." : "라이선스 등록"}</Button><Button type="button" variant="ghost" onClick={() => router.push("/master/licenses")}>취소</Button></div>
    </form>
  );
}
