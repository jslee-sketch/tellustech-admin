"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Note, Row, Select, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type ItemFormValue = {
  id?: string;
  itemCode?: string;
  itemType: string;
  name: string;
  unit: string;
  category: string;
  expectedYield?: string;       // 정격 출력장수 (CONSUMABLE/PART 만)
  yieldCoverageBase?: string;   // 기준 상밀도 (%, 기본 5)
};

type Props = {
  mode: "create" | "edit";
  initial: ItemFormValue;
  lang: Lang;
};

export function ItemForm({ mode, initial, lang }: Props) {
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
        setError(t("msg.itemAsciiOnly", lang));
        setSubmitting(false);
        return;
      }
      const isConsumable = value.itemType === "CONSUMABLE" || value.itemType === "PART";
      const body = {
        itemType: value.itemType,
        name: value.name,
        unit: value.unit || null,
        category: value.category || null,
        expectedYield: isConsumable && value.expectedYield ? Number(value.expectedYield) : null,
        yieldCoverageBase: isConsumable && value.yieldCoverageBase ? Number(value.yieldCoverageBase) : null,
      };
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
      router.push("/master/items");
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!value.id) return;
    if (!window.confirm(t("msg.itemDeleteConfirm", lang))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/items/${value.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(data.details?.message ?? mapError(data.error, lang));
        return;
      }
      router.push("/master/items");
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {mode === "create" && (
        <Note tone="info">{t("note.itemAutoCode", lang)}</Note>
      )}
      {mode === "edit" && value.itemCode && (
        <div className="mb-3 text-[12px] text-[color:var(--tts-muted)]">
          {t("label.itemCodeShort", lang)} <span className="font-mono text-[color:var(--tts-primary)]">{value.itemCode}</span>
        </div>
      )}

      <Row>
        <Field label={t("field.itemTypeField", lang)} required width="160px">
          <Select
            required
            value={value.itemType}
            onChange={(e) => set("itemType", e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={[
              { value: "PRODUCT", label: t("itemType.PRODUCT", lang) },
              { value: "CONSUMABLE", label: t("itemType.CONSUMABLE", lang) },
              { value: "PART", label: t("itemType.PART", lang) },
            ]}
          />
        </Field>
        <Field label={t("field.unitOpt", lang)} width="140px" hint={t("hint.unitExample", lang)}>
          <TextInput value={value.unit} onChange={(e) => set("unit", e.target.value)} placeholder="ea" />
        </Field>
        <Field label={t("field.categoryOpt", lang)} hint={t("hint.categoryExample", lang)}>
          <TextInput
            value={value.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder={t("placeholder.note", lang)}
          />
        </Field>
      </Row>

      <Row>
        <Field label={t("field.itemNameAscii", lang)} required hint={t("hint.itemNameAscii", lang)}>
          <TextInput
            required
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Toner Black D330/D331"
            pattern="[\\x20-\\x7E]+"
          />
        </Field>
      </Row>

      {(value.itemType === "CONSUMABLE" || value.itemType === "PART") && (
        <div className="mt-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)]/40 p-3">
          <div className="mb-2 text-[12px] font-bold text-[color:var(--tts-sub)]">
            {t("yield.section.title", lang)}
          </div>
          <Row>
            <Field label={t("yield.expectedYield", lang)} width="240px" hint={t("yield.expectedYieldHint", lang)}>
              <TextInput
                type="number"
                min="0"
                step="100"
                value={value.expectedYield ?? ""}
                onChange={(e) => set("expectedYield", e.target.value)}
                placeholder="25000"
              />
            </Field>
            <Field label={t("yield.coverageBase", lang)} width="160px" hint={t("yield.coverageBaseHint", lang)}>
              <TextInput
                type="number"
                min="1"
                max="100"
                step="1"
                value={value.yieldCoverageBase ?? "5"}
                onChange={(e) => set("yieldCoverageBase", e.target.value)}
                placeholder="5"
              />
            </Field>
          </Row>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("action.saving", lang) : mode === "create" ? t("page.items.new", lang) : t("action.update", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/master/items")}>
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
      return t("msg.itemDuplicate", lang);
    case "invalid_input":
      return t("msg.invalidInput", lang);
    case "has_dependent_rows":
      return t("msg.itemHasDeps", lang);
    case "not_found":
      return t("msg.itemNotFound", lang);
    default:
      return t("msg.saveFailed", lang);
  }
}
