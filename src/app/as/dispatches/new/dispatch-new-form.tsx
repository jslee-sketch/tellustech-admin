"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, TextInput, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type Props = {
  ticket: {
    id: string;
    ticketNumber: string;
    clientLabel: string;
    destinationAddress: string;
    defaultDispatchEmployeeId: string;
  };
  employeeOptions: { value: string; label: string }[];
  lang: Lang;
};

export function DispatchNewForm({ ticket, employeeOptions, lang }: Props) {
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

  const TRANSPORT_OPTIONS = [
    { value: "company_car", label: t("transport.companyCar", lang) },
    { value: "motorbike", label: t("transport.motorbike", lang) },
    { value: "grab", label: t("transport.grab", lang) },
    { value: "taxi", label: t("transport.taxi", lang) },
  ];

  async function uploadFile(file: File): Promise<{ id: string; storedPath: string } | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/files", { method: "POST", body: fd });
    if (!res.ok) {
      setError(t("msg.fileUploadFail", lang));
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
        ? t("msg.distanceMatchLiveOk", lang)
        : t("msg.distanceMismatchLive", lang).replace("{diff}", Math.abs(mNum - gNum).toFixed(2))
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
        setError(body.error ? t("msg.saveFailedDetail", lang).replace("{error}", body.error) : t("msg.saveFailedShort", lang));
        return;
      }
      const data = (await res.json()) as { dispatch: { id: string } };
      router.push(`/as/dispatches/${data.dispatch.id}`);
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
        {t("note.dispatchSave", lang)} <span className="font-mono font-bold">{ticket.ticketNumber}</span> — {ticket.clientLabel}.
        {t("note.dispatchAutoStatus", lang)}
      </Note>

      <SectionTitle icon="🚗" title={t("section.transportDist", lang)} />
      <Row>
        <Field label={t("field.dispatchEmployee", lang)}>
          <Select
            value={dispatchEmployeeId}
            onChange={(e) => setDispatchEmployeeId(e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={employeeOptions}
          />
        </Field>
        <Field label={t("field.transportMethod", lang)} width="220px">
          <Select
            value={transportMethod}
            onChange={(e) => setTransportMethod(e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={TRANSPORT_OPTIONS}
          />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.originAddrOffice", lang)}>
          <TextInput value={originAddress} onChange={(e) => setOriginAddress(e.target.value)} placeholder={t("placeholder.originExample", lang)} />
        </Field>
        <Field label={t("field.destAddrInstall", lang)}>
          <TextInput value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.googleDistance", lang)} width="180px" hint={t("hint.googleManual", lang)}>
          <TextInput
            type="number"
            step="0.01"
            value={googleDistanceKm}
            onChange={(e) => setGoogleDistanceKm(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label={t("field.meterOcrKm", lang)} width="180px" hint={t("hint.ocrLater", lang)}>
          <TextInput
            type="number"
            step="0.01"
            value={meterOcrKm}
            onChange={(e) => setMeterOcrKm(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        {distancePreview && (
          <Field label={t("field.distanceCompareAuto", lang)}>
            <div className="flex items-center pt-2 text-[12px]">{distancePreview}</div>
          </Field>
        )}
      </Row>
      <Row>
        <Field label={t("field.meterPhoto", lang)}>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
            📎 {meterPhotoName || t("btn.selectPhoto", lang)}
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

      <SectionTitle icon="💰" title={t("section.transportCostNew", lang)} />
      <Row>
        <Field label={t("field.transportCost", lang)} width="200px">
          <TextInput
            type="number"
            value={transportCost}
            onChange={(e) => setTransportCost(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label={t("field.receiptFile", lang)}>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
            📎 {receiptName || t("btn.selectReceipt", lang)}
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

      <SectionTitle icon="🕐" title={t("section.times", lang)} />
      <Row>
        <Field label={t("field.departedAtDt", lang)} width="220px">
          <TextInput type="datetime-local" value={departedAt} onChange={(e) => setDepartedAt(e.target.value)} />
        </Field>
        <Field label={t("field.arrivedAtDt", lang)} width="220px">
          <TextInput type="datetime-local" value={arrivedAt} onChange={(e) => setArrivedAt(e.target.value)} />
        </Field>
        <Field label={t("field.completedAtDt", lang)} width="220px">
          <TextInput type="datetime-local" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} />
        </Field>
      </Row>

      <SectionTitle icon="📝" title={t("section.notes", lang)} />
      <Row>
        <Field label={t("field.memo", lang)}>
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
          {submitting ? t("action.saving", lang) : t("btn.dispatchSubmit", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(`/as/tickets/${ticket.id}`)}>
          {t("action.cancel", lang)}
        </Button>
      </div>
    </form>
  );
}
