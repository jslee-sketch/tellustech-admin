"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button, Field, Note, Row, SectionTitle, Select, TextInput } from "@/components/ui";

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
};

export function EmployeeForm({ mode, initial, departments, allowedCompanies }: Props) {
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
        setError(data.details?.message ?? mapError(data.error));
        return;
      }
      router.push("/master/employees");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!value.id) return;
    if (!window.confirm("이 직원을 삭제하시겠습니까? 연결된 이력이 있으면 실패하고 대신 상태를 '퇴사'로 바꿔야 합니다.")) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/employees/${value.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(data.details?.message ?? mapError(data.error));
        return;
      }
      router.push("/master/employees");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
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
          사원코드는 저장 시 자동 생성됩니다 — 선택한 회사에 따라{" "}
          <span className="font-mono">{prefixPreview}###</span> 형식.
        </Note>
      )}
      {mode === "edit" && value.employeeCode && (
        <div className="mb-3 text-[12px] text-[color:var(--tts-muted)]">
          사원코드: <span className="font-mono text-[color:var(--tts-primary)]">{value.employeeCode}</span>
        </div>
      )}

      <SectionTitle icon="👤" title="기본 정보" />
      <Row>
        <Field label="회사코드" required width="160px">
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
        <Field label="부서(지점)" required>
          <Select
            required
            value={value.departmentId}
            onChange={(e) => set("departmentId", e.target.value)}
            placeholder="선택"
            options={deptOptions}
          />
        </Field>
        <Field label="상태" required width="140px">
          <Select
            required
            value={value.status}
            onChange={(e) => set("status", e.target.value)}
            options={[
              { value: "ACTIVE", label: "재직" },
              { value: "ON_LEAVE", label: "휴직" },
              { value: "TERMINATED", label: "퇴사" },
            ]}
          />
        </Field>
      </Row>
      <Row>
        <Field label="성명 (베트남어)" required>
          <TextInput
            required
            value={value.nameVi}
            onChange={(e) => set("nameVi", e.target.value)}
            placeholder="Nguyễn Văn ..."
          />
        </Field>
        <Field label="직책" hint="예: Kỹ Thuật, Sales, Manager">
          <TextInput
            value={value.position}
            onChange={(e) => set("position", e.target.value)}
            placeholder="직책"
          />
        </Field>
      </Row>
      <Row>
        <Field label="성명 (영어)">
          <TextInput value={value.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
        </Field>
        <Field label="성명 (한국어)">
          <TextInput value={value.nameKo} onChange={(e) => set("nameKo", e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="이메일">
          <TextInput
            type="email"
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="name@tellustech.co.kr"
          />
        </Field>
        <Field label="전화번호">
          <TextInput
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="0912-345-6789"
          />
        </Field>
        <Field label="입사일" width="180px">
          <TextInput type="date" value={value.hireDate} onChange={(e) => set("hireDate", e.target.value)} />
        </Field>
      </Row>

      <SectionTitle icon="🪪" title="신분증" />
      <Row>
        <Field label="CCCD (주민등록번호)" hint="12자리 숫자">
          <TextInput
            value={value.idCardNumber}
            onChange={(e) => set("idCardNumber", e.target.value)}
            placeholder="012345678901"
          />
        </Field>
        <Field label="신분증 사진 URL" hint="Phase 4 에서 파일 업로드로 대체 예정">
          <TextInput
            value={value.idCardPhotoUrl}
            onChange={(e) => set("idCardPhotoUrl", e.target.value)}
            placeholder="/uploads/..."
          />
        </Field>
      </Row>

      <SectionTitle icon="💰" title="급여" />
      <Row>
        <Field label="기본급 (VND)" width="200px">
          <TextInput
            type="number"
            value={value.salary}
            onChange={(e) => set("salary", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="보험번호">
          <TextInput
            value={value.insuranceNumber}
            onChange={(e) => set("insuranceNumber", e.target.value)}
          />
        </Field>
      </Row>

      <SectionTitle icon="📋" title="계약" />
      <Row>
        <Field label="계약 유형" hint="예: 정규직, 수습, 계약직">
          <TextInput
            value={value.contractType}
            onChange={(e) => set("contractType", e.target.value)}
          />
        </Field>
        <Field label="계약시작" width="180px">
          <TextInput
            type="date"
            value={value.contractStart}
            onChange={(e) => set("contractStart", e.target.value)}
          />
        </Field>
        <Field label="계약종료" width="180px">
          <TextInput
            type="date"
            value={value.contractEnd}
            onChange={(e) => set("contractEnd", e.target.value)}
          />
        </Field>
      </Row>

      <SectionTitle icon="🖼️" title="증명사진" />
      <Row>
        <Field label="증명사진 URL" hint="Phase 4 에서 파일 업로드로 대체 예정">
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
          {submitting ? "저장 중..." : mode === "create" ? "직원 등록" : "수정 저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/master/employees")}>
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
      return "사원코드 자동 생성 중 충돌이 발생했습니다. 다시 시도해 주세요.";
    case "invalid_input":
      return "입력값이 올바르지 않습니다.";
    case "invalid_department":
      return "선택한 부서가 회사와 일치하지 않습니다.";
    case "has_dependent_rows":
      return "이 직원에 연결된 이력이 있어 삭제할 수 없습니다. 상태를 '퇴사'로 변경해 주세요.";
    case "forbidden":
      return "권한이 없습니다.";
    case "not_found":
      return "직원을 찾을 수 없습니다.";
    default:
      return "저장에 실패했습니다.";
  }
}
