"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, TextInput } from "@/components/ui";

// 거래처 최초 등록 폼 — 필수 정보만 받아 생성한 뒤, 상세 페이지로 이동해
// CRM 6탭에서 세부 정보를 입력한다.

export function ClientNewForm() {
  const router = useRouter();
  const [companyNameVi, setCompanyNameVi] = useState("");
  const [companyNameEn, setCompanyNameEn] = useState("");
  const [phone, setPhone] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/master/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyNameVi,
          companyNameEn: companyNameEn || null,
          phone: phone || null,
          taxCode: taxCode || null,
          address: address || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(data.details?.message ?? "등록에 실패했습니다.");
        return;
      }
      const data = (await res.json()) as { client: { id: string } };
      router.push(`/master/clients/${data.client.id}`);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">
        거래처코드는 자동 생성됩니다 — 형식 <span className="font-mono">CL-YYMMDD-###</span>.
        등록 후 상세 페이지에서 계좌 · 담당자 · 영업관리 · 마케팅 정보를 편집할 수 있습니다.
      </Note>

      <Row>
        <Field label="거래처명 (베트남어)" required>
          <TextInput
            required
            value={companyNameVi}
            onChange={(e) => setCompanyNameVi(e.target.value)}
            placeholder="CÔNG TY TNHH ..."
          />
        </Field>
        <Field label="거래처명 (영어, 옵션)">
          <TextInput
            value={companyNameEn}
            onChange={(e) => setCompanyNameEn(e.target.value)}
            placeholder="Company Ltd."
          />
        </Field>
      </Row>
      <Row>
        <Field label="MST (사업자번호)" width="200px">
          <TextInput value={taxCode} onChange={(e) => setTaxCode(e.target.value)} placeholder="0123456789" />
        </Field>
        <Field label="전화번호">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024-xxxx-xxxx" />
        </Field>
      </Row>
      <Row>
        <Field label="주소">
          <TextInput
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="상세 주소"
          />
        </Field>
      </Row>

      {error && (
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : "거래처 등록하고 상세 열기"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/master/clients")}>
          취소
        </Button>
      </div>
    </form>
  );
}
