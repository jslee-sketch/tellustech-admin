"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, TextInput, Textarea } from "@/components/ui";

type Props = {
  ticket: {
    id: string;
    ticketNumber: string;
    clientLabel: string;
    destinationAddress: string;
    defaultDispatchEmployeeId: string;
  };
  employeeOptions: { value: string; label: string }[];
};

const TRANSPORT_OPTIONS = [
  { value: "company_car", label: "🚗 회사차량" },
  { value: "motorbike", label: "🏍️ 오토바이" },
  { value: "grab", label: "🚕 Grab" },
  { value: "taxi", label: "🚖 택시" },
];

export function DispatchNewForm({ ticket, employeeOptions }: Props) {
  const router = useRouter();
  const [dispatchEmployeeId, setDispatchEmployeeId] = useState(ticket.defaultDispatchEmployeeId);
  const [transportMethod, setTransportMethod] = useState("");
  const [originAddress, setOriginAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState(ticket.destinationAddress);
  const [googleDistanceKm, setGoogleDistanceKm] = useState("");
  const [meterOcrKm, setMeterOcrKm] = useState("");
  const [transportCost, setTransportCost] = useState("");
  const [departedAt, setDepartedAt] = useState("");
  const [arrivedAt, setArrivedAt] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [note, setNote] = useState("");

  const [meterPhotoUrl, setMeterPhotoUrl] = useState<string | null>(null);
  const [receiptFileId, setReceiptFileId] = useState<string | null>(null);
  const [meterPhotoName, setMeterPhotoName] = useState<string>("");
  const [receiptName, setReceiptName] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File): Promise<{ id: string; storedPath: string } | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/files", { method: "POST", body: fd });
    if (!res.ok) {
      setError("파일 업로드 실패");
      return null;
    }
    return res.json();
  }

  async function handleMeterPhoto(file: File) {
    const up = await uploadFile(file);
    if (up) {
      setMeterPhotoUrl(`/api/files/${up.id}`);
      setMeterPhotoName(file.name);
    }
  }
  async function handleReceipt(file: File) {
    const up = await uploadFile(file);
    if (up) {
      setReceiptFileId(up.id);
      setReceiptName(file.name);
    }
  }

  // 거리 자동비교 미리보기
  const gNum = Number(googleDistanceKm);
  const mNum = Number(meterOcrKm);
  const distancePreview =
    Number.isFinite(gNum) && gNum > 0 && Number.isFinite(mNum) && mNum > 0
      ? Math.abs(mNum - gNum) <= gNum * 0.1
        ? "✅ 일치 (10% 이내)"
        : `⚠️ 불일치 (차이 ${Math.abs(mNum - gNum).toFixed(2)}km)`
      : null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/as-dispatches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asTicketId: ticket.id,
          dispatchEmployeeId: dispatchEmployeeId || null,
          transportMethod: transportMethod || null,
          originAddress: originAddress || null,
          destinationAddress: destinationAddress || null,
          googleDistanceKm: googleDistanceKm || null,
          meterOcrKm: meterOcrKm || null,
          meterPhotoUrl: meterPhotoUrl || null,
          transportCost: transportCost || null,
          receiptFileId: receiptFileId || null,
          departedAt: departedAt || null,
          arrivedAt: arrivedAt || null,
          completedAt: completedAt || null,
          note: note || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ? `저장 실패: ${body.error}` : "저장 실패");
        return;
      }
      const data = (await res.json()) as { dispatch: { id: string } };
      router.push(`/as/dispatches/${data.dispatch.id}`);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">
        AS 전표: <span className="font-mono font-bold">{ticket.ticketNumber}</span> — {ticket.clientLabel}.
        저장 시 AS 상태가 <strong>DISPATCHED</strong> 로 자동 전환됩니다 (현재 접수/처리중인 경우).
      </Note>

      <SectionTitle icon="🚗" title="출동 수단 / 거리" />
      <Row>
        <Field label="출동자">
          <Select
            value={dispatchEmployeeId}
            onChange={(e) => setDispatchEmployeeId(e.target.value)}
            placeholder="선택"
            options={employeeOptions}
          />
        </Field>
        <Field label="출동수단" width="220px">
          <Select
            value={transportMethod}
            onChange={(e) => setTransportMethod(e.target.value)}
            placeholder="선택"
            options={TRANSPORT_OPTIONS}
          />
        </Field>
      </Row>
      <Row>
        <Field label="출발 주소 (사무실)">
          <TextInput value={originAddress} onChange={(e) => setOriginAddress(e.target.value)} placeholder="예: Tellustech Vina BN HQ" />
        </Field>
        <Field label="도착 주소 (설치지)">
          <TextInput value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="Google 거리 (km)" width="180px" hint="수동 입력 — API 연동은 후속">
          <TextInput
            type="number"
            step="0.01"
            value={googleDistanceKm}
            onChange={(e) => setGoogleDistanceKm(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label="미터기 OCR (km)" width="180px" hint="사진 OCR 연동은 후속">
          <TextInput
            type="number"
            step="0.01"
            value={meterOcrKm}
            onChange={(e) => setMeterOcrKm(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        {distancePreview && (
          <Field label="자동비교">
            <div className="flex items-center pt-2 text-[12px]">{distancePreview}</div>
          </Field>
        )}
      </Row>
      <Row>
        <Field label="미터기 사진">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
            📎 {meterPhotoName || "사진 선택"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleMeterPhoto(f);
                e.target.value = "";
              }}
            />
          </label>
        </Field>
      </Row>

      <SectionTitle icon="💰" title="교통비 / 영수증" />
      <Row>
        <Field label="교통비 (VND)" width="200px">
          <TextInput
            type="number"
            value={transportCost}
            onChange={(e) => setTransportCost(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="영수증 파일">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
            📎 {receiptName || "영수증 선택"}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleReceipt(f);
                e.target.value = "";
              }}
            />
          </label>
        </Field>
      </Row>

      <SectionTitle icon="🕐" title="시각" />
      <Row>
        <Field label="출발 일시" width="220px">
          <TextInput type="datetime-local" value={departedAt} onChange={(e) => setDepartedAt(e.target.value)} />
        </Field>
        <Field label="도착 일시" width="220px">
          <TextInput type="datetime-local" value={arrivedAt} onChange={(e) => setArrivedAt(e.target.value)} />
        </Field>
        <Field label="완료 일시" width="220px">
          <TextInput type="datetime-local" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} />
        </Field>
      </Row>

      <SectionTitle icon="📝" title="비고" />
      <Row>
        <Field label="메모">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
      </Row>

      {error && (
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : "출동 등록"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(`/as/tickets/${ticket.id}`)}>
          취소
        </Button>
      </div>
    </form>
  );
}
