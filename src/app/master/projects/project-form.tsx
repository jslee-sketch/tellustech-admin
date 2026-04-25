"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Row, Select, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type ProjectFormValue = {
  id?: string;
  projectCode: string;
  name: string;
  salesType: string;
  companyCode: string;
};

type Props = {
  mode: "create" | "edit";
  initial: ProjectFormValue;
  allowedCompanies: string[];
  lang: Lang;
};

const SALES_OPTION_KEYS: { value: string; key: string }[] = [
  { value: "TRADE", key: "salesTypeFull.TRADE" },
  { value: "MAINTENANCE", key: "salesTypeFull.MAINTENANCE" },
  { value: "RENTAL", key: "salesTypeFull.RENTAL" },
  { value: "CALIBRATION", key: "salesTypeFull.CALIBRATION" },
  { value: "REPAIR", key: "salesTypeFull.REPAIR" },
  { value: "OTHER", key: "salesTypeFull.OTHER" },
];

export function ProjectForm({ mode, initial, allowedCompanies, lang }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<ProjectFormValue>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProjectFormValue>(k: K, v: ProjectFormValue[K]) =>
    setValue((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint =
        mode === "create" ? "/api/master/projects" : `/api/master/projects/${value.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body: Record<string, unknown> = {
        projectCode: value.projectCode,
        name: value.name,
        salesType: value.salesType,
      };
      if (mode === "create") body.companyCode = value.companyCode;
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(data.details?.message ?? mapError(data.error, lang));
        return;
      }
      router.push("/master/projects");
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!value.id) return;
    if (!window.confirm(t("msg.projectDeleteConfirm", lang))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/projects/${value.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(data.details?.message ?? mapError(data.error, lang));
        return;
      }
      router.push("/master/projects");
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setDeleting(false);
    }
  }

  const companyEditable = mode === "create" && allowedCompanies.length > 1;

  return (
    <form onSubmit={handleSubmit}>
      <Row>
        <Field label={t("field.companyCode", lang)} required width="180px">
          {companyEditable ? (
            <Select
              required
              value={value.companyCode}
              onChange={(e) => set("companyCode", e.target.value)}
              options={allowedCompanies.map((c) => ({ value: c, label: c }))}
            />
          ) : (
            <TextInput value={value.companyCode} disabled />
          )}
        </Field>
        <Field label={t("field.projectCodeField", lang)} required hint={t("hint.projectCodeExample", lang)} width="220px">
          <TextInput
            required
            value={value.projectCode}
            onChange={(e) => set("projectCode", e.target.value.toUpperCase())}
            placeholder="IT0003"
            disabled={mode === "edit"}
          />
        </Field>
        <Field label={t("field.salesTypeField", lang)} required width="180px">
          <Select
            required
            value={value.salesType}
            onChange={(e) => set("salesType", e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={SALES_OPTION_KEYS.map((o) => ({ value: o.value, label: t(o.key, lang) }))}
          />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.projectNameField", lang)} required>
          <TextInput
            required
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="IT Rental"
          />
        </Field>
      </Row>

      {error && (
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("action.saving", lang) : mode === "create" ? t("btn.projectRegister", lang) : t("action.update", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/master/projects")}>
          {t("action.cancel", lang)}
        </Button>
        {mode === "edit" && (
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto"
          >
            {deleting ? t("action.deleting", lang) : t("action.delete", lang)}
          </Button>
        )}
      </div>
    </form>
  );
}

function mapError(code: string | undefined, lang: Lang): string {
  switch (code) {
    case "duplicate_code":
      return t("msg.projectDup", lang);
    case "invalid_input":
      return t("msg.invalidInput", lang);
    case "company_not_allowed":
      return t("msg.companyForbidden", lang);
    case "has_dependent_rows":
      return t("msg.projectHasDeps", lang);
    case "not_found":
      return t("msg.projectNotFound", lang);
    default:
      return t("msg.saveFailed", lang);
  }
}
