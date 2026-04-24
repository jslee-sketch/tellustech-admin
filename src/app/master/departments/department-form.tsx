"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Row, Select, TextInput } from "@/components/ui";

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
};

export function DepartmentForm({ mode, initial, managerOptions, sessionCompany, allowedCompanies }: Props) {
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
        setError(data.details?.message ?? mapError(data.error));
        return;
      }
      router.push("/master/departments");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!value.id) return;
    if (!window.confirm("이 부서를 삭제하시겠습니까?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/departments/${value.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(data.details?.message ?? mapError(data.error));
        return;
      }
      router.push("/master/departments");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  const companyEditable = mode === "create" && allowedCompanies.length > 1;

  return (
    <form onSubmit={handleSubmit}>
      <Row>
        <Field label="회사코드" required width="180px">
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
        <Field label="지점 구분" required width="200px">
          <Select
            required
            value={value.branchType}
            onChange={(e) => set("branchType", e.target.value)}
            placeholder="선택"
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
        <Field label="부서코드" required hint="예: TVBN, VRHCM" width="220px">
          <TextInput
            required
            value={value.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="TVBN"
          />
        </Field>
        <Field label="부서명" required>
          <TextInput
            required
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="TV 박닌 본사"
          />
        </Field>
      </Row>

      <Row>
        <Field label="관리자 (옵션)" hint="부서장 역할 직원 선택">
          <Select
            value={value.managerId ?? ""}
            onChange={(e) => set("managerId", e.target.value || null)}
            placeholder="선택 안 함"
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
          {submitting ? "저장 중..." : mode === "create" ? "부서 등록" : "수정 저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/master/departments")}>
          취소
        </Button>
        {mode === "edit" && (
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto"
          >
            {deleting ? "삭제 중..." : "삭제"}
          </Button>
        )}
      </div>

      <input type="hidden" value={sessionCompany} />
    </form>
  );
}

function mapError(code: string | undefined): string {
  switch (code) {
    case "duplicate_code":
      return "해당 회사에 동일한 부서코드가 이미 존재합니다.";
    case "invalid_input":
      return "입력값이 올바르지 않습니다.";
    case "invalid_manager":
      return "선택한 관리자는 이 회사 소속이 아닙니다.";
    case "company_not_allowed":
      return "선택한 회사에 권한이 없습니다.";
    case "has_dependent_employees":
      return "이 부서에 배정된 직원이 있어 삭제할 수 없습니다.";
    case "forbidden":
      return "권한이 없습니다.";
    case "not_found":
      return "부서를 찾을 수 없습니다.";
    default:
      return "저장에 실패했습니다.";
  }
}
