"use client";

import { useRouter } from "next/navigation";
import { ExcelUploader } from "@/components/ui";
import type { UploaderColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

// 품목 일괄 업로드 — 15컬럼.
// Phase 1: 품목 생성 (parentItemId 보류)
// Phase 2: 호환 매핑 (compatibleItemCodes)
// Phase 3: BOM 부모 연결 (parentItemCode)

const COLOR_CHANNELS = ["BLACK", "CYAN", "MAGENTA", "YELLOW", "DRUM", "FUSER", "NONE"];

function buildColumns(lang: Lang): UploaderColumn[] {
  return [
    { key: "itemCode", header: t("itemsImport.headerItemCode", lang), validate: (raw) => ({ normalized: raw }) },
    {
      key: "itemType",
      header: t("header.itemType", lang),
      required: true,
      validate: (raw) => {
        const v = raw.toUpperCase();
        if (!["PRODUCT", "CONSUMABLE", "PART", "SUPPLIES"].includes(v)) return { error: "PRODUCT|CONSUMABLE|PART|SUPPLIES" };
        return { normalized: v };
      },
    },
    {
      key: "name",
      header: t("header.itemName", lang),
      required: true,
      validate: (raw) => {
        if (!/^[\x20-\x7E]+$/.test(raw)) return { error: t("msg.uploadAsciiOnly", lang) };
        return { normalized: raw };
      },
    },
    {
      key: "description",
      header: t("item.description", lang),
      required: true,
      validate: (raw) => raw && raw.trim() ? { normalized: raw.trim() } : { error: t("itemsImport.errRequired", lang) },
    },
    { key: "unit", header: t("header.unit", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "reorderPoint", header: t("itemsImport.headerReorderPoint", lang), validate: (raw) => raw === "" ? { normalized: "" } : (Number.isFinite(Number(raw)) && Number.isInteger(Number(raw)) && Number(raw) >= 0 ? { normalized: raw } : { error: "integer ≥ 0" }) },
    { key: "colorChannel", header: t("item.colorChannel", lang), validate: (raw) => raw === "" ? { normalized: "" } : (COLOR_CHANNELS.includes(raw.toUpperCase()) ? { normalized: raw.toUpperCase() } : { error: COLOR_CHANNELS.join("|") }) },
    { key: "expectedYield", header: t("yield.expectedYield", lang), validate: (raw) => raw === "" ? { normalized: "" } : (Number.isFinite(Number(raw)) && Number(raw) >= 0 ? { normalized: raw } : { error: "number ≥ 0" }) },
    { key: "yieldCoverageBase", header: t("yield.coverageBase", lang), validate: (raw) => raw === "" ? { normalized: "" } : (Number.isFinite(Number(raw)) && Number(raw) >= 1 && Number(raw) <= 100 ? { normalized: raw } : { error: "1~100" }) },
    { key: "compatibleItemCodes", header: t("itemsImport.headerCompatibleItemCodes", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "parentItemCode", header: t("itemsImport.headerParentItemCode", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "bomQuantity", header: t("item.bomQuantity", lang), validate: (raw) => raw === "" ? { normalized: "" } : (Number.isFinite(Number(raw)) && Number(raw) > 0 ? { normalized: raw } : { error: "> 0" }) },
    { key: "bomNote", header: t("item.bomNote", lang), validate: (raw) => ({ normalized: raw }) },
  ];
}

export function ItemsImport({ lang }: { lang: Lang }) {
  const router = useRouter();
  return (
    <ExcelUploader
      title={t("title.itemsImport", lang)}
      templateName="items-template.xlsx"
      columns={buildColumns(lang)}
      onSave={async (rows) => {
        const r = await fetch("/api/master/items/bulk-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ rows }),
        });
        const j = await r.json();
        if (!r.ok) return { ok: false, message: j?.error ?? "upload_failed" };
        router.refresh();
        const okCount = j?.created ?? 0;
        const failedCount = j?.failed ?? 0;
        const errors: Array<{ row: number; itemCode?: string; field: string; reason: string }> = j?.errors ?? [];

        if (failedCount === 0) return { ok: true, message: t("msg.uploadResultOk", lang).replace("{ok}", String(okCount)) };

        // 행별 누락/오류 상세 메시지
        const head = t("msg.uploadResultPartial", lang).replace("{ok}", String(okCount)).replace("{failed}", String(failedCount));
        const lines = errors.slice(0, 20).map((e) => {
          const fieldLabel = fieldDisplay(e.field, lang);
          const reasonLabel = reasonDisplay(e.reason, lang);
          const code = e.itemCode ? ` (${e.itemCode})` : "";
          return `  · ${t("itemsImport.row", lang)} ${e.row}${code}: ${fieldLabel} — ${reasonLabel}`;
        });
        const more = errors.length > 20 ? `\n  ... +${errors.length - 20}` : "";
        return { ok: false, message: `${head}\n${lines.join("\n")}${more}` };
      }}
    />
  );
}

function fieldDisplay(field: string, lang: Lang): string {
  const keyMap: Record<string, string> = {
    itemType:            "itemsImport.fieldItemType",
    name:                "itemsImport.fieldName",
    description:         "itemsImport.fieldDescription",
    compatibleItemCodes: "itemsImport.fieldCompatibleItemCodes",
    colorChannel:        "itemsImport.fieldColorChannel",
    expectedYield:       "itemsImport.fieldExpectedYield",
    yieldCoverageBase:   "itemsImport.fieldYieldCoverageBase",
    parentItemCode:      "itemsImport.fieldParentItemCode",
  };
  const k = keyMap[field];
  if (!k) return field;
  return t(k, lang);
}

function reasonDisplay(reason: string, lang: Lang): string {
  switch (reason) {
    case "missing_required":
      return t("itemsImport.reasonMissingRequired", lang);
    case "missing_required_for_consumable_part":
      return t("itemsImport.reasonMissingCompat", lang);
    case "invalid_value":
      return t("itemsImport.reasonInvalidValue", lang);
    default:
      return reason;
  }
}
