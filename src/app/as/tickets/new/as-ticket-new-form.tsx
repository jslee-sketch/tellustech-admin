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
import { t, type Lang } from "@/lib/i18n";

type ClientOption = { id: string; label: string; receivableStatus: string };

type Props = {
  defaultLanguage: string; // "VI" | "EN" | "KO"
  clients: ClientOption[];
  itemOptions: { value: string; label: string }[];
  employeeOptions: { value: string; label: string }[];
  lang: Lang;
};

type UploadedPhoto = { fileId: string; name: string; sizeBytes: number };

export function AsTicketNewForm({ defaultLanguage, clients, itemOptions, employeeOptions, lang }: Props) {
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
        setError(t("msg.photoUploadFailed", lang));
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
        setError(mapError(body.error, body.details, lang));
        return;
      }
      const data = (await res.json()) as { ticket: { id: string }; warning: string | null };
      router.push(`/as/tickets/${data.ticket.id}`);
      router.refresh();
    } catch {
      setError(t("msg.networkErrorAs", lang));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">
        {t("note.asTicketAutoCode", lang)}
      </Note>

      <SectionTitle icon="🏢" title={t("section.clientEquipment", lang)} />
      <Row>
        <Field label={t("field.client", lang)} required>
          <Select
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={clients.map((c) => ({ value: c.id, label: c.label }))}
          />
        </Field>
        <Field label={t("field.asAssignee", lang)}>
          <Select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            placeholder={t("label.unassigned", lang)}
            options={employeeOptions}
          />
        </Field>
      </Row>

      {isBlocked && (
        <div className="my-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[13px] font-semibold text-[color:var(--tts-danger)]">
          {t("msg.recvBlockedFull", lang)} <Badge tone="danger">{t("col.recvBlocked", lang)}</Badge>
        </div>
      )}
      {isWarning && (
        <div className="my-3 rounded-md bg-[color:var(--tts-warn-dim)] px-3 py-2 text-[13px] text-[color:var(--tts-warn)]">
          {t("msg.recvWarning", lang)}
        </div>
      )}

      <Row>
        <Field label={t("field.equipmentItem", lang)}>
          <Select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            placeholder={t("placeholder.notSelected", lang)}
            options={itemOptions}
          />
        </Field>
        <Field label={t("field.serial", lang)} hint={t("hint.snLoose", lang)}>
          <TextInput
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="예: SL-X7500-ABC123"
          />
        </Field>
      </Row>

      <SectionTitle icon="🗣️" title={t("section.symptomMulti", lang)} />
      <Note tone="info">
        {t("note.asMultiLang", lang)}
      </Note>
      <Row>
        <Field label={t("field.originalLang", lang)} required width="180px">
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
        <Field label={t("field.symptomViLong", lang)}>
          <Textarea
            rows={3}
            value={symptomVi}
            onChange={(e) => setSymptomVi(e.target.value)}
            placeholder="Máy bị kẹt giấy ..."
          />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.symptomKoLong", lang)}>
          <Textarea
            rows={3}
            value={symptomKo}
            onChange={(e) => setSymptomKo(e.target.value)}
            placeholder="용지가 걸림 ..."
          />
        </Field>
        <Field label={t("field.symptomEnLong", lang)}>
          <Textarea
            rows={3}
            value={symptomEn}
            onChange={(e) => setSymptomEn(e.target.value)}
            placeholder="Paper jam ..."
          />
        </Field>
      </Row>

      <SectionTitle icon="📸" title={t("section.symptomPhotosNew", lang)} />
      <Row>
        <Field label={uploading ? t("btn.uploading", lang) : t("btn.addPhoto", lang)}>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
            {t("btn.fileSelect", lang)}
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
          {submitting ? t("action.saving", lang) : t("btn.acceptAndOpen", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/as/tickets")}>
          {t("action.cancel", lang)}
        </Button>
      </div>
    </form>
  );
}

function mapError(code: string | undefined, details: { field?: string; reason?: string } | undefined, lang: Lang): string {
  if (code === "invalid_input" && details?.field === "symptom" && details?.reason === "required_at_least_one") {
    return t("msg.symptomRequired", lang);
  }
  switch (code) {
    case "invalid_client":
      return t("msg.invalidClientAs", lang);
    case "invalid_assignee":
      return t("msg.invalidAssignee", lang);
    case "invalid_item":
      return t("msg.invalidItemAs", lang);
    case "invalid_photo_ids":
      return t("msg.invalidPhotoIds", lang);
    default:
      return t("msg.saveFailed", lang);
  }
}
