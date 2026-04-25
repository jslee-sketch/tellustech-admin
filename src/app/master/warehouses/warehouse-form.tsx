"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Field, Row, Select, TextInput } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

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
  lang: Lang;
};

export function WarehouseForm({ mode, initial, lang }: Props) {
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
        setError(data.details?.message ?? mapError(data.error, lang));
        return;
      }
      router.push("/master/warehouses");
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!value.id) return;
    if (!window.confirm(t("msg.warehouseDeleteConfirm", lang))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/warehouses/${value.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(data.details?.message ?? mapError(data.error, lang));
        return;
      }
      router.push("/master/warehouses");
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Row>
        <Field label={t("field.warehouseCodeField", lang)} required hint={t("hint.warehouseCodeExample", lang)} width="200px">
          <TextInput
            required
            value={value.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="BNIT"
          />
        </Field>
        <Field label={t("field.warehouseNameField", lang)} required>
          <TextInput
            required
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Tellustech Vina BN IT"
          />
        </Field>
      </Row>
      <Row>
        <Field label={t("field.warehouseTypeField", lang)} required width="160px">
          <Select
            required
            value={value.warehouseType}
            onChange={(e) => set("warehouseType", e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={[
              { value: "INTERNAL", label: t("whType.INTERNAL", lang) },
              { value: "EXTERNAL", label: t("whType.EXTERNAL", lang) },
              { value: "CLIENT", label: t("whType.CLIENT", lang) },
            ]}
          />
        </Field>
        <Field label={t("field.branchTypeOpt", lang)} width="200px">
          <Select
            value={value.branchType}
            onChange={(e) => set("branchType", e.target.value)}
            placeholder={t("placeholder.notSelectedShort", lang)}
            options={[
              { value: "BN", label: "BN (Bắc Ninh)" },
              { value: "HN", label: "HN (Hà Nội)" },
              { value: "HCM", label: "HCM (Hồ Chí Minh)" },
              { value: "NT", label: "NT (Nha Trang)" },
              { value: "DN", label: "DN (Đà Nẵng)" },
            ]}
          />
        </Field>
        <Field label={t("field.locationOpt", lang)}>
          <TextInput
            value={value.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder={t("placeholder.warehouseAddress", lang)}
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
          {submitting ? t("action.saving", lang) : mode === "create" ? t("btn.warehouseRegister", lang) : t("action.update", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/master/warehouses")}>
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
      return t("msg.warehouseDup", lang);
    case "invalid_input":
      return t("msg.invalidInput", lang);
    case "has_dependent_rows":
      return t("msg.warehouseHasStock", lang);
    case "not_found":
      return t("msg.warehouseNotFound", lang);
    default:
      return t("msg.saveFailed", lang);
  }
}
