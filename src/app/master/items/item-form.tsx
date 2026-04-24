"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput } from "@/components/ui";

export type ItemFormValue = {
  id?: string;
  itemCode?: string;
  itemType: string;
  name: string;
  unit: string;
  category: string;
};

type Props = {
  mode: "create" | "edit";
  initial: ItemFormValue;
};

export function ItemForm({ mode, initial }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<ItemFormValue>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ItemFormValue>(k: K, v: ItemFormValue[K]) =>
    setValue((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint =
        mode === "create" ? "/api/master/items" : `/api/master/items/${value.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      if (!/^[\x20-\x7E]+$/.test(value.name)) {
        setError("품목명은 영어(ASCII)로만 입력할 수 있습니다.");
        setSubmitting(false);
        return;
      }
      const body = {
        itemType: value.itemType,
        name: value.name,
        unit: value.unit || null,
        category: value.category || null,
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
      router.push("/master/items");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!value.id) return;
    if (!window.confirm("이 품목을 삭제하시겠습니까?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/items/${value.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(data.details?.message ?? mapError(data.error));
        return;
      }
      router.push("/master/items");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {mode === "create" && (
        <Note tone="info">품목코드는 저장 시 자동 생성됩니다 — 형식: ITM-YYMMDD-###</Note>
      )}
      {mode === "edit" && value.itemCode && (
        <div className="mb-3 text-[12px] text-[color:var(--tts-muted)]">
          품목코드: <span className="font-mono text-[color:var(--tts-primary)]">{value.itemCode}</span>
        </div>
      )}

      <Row>
        <Field label="구분" required width="160px">
          <Select
            required
            value={value.itemType}
            onChange={(e) => set("itemType", e.target.value)}
            placeholder="선택"
            options={[
              { value: "PRODUCT", label: "상품" },
              { value: "CONSUMABLE", label: "소모품" },
              { value: "PART", label: "부품" },
            ]}
          />
        </Field>
        <Field label="단위 (옵션)" width="140px" hint="예: ea, box, L">
          <TextInput value={value.unit} onChange={(e) => set("unit", e.target.value)} placeholder="ea" />
        </Field>
        <Field label="카테고리 (옵션)" hint="예: D330 토너, T&M">
          <TextInput
            value={value.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="자유 입력"
          />
        </Field>
      </Row>

      <Row>
        <Field label="품목명 (영어 전용)" required hint="ASCII 영문·숫자·공백만 입력 가능">
          <TextInput
            required
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Toner Black D330/D331"
            pattern="[\\x20-\\x7E]+"
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
          {submitting ? "저장 중..." : mode === "create" ? "품목 등록" : "수정 저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/master/items")}>
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
      return "동일한 품목코드가 존재합니다 (자동 생성 중 충돌). 다시 시도해 주세요.";
    case "invalid_input":
      return "입력값이 올바르지 않습니다.";
    case "has_dependent_rows":
      return "이 품목에 연결된 재고·거래 이력이 있어 삭제할 수 없습니다.";
    case "not_found":
      return "품목을 찾을 수 없습니다.";
    default:
      return "저장에 실패했습니다.";
  }
}
