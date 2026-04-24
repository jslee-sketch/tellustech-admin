"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, TextInput } from "@/components/ui";
import { CURRENCY_OPTIONS } from "@/lib/currency";

type ClientOption = { id: string; label: string; address: string };

type Props = { clients: ClientOption[] };

type FormState = {
  clientId: string;
  contractNumber: string;
  address: string;
  startDate: string;
  endDate: string;
  currency: "VND" | "USD" | "KRW" | "JPY" | "CNY";
  fxRate: string;
  contractMgrName: string;
  contractMgrPhone: string;
  contractMgrEmail: string;
  technicalMgrName: string;
  technicalMgrPhone: string;
  technicalMgrEmail: string;
  financeMgrName: string;
  financeMgrPhone: string;
  financeMgrEmail: string;
};

const initial: FormState = {
  clientId: "",
  contractNumber: "",
  address: "",
  startDate: "",
  endDate: "",
  currency: "VND",
  fxRate: "1",
  contractMgrName: "",
  contractMgrPhone: "",
  contractMgrEmail: "",
  technicalMgrName: "",
  technicalMgrPhone: "",
  technicalMgrEmail: "",
  financeMgrName: "",
  financeMgrPhone: "",
  financeMgrEmail: "",
};

export function TmRentalNewForm({ clients }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setValue((p) => ({ ...p, [k]: v }));

  function onClientChange(next: string) {
    const c = clients.find((x) => x.id === next);
    setValue((p) => ({
      ...p,
      clientId: next,
      // 주소 미입력이면 거래처 주소 자동 채움
      address: p.address || (c?.address ?? ""),
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/rental/tm-rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...value,
          contractNumber: value.contractNumber || null,
          address: value.address || null,
          items: [], // 품목은 저장 후 상세에서 추가
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string; reason?: string } };
        setError(body.details?.message ?? mapError(body.error, body.details?.reason));
        return;
      }
      const data = (await res.json()) as { rental: { id: string } };
      router.push(`/rental/tm-rentals/${data.rental.id}`);
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
        TM 렌탈번호는 저장 시 <span className="font-mono">TM-YYMMDD-###</span> 로 자동 발급됩니다. 품목 목록(매출/매입/이익)은
        등록 후 상세 화면에서 추가합니다.
      </Note>

      <SectionTitle icon="🏢" title="기본 정보" />
      <Row>
        <Field label="거래처" required>
          <Select
            required
            value={value.clientId}
            onChange={(e) => onClientChange(e.target.value)}
            placeholder="선택"
            options={clients.map((c) => ({ value: c.id, label: c.label }))}
          />
        </Field>
        <Field label="계약번호 (옵션)" width="220px">
          <TextInput
            value={value.contractNumber}
            onChange={(e) => set("contractNumber", e.target.value)}
            placeholder="계약서 번호"
          />
        </Field>
      </Row>
      <Row>
        <Field label="주소">
          <TextInput
            value={value.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="설치/사용 주소"
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

      <SectionTitle icon="📋" title="계약 담당자" />
      <MgrBlock prefix="contractMgr" value={value} set={set} />

      <SectionTitle icon="🔧" title="기술 담당자" />
      <MgrBlock prefix="technicalMgr" value={value} set={set} />

      <SectionTitle icon="💼" title="재경 담당자" />
      <MgrBlock prefix="financeMgr" value={value} set={set} />

      {error && (
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : "등록하고 상세 열기"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/rental/tm-rentals")}>
          취소
        </Button>
      </div>
    </form>
  );
}

function MgrBlock({
  prefix,
  value,
  set,
}: {
  prefix: "contractMgr" | "technicalMgr" | "financeMgr";
  value: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const nameK = `${prefix}Name` as keyof FormState;
  const phoneK = `${prefix}Phone` as keyof FormState;
  const emailK = `${prefix}Email` as keyof FormState;
  return (
    <Row>
      <Field label="이름">
        <TextInput value={value[nameK]} onChange={(e) => set(nameK, e.target.value)} />
      </Field>
      <Field label="휴대폰">
        <TextInput value={value[phoneK]} onChange={(e) => set(phoneK, e.target.value)} />
      </Field>
      <Field label="이메일">
        <TextInput type="email" value={value[emailK]} onChange={(e) => set(emailK, e.target.value)} />
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
      return "선택한 거래처가 존재하지 않습니다.";
    default:
      return "저장에 실패했습니다.";
  }
}
