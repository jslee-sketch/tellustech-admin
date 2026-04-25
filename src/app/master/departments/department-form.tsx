"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Row, Select, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

// 부서 등록/수정 공통 폼. mode 에 따라 POST/PATCH 분기.
// managerOptions: 같은 회사 직원 목록(옵션). 지금은 간단 인라인 select.

export type DepartmentFormValue = {
  id?: string;
  code: string;
  name: string;
  branchType: string;
  managerId: string | null;
  companyCode: string;
};

type Props = {
  mode: "create" | "edit";
  initial: DepartmentFormValue;
  managerOptions: { value: string; label: string }[];
  sessionCompany: string;
  allowedCompanies: string[];
  lang: Lang;
};

export function DepartmentForm({ mode, initial, managerOptions, sessionCompany, allowedCompanies, lang }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<DepartmentFormValue>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof DepartmentFormValue>(k: K, v: DepartmentFormValue[K]) =>
    setValue((prev) => ({ ...prev, [k]: v }));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint =
        mode === "create"
          ? "/api/master/departments"
          : `/api/master/departments/${value.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body: Record<string, unknown> = {
        code: value.code,
        name: value.name,
        branchType: value.branchType,
        managerId: value.managerId ?? null,
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
      router.push("/master/departments");
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!value.id) return;
    if (!window.confirm(t("msg.deptDeleteConfirm", lang))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/departments/${value.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(data.details?.message ?? mapError(data.error, lang));
        return;
      }
      router.push("/master/departments");
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
        <Field label={t("field.branchKind", lang)} required width="200px">
          <Select
            required
            value={value.branchType}
            onChange={(e) => set("branchType", e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={[
              { value: "BN", label: "BN (Bắc Ninh)" },
              { value: "HN", label: "HN (Hà Nội)" },
              { value: "HCM", label: "HCM (Hồ Chí Minh)" },
              { value: "NT", label: "NT (Nha Trang)" },
              { value: "DN", label: "DN (Đà Nẵng)" },
            ]}
          />
        </Field>
      </Row>

      <Row>
        <Field label={t("field.deptCodeField", lang)} required hint={t("hint.deptCodeExample", lang)} width="220px">
          <TextInput
            required
            value={value.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="TVBN"
          />
        </Field>
        <Field label={t("field.deptNameField", lang)} required>
          <TextInput
            required
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={t("placeholder.deptNameExample", lang)}
          />
        </Field>
      </Row>

      <Row>
        <Field label={t("field.managerOpt", lang)} hint={t("hint.deptManagerHint", lang)}>
          <Select
            value={value.managerId ?? ""}
            onChange={(e) => set("managerId", e.target.value || null)}
            placeholder={t("placeholder.notSelectedShort", lang)}
            options={managerOptions}
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
          {submitting ? t("action.saving", lang) : mode === "create" ? t("btn.deptRegister", lang) : t("action.update", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/master/departments")}>
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

      <input type="hidden" value={sessionCompany} />
    </form>
  );
}

function mapError(code: string | undefined, lang: Lang): string {
  switch (code) {
    case "duplicate_code":
      return t("msg.deptDup", lang);
    case "invalid_input":
      return t("msg.invalidInput", lang);
    case "invalid_manager":
      return t("msg.deptInvalidMgr", lang);
    case "company_not_allowed":
      return t("msg.companyForbidden", lang);
    case "has_dependent_employees":
      return t("msg.deptHasEmployees", lang);
    case "forbidden":
      return t("msg.forbidden", lang);
    case "not_found":
      return t("msg.deptNotFound", lang);
    default:
      return t("msg.saveFailed", lang);
  }
}
