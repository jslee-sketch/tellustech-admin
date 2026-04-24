"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Button,
  Field,
  Note,
  Row,
  SectionTitle,
  Select,
  TextInput,
  Textarea,
} from "@/components/ui";

type TicketCore = {
  ticketNumber: string;
  clientLabel: string;
  clientAddress: string;
  status: string;
  receivedAt: string;
  completedAt: string;
  assignedToId: string;
  itemId: string;
  serialNumber: string;
  originalLang: string;
  symptomVi: string;
  symptomEn: string;
  symptomKo: string;
  receivableBlocked: boolean;
};

type Photo = { id: string; name: string; sizeBytes: number };
type Dispatch = { id: string; transportMethod: string; departedAt: string; completedAt: string };

type Props = {
  ticketId: string;
  initial: TicketCore;
  photos: Photo[];
  dispatches: Dispatch[];
  employeeOptions: { value: string; label: string }[];
};

export function AsTicketDetail({ ticketId, initial, photos: initialPhotos, dispatches, employeeOptions }: Props) {
  const router = useRouter();
  const [core, setCore] = useState<TicketCore>(initial);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof TicketCore>(k: K, v: TicketCore[K]) =>
    setCore((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/as-tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: core.status,
          assignedToId: core.assignedToId || null,
          serialNumber: core.serialNumber || null,
          originalLang: core.originalLang,
          symptomVi: core.symptomVi || null,
          symptomEn: core.symptomEn || null,
          symptomKo: core.symptomKo || null,
        }),
      });
      if (!res.ok) {
        setError("저장에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("이 AS 전표를 삭제하시겠습니까? 출동 이력이 있으면 실패합니다.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/as-tickets/${ticketId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { details?: { message?: string } };
        setError(body.details?.message ?? "삭제에 실패했습니다.");
        return;
      }
      router.push("/as/tickets");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "PHOTO");
      const upRes = await fetch("/api/files", { method: "POST", body: fd });
      if (!upRes.ok) {
        setError("사진 업로드에 실패했습니다.");
        return;
      }
      const data = (await upRes.json()) as { id: string; sizeBytes: number };
      const attach = await fetch(`/api/as-tickets/${ticketId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: data.id }),
      });
      if (!attach.ok) {
        setError("사진 연결에 실패했습니다.");
        return;
      }
      setPhotos((prev) => [...prev, { id: data.id, name: file.name, sizeBytes: data.sizeBytes ?? 0 }]);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto(fileId: string) {
    const res = await fetch(`/api/as-tickets/${ticketId}/photos/${fileId}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== fileId));
      router.refresh();
    }
  }

  const canDispatch = core.status !== "COMPLETED" && core.status !== "CANCELED";

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <SectionTitle icon="📋" title="기본 정보" />
      <Row>
        <Field label="AS 전표번호" width="180px">
          <TextInput value={core.ticketNumber} disabled />
        </Field>
        <Field label="거래처">
          <TextInput value={core.clientLabel} disabled />
        </Field>
        <Field label="상태" required width="160px">
          <Select
            required
            value={core.status}
            onChange={(e) => set("status", e.target.value)}
            options={[
              { value: "RECEIVED", label: "접수" },
              { value: "IN_PROGRESS", label: "처리중" },
              { value: "DISPATCHED", label: "출동중" },
              { value: "COMPLETED", label: "완료" },
              { value: "CANCELED", label: "취소" },
            ]}
          />
        </Field>
      </Row>
      {core.clientAddress && (
        <Row>
          <Field label="거래처 주소">
            <TextInput value={core.clientAddress} disabled />
          </Field>
        </Row>
      )}
      <Row>
        <Field label="접수 일시" width="220px">
          <TextInput type="datetime-local" value={core.receivedAt} disabled />
        </Field>
        {core.completedAt && (
          <Field label="완료 일시" width="220px">
            <TextInput type="datetime-local" value={core.completedAt} disabled />
          </Field>
        )}
        <Field label="AS 담당자">
          <Select
            value={core.assignedToId}
            onChange={(e) => set("assignedToId", e.target.value)}
            placeholder="미지정"
            options={employeeOptions}
          />
        </Field>
      </Row>
      <Row>
        <Field label="S/N">
          <TextInput value={core.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} />
        </Field>
      </Row>

      <SectionTitle icon="🗣️" title="증상" />
      <Row>
        <Field label="기본 언어" width="180px">
          <Select
            value={core.originalLang}
            onChange={(e) => set("originalLang", e.target.value)}
            options={[
              { value: "VI", label: "Tiếng Việt" },
              { value: "KO", label: "한국어" },
              { value: "EN", label: "English" },
            ]}
          />
        </Field>
      </Row>
      <Row>
        <Field label="증상 (VI)">
          <Textarea rows={3} value={core.symptomVi} onChange={(e) => set("symptomVi", e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="증상 (KO)">
          <Textarea rows={3} value={core.symptomKo} onChange={(e) => set("symptomKo", e.target.value)} />
        </Field>
        <Field label="증상 (EN)">
          <Textarea rows={3} value={core.symptomEn} onChange={(e) => set("symptomEn", e.target.value)} />
        </Field>
      </Row>

      <SectionTitle icon="📸" title={`증상 사진 (${photos.length}장)`} />
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] px-2 py-1 text-[12px]"
          >
            <Link href={`/api/files/${p.id}`} target="_blank" className="hover:underline">
              📄 {p.name}
            </Link>
            <span className="text-[11px] text-[color:var(--tts-muted)]">
              {(p.sizeBytes / 1024).toFixed(1)} KB
            </span>
            <button
              type="button"
              onClick={() => handleRemovePhoto(p.id)}
              className="text-[color:var(--tts-muted)] hover:text-[color:var(--tts-danger)]"
            >
              ×
            </button>
          </div>
        ))}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-1 text-[12px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
          {uploading ? "업로드 중..." : "📎 사진 추가"}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <SectionTitle icon="🚗" title={`출동 이력 (${dispatches.length}회)`} />
      {dispatches.length === 0 ? (
        <Note tone="info">출동 기록이 없습니다.</Note>
      ) : (
        <div className="space-y-2">
          {dispatches.map((d) => (
            <div
              key={d.id}
              className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3 text-[13px]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold">{d.transportMethod || "수단 미입력"}</span>
                  <span className="ml-3 text-[11px] text-[color:var(--tts-muted)]">
                    {d.departedAt || "—"} → {d.completedAt || "진행중"}
                  </span>
                </div>
                <Link href={`/as/dispatches/${d.id}`} className="text-[12px] text-[color:var(--tts-primary)] hover:underline">
                  상세 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      {canDispatch && (
        <div className="mt-3">
          <Link href={`/as/dispatches/new?ticket=${ticketId}`}>
            <Button type="button" variant="accent">
              🚗 새 출동 등록 (Phase 2 #3b)
            </Button>
          </Link>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={saving}>
          {saving ? "저장 중..." : "기본정보 저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/as/tickets")}>
          목록으로
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto"
        >
          {deleting ? "삭제 중..." : "AS 삭제"}
        </Button>
      </div>
    </form>
  );
}
