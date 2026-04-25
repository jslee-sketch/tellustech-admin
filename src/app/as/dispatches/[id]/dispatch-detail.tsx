"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, TextInput, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

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
  lang: Lang;
};

export function DispatchDetail({ dispatchId, initial, employeeOptions, lang }: Props) {
  const router = useRouter();
  const [core, setCore] = useState<DispatchCore>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const TRANSPORT_OPTIONS = [
    { value: "company_car", label: t("transport.companyCar", lang) },
    { value: "motorbike", label: t("transport.motorbike", lang) },
    { value: "grab", label: t("transport.grab", lang) },
    { value: "taxi", label: t("transport.taxi", lang) },
  ];

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
      setError(t("msg.fileUploadFail", lang));
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
        setError(t("msg.saveFailed", lang));
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t("msg.deleteDispatchConfirm", lang))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/as-dispatches/${dispatchId}`, { method: "DELETE" });
      if (!res.ok) {
        setError(t("msg.deleteFailed", lang));
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
        ? t("msg.distanceMatchLive", lang)
        : t("msg.distanceMismatchLive", lang).replace("{diff}", Math.abs(mNum - gNum).toFixed(2))
      : core.distanceMatch === true
      ? t("msg.distanceMatchSaved", lang)
      : core.distanceMatch === false
      ? t("msg.distanceMismatchSaved", lang)
      : "—";

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <Note tone="info">
        {t("label.asTicket", lang)}:{" "}
        <Link href={`/as/tickets/${core.ticketId}`} className="font-mono font-bold text-[color:var(--tts-primary)] hover:underline">
          {core.ticketNumber}
        </Link>
      </Note>

      <SectionTitle icon="🚗" title={t("section.dispatchInfo", lang)} />
      <Row>
        <Field label={t("field.dispatchEmployee", lang)}>
          <Select
            value={core.dispatchEmployeeId}
            onChange={(e) => set("dispatchEmployeeId", e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={employeeOptions}
          />
        </Field>
        <Field label={t("field.transportMethod", lang)} width="220px">
          <Select
            value={core.transportMethod}
            onChange={(e) => set("transportMethod", e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={TRANSPORT_OPTIONS}
          />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.originAddress", lang)}>
          <TextInput value={core.originAddress} onChange={(e) => set("originAddress", e.target.value)} />
        </Field>
        <Field label={t("field.destinationAddress", lang)}>
          <TextInput value={core.destinationAddress} onChange={(e) => set("destinationAddress", e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.googleDistance", lang)} width="180px">
          <TextInput
            type="number"
            step="0.01"
            value={core.googleDistanceKm}
            onChange={(e) => set("googleDistanceKm", e.target.value)}
          />
        </Field>
        <Field label={t("field.meterOcrKm", lang)} width="180px">
          <TextInput
            type="number"
            step="0.01"
            value={core.meterOcrKm}
            onChange={(e) => set("meterOcrKm", e.target.value)}
          />
        </Field>
        <Field label={t("field.distanceCompare", lang)}>
          <div className="flex items-center pt-2 text-[12px]">{livePreview}</div>
        </Field>
      </Row>
      <Row>
        <Field label={t("field.meterPhoto", lang)}>
          <div className="flex items-center gap-2">
            {core.meterPhotoUrl && (
              <Link href={core.meterPhotoUrl} target="_blank" className="text-[12px] text-[color:var(--tts-primary)] hover:underline">
                {t("btn.openCurrentPhoto", lang)}
              </Link>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-1 text-[12px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
              {core.meterPhotoUrl ? t("btn.replace", lang) : t("btn.upload", lang)}
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

      <SectionTitle icon="💰" title={t("section.transportCost", lang)} />
      <Row>
        <Field label={t("field.transportCost", lang)} width="200px">
          <TextInput
            type="number"
            value={core.transportCost}
            onChange={(e) => set("transportCost", e.target.value)}
          />
        </Field>
        <Field label={t("field.receipt", lang)}>
          <div className="flex items-center gap-2">
            {core.receiptFileId && (
              <Link
                href={`/api/files/${core.receiptFileId}`}
                target="_blank"
                className="text-[12px] text-[color:var(--tts-primary)] hover:underline"
              >
                📄 {core.receiptName || t("field.receipt", lang)}
              </Link>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-1 text-[12px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
              {core.receiptFileId ? t("btn.replace", lang) : t("btn.upload", lang)}
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

      <SectionTitle icon="🕐" title={t("section.times", lang)} />
      <Row>
        <Field label={t("field.departed", lang)} width="220px">
          <TextInput type="datetime-local" value={core.departedAt} onChange={(e) => set("departedAt", e.target.value)} />
        </Field>
        <Field label={t("field.arrived", lang)} width="220px">
          <TextInput type="datetime-local" value={core.arrivedAt} onChange={(e) => set("arrivedAt", e.target.value)} />
        </Field>
        <Field label={t("field.completed", lang)} width="220px">
          <TextInput type="datetime-local" value={core.completedAt} onChange={(e) => set("completedAt", e.target.value)} />
        </Field>
      </Row>

      <SectionTitle icon="📝" title={t("section.notes", lang)} />
      <Row>
        <Field label={t("field.memo", lang)}>
          <Textarea value={core.note} onChange={(e) => set("note", e.target.value)} rows={2} />
        </Field>
      </Row>

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={saving}>
          {saving ? t("action.saving", lang) : t("action.save", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/as/dispatches")}>
          {t("btn.toList", lang)}
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto"
        >
          {deleting ? t("action.deleting", lang) : t("btn.deleteDispatch", lang)}
        </Button>
      </div>
    </form>
  );
}
