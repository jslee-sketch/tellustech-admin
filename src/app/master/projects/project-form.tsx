"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Row, Select, TextInput } from "@/components/ui";

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
};

const SALES_OPTIONS = [
  { value: "TRADE", label: "판매/구매 (재고영향)" },
  { value: "MAINTENANCE", label: "유지보수 (기간)" },
  { value: "RENTAL", label: "렌탈 (기간)" },
  { value: "CALIBRATION", label: "교정 (성적서)" },
  { value: "REPAIR", label: "수리" },
  { value: "OTHER", label: "기타" },
];

export function ProjectForm({ mode, initial, allowedCompanies }: Props) {
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
        setError(data.details?.message ?? mapError(data.error));
        return;
      }
      router.push("/master/projects");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!value.id) return;
    if (!window.confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/projects/${value.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(data.details?.message ?? mapError(data.error));
        return;
      }
      router.push("/master/projects");
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
        <Field label="프로젝트코드" required hint="예: IT0003, TM_R" width="220px">
          <TextInput
            required
            value={value.projectCode}
            onChange={(e) => set("projectCode", e.target.value.toUpperCase())}
            placeholder="IT0003"
            disabled={mode === "edit"}
          />
        </Field>
        <Field label="매출유형" required width="180px">
          <Select
            required
            value={value.salesType}
            onChange={(e) => set("salesType", e.target.value)}
            placeholder="선택"
            options={SALES_OPTIONS}
          />
        </Field>
      </Row>
      <Row>
        <Field label="프로젝트명" required>
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
          {submitting ? "저장 중..." : mode === "create" ? "프로젝트 등록" : "수정 저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/master/projects")}>
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
    </form>
  );
}

function mapError(code: string | undefined): string {
  switch (code) {
    case "duplicate_code":
      return "해당 회사에 동일한 프로젝트코드가 존재합니다.";
    case "invalid_input":
      return "입력값이 올바르지 않습니다.";
    case "company_not_allowed":
      return "선택한 회사에 권한이 없습니다.";
    case "has_dependent_rows":
      return "이 프로젝트에 연결된 매출/매입이 있어 삭제할 수 없습니다.";
    case "not_found":
      return "프로젝트를 찾을 수 없습니다.";
    default:
      return "저장에 실패했습니다.";
  }
}
