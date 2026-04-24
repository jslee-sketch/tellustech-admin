"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, TextInput, Textarea } from "@/components/ui";

type DispatchCore = {
  ticketId: string;
  ticketNumber: string;
  dispatchEmployeeId: string;
  transportMethod: string;
  originAddress: string;
  destinationAddress: string;
  googleDistanceKm: string;
  meterOcrKm: string;
  meterPhotoUrl: string;
  distanceMatch: boolean | null;
  transportCost: string;
  receiptFileId: string;
  receiptName: string;
  departedAt: string;
  arrivedAt: string;
  completedAt: string;
  note: string;
};

type Props = {
  dispatchId: string;
  initial: DispatchCore;
  employeeOptions: { value: string; label: string }[];
};

const TRANSPORT_OPTIONS = [
  { value: "company_car", label: "🚗 회사차량" },
  { value: "motorbike", label: "🏍️ 오토바이" },
  { value: "grab", label: "🚕 Grab" },
  { value: "taxi", label: "🚖 택시" },
];

export function DispatchDetail({ dispatchId, initial, employeeOptions }: Props) {
  const router = useRouter();
  const [core, setCore] = useState<DispatchCore>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof DispatchCore>(k: K, v: DispatchCore[K]) =>
    setCore((p) => ({ ...p, [k]: v }));

  async function uploadReplace(
    file: File,
    which: "meter" | "receipt",
  ): Promise<void> {
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/files", { method: "POST", body: fd });
    if (!up.ok) {
      setError("파일 업로드 실패");
      return;
    }
    const data = (await up.json()) as { id: string };
    if (which === "meter") {
      set("meterPhotoUrl", `/api/files/${data.id}`);
    } else {
      set("receiptFileId", data.id);
      set("receiptName", file.name);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/as-dispatches/${dispatchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatchEmployeeId: core.dispatchEmployeeId || null,
          transportMethod: core.transportMethod || null,
          originAddress: core.originAddress || null,
          destinationAddress: core.destinationAddress || null,
          googleDistanceKm: core.googleDistanceKm || null,
          meterOcrKm: core.meterOcrKm || null,
          meterPhotoUrl: core.meterPhotoUrl || null,
          transportCost: core.transportCost || null,
          receiptFileId: core.receiptFileId || null,
          departedAt: core.departedAt || null,
          arrivedAt: core.arrivedAt || null,
          completedAt: core.completedAt || null,
          note: core.note || null,
        }),
      });
      if (!res.ok) {
        setError("저장 실패");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("이 출동 기록을 삭제하시겠습니까?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/as-dispatches/${dispatchId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("삭제 실패");
        return;
      }
      router.push("/as/dispatches");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const gNum = Number(core.googleDistanceKm);
  const mNum = Number(core.meterOcrKm);
  const livePreview =
    Number.isFinite(gNum) && gNum > 0 && Number.isFinite(mNum) && mNum > 0
      ? Math.abs(mNum - gNum) <= gNum * 0.1
        ? "✅ 일치"
        : `⚠️ 불일치 (차이 ${Math.abs(mNum - gNum).toFixed(2)}km)`
      : core.distanceMatch === true
      ? "✅ 저장된 값: 일치"
      : core.distanceMatch === false
      ? "⚠️ 저장된 값: 불일치"
      : "—";

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <Note tone="info">
        AS 전표:{" "}
        <Link href={`/as/tickets/${core.ticketId}`} className="font-mono font-bold text-[color:var(--tts-primary)] hover:underline">
          {core.ticketNumber}
        </Link>
      </Note>

      <SectionTitle icon="🚗" title="출동 정보" />
      <Row>
        <Field label="출동자">
          <Select
            value={core.dispatchEmployeeId}
            onChange={(e) => set("dispatchEmployeeId", e.target.value)}
            placeholder="선택"
            options={employeeOptions}
          />
        </Field>
        <Field label="출동수단" width="220px">
          <Select
            value={core.transportMethod}
            onChange={(e) => set("transportMethod", e.target.value)}
            placeholder="선택"
            options={TRANSPORT_OPTIONS}
          />
        </Field>
      </Row>
      <Row>
        <Field label="출발 주소">
          <TextInput value={core.originAddress} onChange={(e) => set("originAddress", e.target.value)} />
        </Field>
        <Field label="도착 주소">
          <TextInput value={core.destinationAddress} onChange={(e) => set("destinationAddress", e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="Google 거리 (km)" width="180px">
          <TextInput
            type="number"
            step="0.01"
            value={core.googleDistanceKm}
            onChange={(e) => set("googleDistanceKm", e.target.value)}
          />
        </Field>
        <Field label="미터기 OCR (km)" width="180px">
          <TextInput
            type="number"
            step="0.01"
            value={core.meterOcrKm}
            onChange={(e) => set("meterOcrKm", e.target.value)}
          />
        </Field>
        <Field label="비교 결과">
          <div className="flex items-center pt-2 text-[12px]">{livePreview}</div>
        </Field>
      </Row>
      <Row>
        <Field label="미터기 사진">
          <div className="flex items-center gap-2">
            {core.meterPhotoUrl && (
              <Link href={core.meterPhotoUrl} target="_blank" className="text-[12px] text-[color:var(--tts-primary)] hover:underline">
                현재 사진 열기
              </Link>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-1 text-[12px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
              📎 {core.meterPhotoUrl ? "교체" : "업로드"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadReplace(f, "meter");
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </Field>
      </Row>

      <SectionTitle icon="💰" title="교통비 · 영수증" />
      <Row>
        <Field label="교통비 (VND)" width="200px">
          <TextInput
            type="number"
            value={core.transportCost}
            onChange={(e) => set("transportCost", e.target.value)}
          />
        </Field>
        <Field label="영수증">
          <div className="flex items-center gap-2">
            {core.receiptFileId && (
              <Link
                href={`/api/files/${core.receiptFileId}`}
                target="_blank"
                className="text-[12px] text-[color:var(--tts-primary)] hover:underline"
              >
                📄 {core.receiptName || "현재 영수증"}
              </Link>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-1 text-[12px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
              📎 {core.receiptFileId ? "교체" : "업로드"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadReplace(f, "receipt");
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </Field>
      </Row>

      <SectionTitle icon="🕐" title="시각" />
      <Row>
        <Field label="출발" width="220px">
          <TextInput type="datetime-local" value={core.departedAt} onChange={(e) => set("departedAt", e.target.value)} />
        </Field>
        <Field label="도착" width="220px">
          <TextInput type="datetime-local" value={core.arrivedAt} onChange={(e) => set("arrivedAt", e.target.value)} />
        </Field>
        <Field label="완료" width="220px">
          <TextInput type="datetime-local" value={core.completedAt} onChange={(e) => set("completedAt", e.target.value)} />
        </Field>
      </Row>

      <SectionTitle icon="📝" title="비고" />
      <Row>
        <Field label="메모">
          <Textarea value={core.note} onChange={(e) => set("note", e.target.value)} rows={2} />
        </Field>
      </Row>

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/as/dispatches")}>
          목록으로
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto"
        >
          {deleting ? "삭제 중..." : "출동 삭제"}
        </Button>
      </div>
    </form>
  );
}
