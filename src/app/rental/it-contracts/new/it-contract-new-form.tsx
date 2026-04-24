"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, TextInput } from "@/components/ui";
import { CURRENCY_OPTIONS } from "@/lib/currency";

type Props = {
  sessionCompany: string; // TV 또는 VR — 계약번호 prefix 안내용
  clientOptions: { value: string; label: string }[];
};

type FormState = {
  clientId: string;
  installationAddress: string;
  startDate: string;
  endDate: string;
  deposit: string;
  installationFee: string;
  deliveryFee: string;
  additionalServiceFee: string;
  currency: "VND" | "USD" | "KRW" | "JPY" | "CNY";
  fxRate: string;
  contractMgrName: string;
  contractMgrPhone: string;
  contractMgrOffice: string;
  contractMgrEmail: string;
  technicalMgrName: string;
  technicalMgrPhone: string;
  technicalMgrOffice: string;
  technicalMgrEmail: string;
  financeMgrName: string;
  financeMgrPhone: string;
  financeMgrOffice: string;
  financeMgrEmail: string;
};

const initial: FormState = {
  clientId: "",
  installationAddress: "",
  startDate: "",
  endDate: "",
  deposit: "",
  installationFee: "",
  deliveryFee: "",
  additionalServiceFee: "",
  currency: "VND",
  fxRate: "1",
  contractMgrName: "",
  contractMgrPhone: "",
  contractMgrOffice: "",
  contractMgrEmail: "",
  technicalMgrName: "",
  technicalMgrPhone: "",
  technicalMgrOffice: "",
  technicalMgrEmail: "",
  financeMgrName: "",
  financeMgrPhone: "",
  financeMgrOffice: "",
  financeMgrEmail: "",
};

export function ItContractNewForm({ sessionCompany, clientOptions }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setValue((p) => ({ ...p, [k]: v }));

  const prefixPreview = sessionCompany === "TV" ? "TLS-" : "VRT-";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        clientId: value.clientId,
        installationAddress: value.installationAddress || null,
        startDate: value.startDate,
        endDate: value.endDate,
        status: "DRAFT",
        deposit: value.deposit || null,
        installationFee: value.installationFee || null,
        deliveryFee: value.deliveryFee || null,
        additionalServiceFee: value.additionalServiceFee || null,
        currency: value.currency,
        fxRate: value.fxRate || "1",
        contractMgrName: value.contractMgrName || null,
        contractMgrPhone: value.contractMgrPhone || null,
        contractMgrOffice: value.contractMgrOffice || null,
        contractMgrEmail: value.contractMgrEmail || null,
        technicalMgrName: value.technicalMgrName || null,
        technicalMgrPhone: value.technicalMgrPhone || null,
        technicalMgrOffice: value.technicalMgrOffice || null,
        technicalMgrEmail: value.technicalMgrEmail || null,
        financeMgrName: value.financeMgrName || null,
        financeMgrPhone: value.financeMgrPhone || null,
        financeMgrOffice: value.financeMgrOffice || null,
        financeMgrEmail: value.financeMgrEmail || null,
      };
      const res = await fetch("/api/rental/it-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string; reason?: string } };
        setError(data.details?.message ?? mapError(data.error, data.details?.reason));
        return;
      }
      const data = (await res.json()) as { contract: { id: string } };
      router.push(`/rental/it-contracts/${data.contract.id}`);
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
        계약번호는 저장 시 자동 생성됩니다 — 현재 세션 회사 기준{" "}
        <span className="font-mono">{prefixPreview}YYMMDD-###</span>.
        장비(S/N) 목록은 등록 후 상세 화면에서 추가합니다.
      </Note>

      <SectionTitle icon="📝" title="계약 기본" />
      <Row>
        <Field label="거래처" required>
          <Select
            required
            value={value.clientId}
            onChange={(e) => set("clientId", e.target.value)}
            placeholder="선택"
            options={clientOptions}
          />
        </Field>
      </Row>
      <Row>
        <Field label="설치 주소">
          <TextInput
            value={value.installationAddress}
            onChange={(e) => set("installationAddress", e.target.value)}
            placeholder="장비 설치 주소"
          />
        </Field>
      </Row>
      <Row>
        <Field label="렌탈 시작일" required width="200px">
          <TextInput
            type="date"
            required
            value={value.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </Field>
        <Field label="렌탈 종료일" required width="200px">
          <TextInput
            type="date"
            required
            value={value.endDate}
            onChange={(e) => set("endDate", e.target.value)}
          />
        </Field>
      </Row>

      <SectionTitle icon="💱" title="통화" />
      <Row>
        <Field label="통화" required width="200px">
          <Select
            required
            value={value.currency}
            onChange={(e) => set("currency", e.target.value as FormState["currency"])}
            options={CURRENCY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
          />
        </Field>
        <Field label="환율 (1 단위 → VND)" width="220px" hint={value.currency === "VND" ? "VND 는 기본 1" : `1 ${value.currency} = ? VND`}>
          <TextInput
            type="number"
            step="0.000001"
            min={0}
            value={value.fxRate}
            onChange={(e) => set("fxRate", e.target.value)}
            disabled={value.currency === "VND"}
          />
        </Field>
      </Row>

      <SectionTitle icon="💰" title={`금액 (${value.currency})`} />
      <Row>
        <Field label="보증금" width="200px">
          <TextInput
            type="number"
            value={value.deposit}
            onChange={(e) => set("deposit", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="설치비" width="200px">
          <TextInput
            type="number"
            value={value.installationFee}
            onChange={(e) => set("installationFee", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="배송비" width="200px">
          <TextInput
            type="number"
            value={value.deliveryFee}
            onChange={(e) => set("deliveryFee", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="부가서비스비" width="200px">
          <TextInput
            type="number"
            value={value.additionalServiceFee}
            onChange={(e) => set("additionalServiceFee", e.target.value)}
            placeholder="0"
          />
        </Field>
      </Row>

      <SectionTitle icon="📋" title="계약 담당자" />
      <ManagerBlock
        prefix="contractMgr"
        value={value}
        onChange={set}
      />

      <SectionTitle icon="🔧" title="기술 담당자" />
      <ManagerBlock
        prefix="technicalMgr"
        value={value}
        onChange={set}
      />

      <SectionTitle icon="💼" title="재경 담당자" />
      <ManagerBlock
        prefix="financeMgr"
        value={value}
        onChange={set}
      />

      {error && (
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : "계약 등록하고 상세 열기"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/rental/it-contracts")}>
          취소
        </Button>
      </div>
    </form>
  );
}

type ManagerPrefix = "contractMgr" | "technicalMgr" | "financeMgr";

function ManagerBlock({
  prefix,
  value,
  onChange,
}: {
  prefix: ManagerPrefix;
  value: FormState;
  onChange: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const nameKey = `${prefix}Name` as keyof FormState;
  const phoneKey = `${prefix}Phone` as keyof FormState;
  const officeKey = `${prefix}Office` as keyof FormState;
  const emailKey = `${prefix}Email` as keyof FormState;
  return (
    <Row>
      <Field label="이름">
        <TextInput value={value[nameKey]} onChange={(e) => onChange(nameKey, e.target.value)} />
      </Field>
      <Field label="휴대폰">
        <TextInput
          value={value[phoneKey]}
          onChange={(e) => onChange(phoneKey, e.target.value)}
          placeholder="0912-xxx-xxxx"
        />
      </Field>
      <Field label="사무실">
        <TextInput
          value={value[officeKey]}
          onChange={(e) => onChange(officeKey, e.target.value)}
          placeholder="024-xxxx-xxxx"
        />
      </Field>
      <Field label="이메일">
        <TextInput
          type="email"
          value={value[emailKey]}
          onChange={(e) => onChange(emailKey, e.target.value)}
        />
      </Field>
    </Row>
  );
}

function mapError(code: string | undefined, reason?: string): string {
  if (code === "invalid_input" && reason === "before_start") {
    return "종료일이 시작일보다 빠를 수 없습니다.";
  }
  switch (code) {
    case "invalid_client":
      return "선택한 거래처를 찾을 수 없습니다.";
    case "invalid_input":
      return "입력값이 올바르지 않습니다.";
    default:
      return "저장에 실패했습니다.";
  }
}
