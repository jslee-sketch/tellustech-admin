"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button, Field, ItemCombobox, Note, Row, Select, TextInput, Textarea } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type ItemFormValue = {
  id?: string;
  itemCode?: string;
  itemType: string;
  name: string;
  unit: string;
  description: string;          // 구 category. 필수.
  expectedYield?: string;       // 정격 출력장수 (CONSUMABLE/PART)
  yieldCoverageBase?: string;
  colorChannel?: string;        // BLACK/CYAN/MAGENTA/YELLOW/DRUM/FUSER/NONE
  compatibleItemIds?: string[]; // CONSUMABLE/PART 시 호환 PRODUCT id 들
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
  // 호환 장비 입력 보조 — 임시 선택 itemId, label 캐시.
  const [compatPick, setCompatPick] = useState("");
  const [compatLabels, setCompatLabels] = useState<Record<string, { code: string; name: string }>>({});

  const set = <K extends keyof ItemFormValue>(k: K, v: ItemFormValue[K]) =>
    setValue((p) => ({ ...p, [k]: v }));

  // edit 모드 진입 시 호환 장비 라벨 미리 로드 (초기 ID 만 있을 때).
  useEffect(() => {
    const ids = initial.compatibleItemIds ?? [];
    if (ids.length === 0) return;
    Promise.all(ids.map((id) => fetch(`/api/master/items?q=${encodeURIComponent(id)}`).then((r) => r.json()).catch(() => null)))
      .then(() => undefined);
    // 별도 라벨 fetch — items API 가 q 로 ID 검색 안 되므로 각 ID 를 직접:
    Promise.all(ids.map((id) => fetch(`/api/master/items/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then((arr) => {
        const m: Record<string, { code: string; name: string }> = {};
        for (const j of arr) {
          if (j?.item) m[j.item.id] = { code: j.item.itemCode, name: j.item.name };
        }
        setCompatLabels(m);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isConsumablePart = value.itemType === "CONSUMABLE" || value.itemType === "PART";

  function addCompat(id: string) {
    if (!id) return;
    const cur = value.compatibleItemIds ?? [];
    if (cur.includes(id)) return;
    set("compatibleItemIds", [...cur, id]);
    // 라벨 즉시 fetch
    fetch(`/api/master/items/${id}`).then((r) => r.ok ? r.json() : null).then((j) => {
      if (j?.item) setCompatLabels((p) => ({ ...p, [j.item.id]: { code: j.item.itemCode, name: j.item.name } }));
    });
    setCompatPick("");
  }
  function removeCompat(id: string) {
    set("compatibleItemIds", (value.compatibleItemIds ?? []).filter((x) => x !== id));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint = mode === "create" ? "/api/master/items" : `/api/master/items/${value.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      if (!/^[\x20-\x7E]+$/.test(value.name)) {
        setError(t("msg.itemAsciiOnly", lang));
        setSubmitting(false);
        return;
      }
      if (!value.description?.trim()) {
        setError(t("item.descriptionRequired", lang));
        setSubmitting(false);
        return;
      }
      if (isConsumablePart && (value.compatibleItemIds ?? []).length === 0 && mode === "create") {
        setError(t("item.compatRequired", lang));
        setSubmitting(false);
        return;
      }
      const body = {
        itemType: value.itemType,
        name: value.name,
        unit: value.unit || null,
        description: value.description,
        expectedYield: isConsumablePart && value.expectedYield ? Number(value.expectedYield) : null,
        yieldCoverageBase: isConsumablePart && value.yieldCoverageBase ? Number(value.yieldCoverageBase) : null,
        colorChannel: isConsumablePart && value.colorChannel ? value.colorChannel : null,
        compatibleItemIds: isConsumablePart ? (value.compatibleItemIds ?? []) : [],
      };
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string; reason?: string } };
        if (data.details?.reason === "required_for_consumable_part") {
          setError(t("item.compatRequired", lang));
        } else {
          setError(data.details?.message ?? mapError(data.error, lang));
        }
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

      <Row>
        <Field label={t("item.description", lang)} required>
          <Textarea
            required
            rows={2}
            value={value.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder={lang === "VI" ? "VD: Mực đen tương thích D330/D320" : lang === "EN" ? "e.g. Black toner for D330/D320" : "예: D330/D320 호환 흑백 토너"}
          />
        </Field>
      </Row>

      {isConsumablePart && (
        <div className="mt-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)]/40 p-3">
          <div className="mb-2 text-[12px] font-bold text-[color:var(--tts-sub)]">
            {t("yield.section.title", lang)}
          </div>
          <Row>
            <Field label={t("item.colorChannel", lang)} width="180px">
              <Select
                value={value.colorChannel ?? ""}
                onChange={(e) => set("colorChannel", e.target.value)}
                placeholder={t("placeholder.select", lang)}
                options={[
                  { value: "BLACK",   label: "🖤 BLACK" },
                  { value: "CYAN",    label: "🩵 CYAN" },
                  { value: "MAGENTA", label: "💗 MAGENTA" },
                  { value: "YELLOW",  label: "💛 YELLOW" },
                  { value: "DRUM",    label: "🥁 DRUM" },
                  { value: "FUSER",   label: "🔥 FUSER" },
                  { value: "NONE",    label: "— NONE" },
                ]}
              />
            </Field>
            <Field label={t("yield.expectedYield", lang)} width="220px" hint={t("yield.expectedYieldHint", lang)}>
              <TextInput
                type="number"
                min="0"
                step="100"
                value={value.expectedYield ?? ""}
                onChange={(e) => set("expectedYield", e.target.value)}
                placeholder="25000"
              />
            </Field>
            <Field label={t("yield.coverageBase", lang)} width="140px" hint={t("yield.coverageBaseHint", lang)}>
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

          <div className="mt-3 border-t border-[color:var(--tts-border)] pt-3">
            <div className="mb-1 text-[12px] font-bold text-[color:var(--tts-sub)]">
              {t("item.compatibleEquipment", lang)} <span className="text-[color:var(--tts-danger)]">*</span>
            </div>
            <Note tone="warn">{t("item.compatRequired", lang)}</Note>
            <Row>
              <Field label="" width="100%">
                <ItemCombobox
                  value={compatPick}
                  onChange={(id) => addCompat(id)}
                  itemType="PRODUCT"
                  lang={lang}
                />
              </Field>
            </Row>
            <ul className="mt-2 space-y-1">
              {(value.compatibleItemIds ?? []).map((id) => {
                const lbl = compatLabels[id];
                return (
                  <li key={id} className="flex items-center justify-between rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] px-2 py-1 text-[12px]">
                    <span><span className="font-mono text-[color:var(--tts-primary)]">{lbl?.code ?? id}</span> · {lbl?.name ?? ""}</span>
                    <button type="button" onClick={() => removeCompat(id)} className="text-[color:var(--tts-danger)] hover:underline">×</button>
                  </li>
                );
              })}
              {(value.compatibleItemIds ?? []).length === 0 && (
                <li className="px-2 py-1 text-[11px] text-[color:var(--tts-muted)]">{lang === "VI" ? "Chưa có thiết bị tương thích" : lang === "EN" ? "No compatible equipment yet" : "등록된 호환 장비 없음"}</li>
              )}
            </ul>
          </div>
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
