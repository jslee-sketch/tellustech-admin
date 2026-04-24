"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Row, Select, TextInput } from "@/components/ui";

export type WarehouseFormValue = {
  id?: string;
  code: string;
  name: string;
  warehouseType: string;
  branchType: string;
  location: string;
};

type Props = {
  mode: "create" | "edit";
  initial: WarehouseFormValue;
};

export function WarehouseForm({ mode, initial }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<WarehouseFormValue>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof WarehouseFormValue>(k: K, v: WarehouseFormValue[K]) =>
    setValue((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint =
        mode === "create"
          ? "/api/master/warehouses"
          : `/api/master/warehouses/${value.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body = {
        code: value.code,
        name: value.name,
        warehouseType: value.warehouseType,
        branchType: value.branchType || null,
        location: value.location || null,
      };
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
      router.push("/master/warehouses");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!value.id) return;
    if (!window.confirm("이 창고를 삭제하시겠습니까?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/warehouses/${value.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(data.details?.message ?? mapError(data.error));
        return;
      }
      router.push("/master/warehouses");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Row>
        <Field label="창고코드" required hint="예: BNIT, HNIT" width="200px">
          <TextInput
            required
            value={value.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="BNIT"
          />
        </Field>
        <Field label="창고명" required>
          <TextInput
            required
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Tellustech Vina BN IT"
          />
        </Field>
      </Row>
      <Row>
        <Field label="유형" required width="160px">
          <Select
            required
            value={value.warehouseType}
            onChange={(e) => set("warehouseType", e.target.value)}
            placeholder="선택"
            options={[
              { value: "INTERNAL", label: "내부" },
              { value: "EXTERNAL", label: "외부" },
              { value: "CLIENT", label: "고객" },
            ]}
          />
        </Field>
        <Field label="지점 (옵션)" width="200px">
          <Select
            value={value.branchType}
            onChange={(e) => set("branchType", e.target.value)}
            placeholder="선택 안 함"
            options={[
              { value: "BN", label: "BN (Bắc Ninh)" },
              { value: "HN", label: "HN (Hà Nội)" },
              { value: "HCM", label: "HCM (Hồ Chí Minh)" },
              { value: "NT", label: "NT (Nha Trang)" },
              { value: "DN", label: "DN (Đà Nẵng)" },
            ]}
          />
        </Field>
        <Field label="위치 (옵션)">
          <TextInput
            value={value.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="주소 또는 상세 위치"
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
          {submitting ? "저장 중..." : mode === "create" ? "창고 등록" : "수정 저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/master/warehouses")}>
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
      return "동일한 창고코드가 이미 존재합니다.";
    case "invalid_input":
      return "입력값이 올바르지 않습니다.";
    case "has_dependent_rows":
      return "이 창고에 연결된 재고가 있어 삭제할 수 없습니다.";
    case "not_found":
      return "창고를 찾을 수 없습니다.";
    default:
      return "저장에 실패했습니다.";
  }
}
