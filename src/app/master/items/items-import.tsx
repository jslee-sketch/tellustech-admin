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
        if (!["PRODUCT", "CONSUMABLE", "PART"].includes(v)) return { error: "PRODUCT|CONSUMABLE|PART" };
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
    { key: "description", header: t("item.description", lang), required: true, validate: (raw) => ({ normalized: raw }) },
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
        // 3-phase 처리. 서버 일괄 엔드포인트 호출.
        const r = await fetch("/api/master/items/bulk-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ rows }),
        });
        const j = await r.json();
        if (!r.ok) return { ok: false, message: j?.error ?? t("msg.uploadResultPartial", lang).replace("{ok}", "0").replace("{failed}", String(rows.length)) };
        router.refresh();
        const okCount = j?.created ?? 0;
        const failedCount = j?.failed ?? 0;
        if (failedCount === 0) return { ok: true, message: t("msg.uploadResultOk", lang).replace("{ok}", String(okCount)) };
        return { ok: false, message: t("msg.uploadResultPartial", lang).replace("{ok}", String(okCount)).replace("{failed}", String(failedCount)) };
      }}
    />
  );
}
