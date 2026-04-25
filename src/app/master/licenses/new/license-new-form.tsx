"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export function LicenseNewForm({ employeeOptions, lang }: { employeeOptions: { value: string; label: string }[]; lang: Lang }) {
  const router = useRouter();
  const [v, setV] = useState({
    name: "", ownerEmployeeId: "", acquiredAt: "", expiresAt: "",
    renewalCost: "", alertBeforeDays: "30",
  });
  const set = <K extends keyof typeof v>(k: K, val: typeof v[K]) => setV((p) => ({ ...p, [k]: val }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/master/licenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name,
          ownerEmployeeId: v.ownerEmployeeId || null,
          acquiredAt: v.acquiredAt, expiresAt: v.expiresAt,
          renewalCost: v.renewalCost || null,
          alertBeforeDays: v.alertBeforeDays,
        }),
      });
      if (!res.ok) { setError(t("msg.saveFailedGeneric", lang)); return; }
      router.push("/master/licenses"); router.refresh();
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">{t("note.licenseAuto", lang)}<span className="font-mono">LIC-YYMMDD-###</span>{t("note.licenseAutoSuffix", lang)}</Note>
      <Row>
        <Field label={t("field.licenseNameRequired", lang)} required><TextInput required value={v.name} onChange={(e) => set("name", e.target.value)} placeholder={t("placeholder.licenseExample", lang)} /></Field>
        <Field label={t("field.ownerOpt", lang)} width="260px">
          <Select value={v.ownerEmployeeId} onChange={(e) => set("ownerEmployeeId", e.target.value)} placeholder={t("placeholder.notSelectedShort", lang)} options={employeeOptions} />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.acquiredAtField", lang)} required width="200px"><TextInput type="date" required value={v.acquiredAt} onChange={(e) => set("acquiredAt", e.target.value)} /></Field>
        <Field label={t("field.expiresAtField", lang)} required width="200px"><TextInput type="date" required value={v.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} /></Field>
        <Field label={t("field.alertDays", lang)} width="160px"><TextInput type="number" value={v.alertBeforeDays} onChange={(e) => set("alertBeforeDays", e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={t("field.renewalCostOpt", lang)} width="240px"><TextInput type="number" value={v.renewalCost} onChange={(e) => set("renewalCost", e.target.value)} /></Field>
      </Row>
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      <div className="mt-3 flex gap-2"><Button type="submit" disabled={submitting}>{submitting ? t("action.saving", lang) : t("btn.licenseRegister", lang)}</Button><Button type="button" variant="ghost" onClick={() => router.push("/master/licenses")}>{t("action.cancel", lang)}</Button></div>
    </form>
  );
}
