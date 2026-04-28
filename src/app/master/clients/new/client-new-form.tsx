"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

// 거래처 최초 등록 폼 — 필수 정보만 받아 생성한 뒤, 상세 페이지로 이동해
// CRM 6탭에서 세부 정보를 입력한다.

export function ClientNewForm({ lang }: { lang: Lang }) {
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
        setError(data.details?.message ?? t("msg.clientRegFailed", lang));
        return;
      }
      const data = (await res.json()) as { client: { id: string } };
      router.push(`/master/clients/${data.client.id}`);
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">
        {t("note.clientAutoCode", lang)}
      </Note>

      <Row>
        <Field label={t("field.companyNameViLong", lang)} required>
          <TextInput
            required
            value={companyNameVi}
            onChange={(e) => setCompanyNameVi(e.target.value)}
            placeholder="CÔNG TY TNHH ..."
          />
        </Field>
        <Field label={t("field.companyNameEnOpt", lang)}>
          <TextInput
            value={companyNameEn}
            onChange={(e) => setCompanyNameEn(e.target.value)}
            placeholder="Company Ltd."
          />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.taxCodeMST", lang)} width="200px">
          <TextInput value={taxCode} onChange={(e) => setTaxCode(e.target.value)} placeholder="0123456789" />
        </Field>
        <Field label={t("field.phoneField", lang)}>
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024-xxxx-xxxx" />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.addrField", lang)}>
          <TextInput
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("placeholder.installAddr", lang)}
          />
        </Field>
      </Row>

      <Row>
        <Field label="거래처포탈 ID" width="240px">
          <TextInput value="(거래처코드 자동 발급)" readOnly disabled />
        </Field>
        <Field label="거래처포탈 비밀번호" width="240px">
          <TextInput value="1234" readOnly disabled />
        </Field>
      </Row>
      <Note tone="info">
        ⓘ 거래처 등록 시 포탈 계정이 자동 발급됩니다 — <b>ID = 거래처코드</b>, <b>비밀번호 = 1234</b>. 고객은 첫 로그인 시 비밀번호 변경 안내가 표시되며, 포탈에서 직접 변경할 수 있습니다. 분실 시 포인트 관리 → 거래처별 정책 탭에서 [🔑 1234 리셋] 가능.
      </Note>

      {error && (
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("action.saving", lang) : t("btn.clientCreateOpen", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/master/clients")}>
          {t("action.cancel", lang)}
        </Button>
      </div>
    </form>
  );
}
