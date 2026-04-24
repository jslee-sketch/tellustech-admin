"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Badge,
  Button,
  Field,
  Note,
  Row,
  SectionTitle,
  Select,
  TextInput,
  Textarea,
} from "@/components/ui";

type ClientOption = { id: string; label: string; receivableStatus: string };

type Props = {
  defaultLanguage: string; // "VI" | "EN" | "KO"
  clients: ClientOption[];
  itemOptions: { value: string; label: string }[];
  employeeOptions: { value: string; label: string }[];
};

type UploadedPhoto = { fileId: string; name: string; sizeBytes: number };

export function AsTicketNewForm({ defaultLanguage, clients, itemOptions, employeeOptions }: Props) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [itemId, setItemId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [originalLang, setOriginalLang] = useState(defaultLanguage || "VI");
  const [symptomVi, setSymptomVi] = useState("");
  const [symptomEn, setSymptomEn] = useState("");
  const [symptomKo, setSymptomKo] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === clientId);
  const isBlocked = selectedClient?.receivableStatus === "BLOCKED";
  const isWarning = selectedClient?.receivableStatus === "WARNING";

  async function handlePhotoSelect(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "PHOTO");
      const res = await fetch("/api/files", { method: "POST", body: fd });
      if (!res.ok) {
        setError("사진 업로드에 실패했습니다.");
        return;
      }
      const data = (await res.json()) as { id: string; sizeBytes: number };
      setPhotos((prev) => [...prev, { fileId: data.id, name: file.name, sizeBytes: data.sizeBytes ?? 0 }]);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(fileId: string) {
    setPhotos((prev) => prev.filter((p) => p.fileId !== fileId));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/as-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          itemId: itemId || null,
          serialNumber: serialNumber || null,
          assignedToId: assignedToId || null,
          originalLang,
          symptomVi: symptomVi || null,
          symptomEn: symptomEn || null,
          symptomKo: symptomKo || null,
          photoIds: photos.map((p) => p.fileId),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; details?: { field?: string; reason?: string } };
        setError(mapError(body.error, body.details));
        return;
      }
      const data = (await res.json()) as { ticket: { id: string }; warning: string | null };
      router.push(`/as/tickets/${data.ticket.id}`);
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
        AS 전표번호는 저장 시 <span className="font-mono">YY/MM/DD-##</span> 로 자동 발급됩니다. S/N 은 느슨 확인
        (자사 재고에 없어도 접수 가능).
      </Note>

      <SectionTitle icon="🏢" title="거래처 / 장비" />
      <Row>
        <Field label="거래처" required>
          <Select
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="선택"
            options={clients.map((c) => ({ value: c.id, label: c.label }))}
          />
        </Field>
        <Field label="AS 담당자">
          <Select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            placeholder="미지정"
            options={employeeOptions}
          />
        </Field>
      </Row>

      {isBlocked && (
        <div className="my-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[13px] font-semibold text-[color:var(--tts-danger)]">
          ⚠️ 이 거래처는 <Badge tone="danger">미수금 차단</Badge> 상태입니다. 접수는 가능하지만 <strong>실제 서비스 제공 전</strong>에
          재경 팀과 확인이 필요합니다. 티켓에 자동으로 차단 플래그가 기록됩니다.
        </div>
      )}
      {isWarning && (
        <div className="my-3 rounded-md bg-[color:var(--tts-warn-dim)] px-3 py-2 text-[13px] text-[color:var(--tts-warn)]">
          ⚠️ 이 거래처는 미수금 <strong>경고</strong> 상태입니다. 접수는 가능하지만 추가 청구 시 주의.
        </div>
      )}

      <Row>
        <Field label="장비 품목 (옵션)">
          <Select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            placeholder="선택 안 함"
            options={itemOptions}
          />
        </Field>
        <Field label="S/N" hint="S/N 재고확인 = 느슨 (자사 재고 아니어도 OK)">
          <TextInput
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="예: SL-X7500-ABC123"
          />
        </Field>
      </Row>

      <SectionTitle icon="🗣️" title="증상 (다국어)" />
      <Note tone="info">
        아무 언어로나 입력하세요. 최소 1개 필수. Claude API 연동 후 저장 시 나머지 언어 자동 번역됩니다
        (Phase 1-5 연기).
      </Note>
      <Row>
        <Field label="기본 언어" required width="180px">
          <Select
            required
            value={originalLang}
            onChange={(e) => setOriginalLang(e.target.value)}
            options={[
              { value: "VI", label: "Tiếng Việt" },
              { value: "KO", label: "한국어" },
              { value: "EN", label: "English" },
            ]}
          />
        </Field>
      </Row>
      <Row>
        <Field label="증상 (베트남어)">
          <Textarea
            rows={3}
            value={symptomVi}
            onChange={(e) => setSymptomVi(e.target.value)}
            placeholder="Máy bị kẹt giấy ..."
          />
        </Field>
      </Row>
      <Row>
        <Field label="증상 (한국어)">
          <Textarea
            rows={3}
            value={symptomKo}
            onChange={(e) => setSymptomKo(e.target.value)}
            placeholder="용지가 걸림 ..."
          />
        </Field>
        <Field label="증상 (영어)">
          <Textarea
            rows={3}
            value={symptomEn}
            onChange={(e) => setSymptomEn(e.target.value)}
            placeholder="Paper jam ..."
          />
        </Field>
      </Row>

      <SectionTitle icon="📸" title="증상 사진" />
      <Row>
        <Field label={uploading ? "업로드 중..." : "사진 추가"}>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
            📎 파일 선택
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhotoSelect(f);
                e.target.value = "";
              }}
            />
          </label>
        </Field>
      </Row>
      {photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((p) => (
            <div
              key={p.fileId}
              className="flex items-center gap-2 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] px-2 py-1 text-[12px]"
            >
              <span>📄 {p.name}</span>
              <button
                type="button"
                onClick={() => removePhoto(p.fileId)}
                className="text-[color:var(--tts-muted)] hover:text-[color:var(--tts-danger)]"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : "AS 접수하고 상세 열기"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/as/tickets")}>
          취소
        </Button>
      </div>
    </form>
  );
}

function mapError(code: string | undefined, details?: { field?: string; reason?: string }): string {
  if (code === "invalid_input" && details?.field === "symptom" && details?.reason === "required_at_least_one") {
    return "증상을 최소 한 언어로 입력해 주세요.";
  }
  switch (code) {
    case "invalid_client":
      return "선택한 거래처가 존재하지 않습니다.";
    case "invalid_assignee":
      return "선택한 AS 담당자가 존재하지 않습니다.";
    case "invalid_item":
      return "선택한 장비가 존재하지 않습니다.";
    case "invalid_photo_ids":
      return "업로드된 사진 중 일부가 서버에 없습니다.";
    default:
      return "저장에 실패했습니다.";
  }
}
