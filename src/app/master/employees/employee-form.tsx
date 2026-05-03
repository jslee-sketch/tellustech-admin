"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, TextInput } from "@/components/ui";
import { pickName, t, type Lang } from "@/lib/i18n";

export type EmployeeFormValue = {
  id?: string;
  employeeCode?: string;
  companyCode: string;
  departmentId: string;
  nameVi: string;
  nameEn: string;
  nameKo: string;
  position: string;
  email: string;
  personalEmail: string;
  zaloId: string;
  phone: string;
  hireDate: string;
  status: string;
  idCardNumber: string;
  idCardPhotoUrl: string;
  salary: string;
  insuranceNumber: string;
  contractType: string;
  contractStart: string;
  contractEnd: string;
  photoUrl: string;
};

export type DepartmentOption = {
  id: string;
  code: string;
  name: string;
  companyCode: string;
};

type Props = {
  mode: "create" | "edit";
  initial: EmployeeFormValue;
  departments: DepartmentOption[];
  allowedCompanies: string[];
  lang: Lang;
};

export function EmployeeForm({ mode, initial, departments, allowedCompanies, lang }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<EmployeeFormValue>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof EmployeeFormValue>(k: K, v: EmployeeFormValue[K]) =>
    setValue((p) => ({ ...p, [k]: v }));

  // 회사가 바뀌면 해당 회사 부서만 노출 + 현재 선택 부서가 다른 회사 소속이면 리셋
  const deptOptions = useMemo(
    () =>
      departments
        .filter((d) => d.companyCode === value.companyCode)
        .map((d) => ({ value: d.id, label: `${d.code} · ${d.name}` })),
    [departments, value.companyCode],
  );

  function onCompanyChange(next: string) {
    setValue((p) => {
      const deptStillValid = departments.some(
        (d) => d.id === p.departmentId && d.companyCode === next,
      );
      return { ...p, companyCode: next, departmentId: deptStillValid ? p.departmentId : "" };
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint =
        mode === "create"
          ? "/api/master/employees"
          : `/api/master/employees/${value.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body: Record<string, unknown> = {
        nameVi: value.nameVi,
        nameEn: value.nameEn || null,
        nameKo: value.nameKo || null,
        position: value.position || null,
        email: value.email || null,
        personalEmail: value.personalEmail || null,
        zaloId: value.zaloId || null,
        phone: value.phone || null,
        hireDate: value.hireDate || null,
        status: value.status || "ACTIVE",
        idCardNumber: value.idCardNumber || null,
        idCardPhotoUrl: value.idCardPhotoUrl || null,
        salary: value.salary || null,
        insuranceNumber: value.insuranceNumber || null,
        contractType: value.contractType || null,
        contractStart: value.contractStart || null,
        contractEnd: value.contractEnd || null,
        photoUrl: value.photoUrl || null,
        departmentId: value.departmentId,
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
      router.push("/master/employees");
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!value.id) return;
    if (!window.confirm(t("msg.deleteEmployeeConfirm", lang))) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/employees/${value.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(data.details?.message ?? mapError(data.error, lang));
        return;
      }
      router.push("/master/employees");
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setDeleting(false);
    }
  }

  const companyEditable = mode === "create" && allowedCompanies.length > 1;
  const prefixPreview = value.companyCode === "VR" ? "VNV-" : "TNV-";

  return (
    <form onSubmit={handleSubmit}>
      {mode === "create" && (
        <Note tone="info">
          {t("hint.empCodeAuto", lang)} —{" "}
          <span className="font-mono">{prefixPreview}###</span>
        </Note>
      )}
      {mode === "edit" && value.employeeCode && (
        <div className="mb-3 text-[12px] text-[color:var(--tts-muted)]">
          {lang === "VI" ? "Mã NV" : lang === "EN" ? "Employee Code" : "사원코드"}: <span className="font-mono text-[color:var(--tts-primary)]">{value.employeeCode}</span>
        </div>
      )}

      <SectionTitle icon="👤" title={t("section.basicInfo", lang)} />
      <Row>
        <Field label={t("field.companyCode", lang)} required width="160px">
          {companyEditable ? (
            <Select
              required
              value={value.companyCode}
              onChange={(e) => onCompanyChange(e.target.value)}
              options={allowedCompanies.map((c) => ({ value: c, label: c }))}
            />
          ) : (
            <TextInput value={value.companyCode} disabled />
          )}
        </Field>
        <Field label={t("field.departmentBranch", lang)} required>
          <Select
            required
            value={value.departmentId}
            onChange={(e) => set("departmentId", e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={deptOptions}
          />
        </Field>
        <Field label={t("field.status", lang)} required width="140px">
          <Select
            required
            value={value.status}
            onChange={(e) => set("status", e.target.value)}
            options={[
              { value: "ACTIVE", label: t("status.employed", lang) },
              { value: "ON_LEAVE", label: t("status.onLeave", lang) },
              { value: "TERMINATED", label: t("status.terminated", lang) },
            ]}
          />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.nameVi", lang)} required>
          <TextInput
            required
            value={value.nameVi}
            onChange={(e) => set("nameVi", e.target.value)}
            placeholder="Nguyễn Văn ..."
          />
        </Field>
        <Field label={t("field.position", lang)} hint={t("hint.position", lang)}>
          <TextInput
            value={value.position}
            onChange={(e) => set("position", e.target.value)}
            placeholder={t("field.position", lang)}
          />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.nameEn", lang)}>
          <TextInput value={value.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
        </Field>
        <Field label={t("field.nameKo", lang)}>
          <TextInput value={value.nameKo} onChange={(e) => set("nameKo", e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.email", lang)}>
          <TextInput
            type="email"
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="name@tellustech.co.kr"
          />
        </Field>
        <Field label={t("field.phone", lang)}>
          <TextInput
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="0912-345-6789"
          />
        </Field>
        <Field label={t("field.hireDate", lang)} width="180px">
          <TextInput type="date" value={value.hireDate} onChange={(e) => set("hireDate", e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={t("notify.personalEmail", lang)}>
          <TextInput type="email" value={value.personalEmail} onChange={(e) => set("personalEmail", e.target.value)} placeholder="example@gmail.com" />
        </Field>
        <Field label={t("notify.zaloId", lang)}>
          <TextInput value={value.zaloId} onChange={(e) => set("zaloId", e.target.value)} placeholder="0911XXXXXX" />
        </Field>
      </Row>

      <SectionTitle icon="🪪" title={t("section.idCard", lang)} />
      <Row>
        <Field label={t("field.idCardNumber", lang)} hint={t("hint.idCardDigits", lang)}>
          <TextInput
            value={value.idCardNumber}
            onChange={(e) => set("idCardNumber", e.target.value)}
            placeholder="012345678901"
          />
        </Field>
        <Field label={t("field.idCardPhotoUrl", lang)} hint={t("hint.fileUploadLater", lang)}>
          <TextInput
            value={value.idCardPhotoUrl}
            onChange={(e) => set("idCardPhotoUrl", e.target.value)}
            placeholder="/uploads/..."
          />
        </Field>
      </Row>

      <SectionTitle icon="💰" title={t("section.salary", lang)} />
      <Row>
        <Field label={t("field.salary", lang)} width="200px">
          <TextInput
            type="number"
            value={value.salary}
            onChange={(e) => set("salary", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label={t("field.insuranceNumber", lang)}>
          <TextInput
            value={value.insuranceNumber}
            onChange={(e) => set("insuranceNumber", e.target.value)}
          />
        </Field>
      </Row>

      <SectionTitle icon="📋" title={t("section.contract", lang)} />
      <Row>
        <Field label={t("field.contractType", lang)} hint={t("hint.contractType", lang)}>
          <TextInput
            value={value.contractType}
            onChange={(e) => set("contractType", e.target.value)}
          />
        </Field>
        <Field label={t("field.contractStart", lang)} width="180px">
          <TextInput
            type="date"
            value={value.contractStart}
            onChange={(e) => set("contractStart", e.target.value)}
          />
        </Field>
        <Field label={t("field.contractEnd", lang)} width="180px">
          <TextInput
            type="date"
            value={value.contractEnd}
            onChange={(e) => set("contractEnd", e.target.value)}
          />
        </Field>
      </Row>

      <SectionTitle icon="🖼️" title={t("section.idPhoto", lang)} />
      <Row>
        <Field label={t("field.photoUrl", lang)} hint={t("hint.fileUploadLater", lang)}>
          <TextInput
            value={value.photoUrl}
            onChange={(e) => set("photoUrl", e.target.value)}
            placeholder="/uploads/..."
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
          {submitting ? t("action.saving", lang) : mode === "create" ? t("btn.registerEmployee", lang) : t("btn.editSaveEmployee", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/master/employees")}>
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
      return t("msg.employeeDuplicate", lang);
    case "invalid_input":
      return t("msg.invalidInput", lang);
    case "invalid_department":
      return t("msg.employeeInvalidDept", lang);
    case "has_dependent_rows":
      return t("msg.employeeHasDeps", lang);
    case "forbidden":
      return t("msg.forbidden", lang);
    case "not_found":
      return t("msg.employeeNotFound", lang);
    default:
      return t("msg.saveFailed", lang);
  }
}
