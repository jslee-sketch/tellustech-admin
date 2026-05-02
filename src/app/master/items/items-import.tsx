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
    { key: "itemCode", header: lang === "KO" ? "품목코드(빈값=자동)" : "itemCode (blank=auto)", validate: (raw) => ({ normalized: raw }) },
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
      validate: (raw) => raw && raw.trim() ? { normalized: raw.trim() } : { error: lang === "VI" ? "Bắt buộc nhập" : lang === "EN" ? "Required" : "필수 입력" },
    },
    { key: "unit", header: t("header.unit", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "reorderPoint", header: lang === "KO" ? "재발주점" : "reorderPoint", validate: (raw) => raw === "" ? { normalized: "" } : (Number.isFinite(Number(raw)) && Number.isInteger(Number(raw)) && Number(raw) >= 0 ? { normalized: raw } : { error: "integer ≥ 0" }) },
    { key: "colorChannel", header: t("item.colorChannel", lang), validate: (raw) => raw === "" ? { normalized: "" } : (COLOR_CHANNELS.includes(raw.toUpperCase()) ? { normalized: raw.toUpperCase() } : { error: COLOR_CHANNELS.join("|") }) },
    { key: "expectedYield", header: t("yield.expectedYield", lang), validate: (raw) => raw === "" ? { normalized: "" } : (Number.isFinite(Number(raw)) && Number(raw) >= 0 ? { normalized: raw } : { error: "number ≥ 0" }) },
    { key: "yieldCoverageBase", header: t("yield.coverageBase", lang), validate: (raw) => raw === "" ? { normalized: "" } : (Number.isFinite(Number(raw)) && Number(raw) >= 1 && Number(raw) <= 100 ? { normalized: raw } : { error: "1~100" }) },
    { key: "compatibleItemCodes", header: lang === "KO" ? "호환장비코드(;구분)" : "compatibleItemCodes (;)", validate: (raw) => ({ normalized: raw }) },
    { key: "parentItemCode", header: lang === "KO" ? "상위품목코드" : "parentItemCode", validate: (raw) => ({ normalized: raw }) },
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
          return `  · ${lang === "VI" ? "Hàng" : lang === "EN" ? "Row" : "행"} ${e.row}${code}: ${fieldLabel} — ${reasonLabel}`;
        });
        const more = errors.length > 20 ? `\n  ... +${errors.length - 20}` : "";
        return { ok: false, message: `${head}\n${lines.join("\n")}${more}` };
      }}
    />
  );
}

function fieldDisplay(field: string, lang: Lang): string {
  const map: Record<string, { vi: string; en: string; ko: string }> = {
    itemType:             { vi: "Loại sản phẩm", en: "Item Type",    ko: "품목 유형" },
    name:                 { vi: "Tên sản phẩm",  en: "Item Name",    ko: "품목명" },
    description:          { vi: "Mô tả",         en: "Description",  ko: "설명" },
    compatibleItemCodes:  { vi: "Mã thiết bị tương thích", en: "Compatible Equipment Codes", ko: "호환 장비 코드" },
    colorChannel:         { vi: "Kênh màu",      en: "Color Channel",ko: "색상 채널" },
    expectedYield:        { vi: "Số trang định mức", en: "Rated Yield", ko: "정격 출력장수" },
    yieldCoverageBase:    { vi: "Mật độ chuẩn",  en: "Base Coverage",ko: "기준 상밀도" },
    parentItemCode:       { vi: "Mã sản phẩm cha", en: "Parent Item Code", ko: "상위 품목 코드" },
  };
  const e = map[field];
  if (!e) return field;
  return e[lang === "VI" ? "vi" : lang === "EN" ? "en" : "ko"];
}

function reasonDisplay(reason: string, lang: Lang): string {
  switch (reason) {
    case "missing_required":
      return lang === "VI" ? "Trường bắt buộc — chưa nhập" : lang === "EN" ? "Required — missing" : "필수 항목인데 비어있음";
    case "missing_required_for_consumable_part":
      return lang === "VI"
        ? "Vật tư/Linh kiện cần ít nhất 1 thiết bị tương thích"
        : lang === "EN"
          ? "Consumable/Part requires at least 1 compatible equipment"
          : "소모품/부품은 최소 1개의 호환 장비 필수";
    case "invalid_value":
      return lang === "VI" ? "Giá trị không hợp lệ" : lang === "EN" ? "Invalid value" : "올바르지 않은 값";
    default:
      return reason;
  }
}
