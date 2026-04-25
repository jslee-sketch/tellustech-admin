"use client";

import { useRouter } from "next/navigation";
import { ExcelUploader } from "@/components/ui";
import type { UploaderColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

// 품목 일괄 업로드 — 거래처/직원 같은 참조 필드가 없어 비교적 단순.
// 품목코드(ITM-xxxx) 형식은 서버가 자동 생성하므로 업로드 시 미지정 허용 (선택).

function buildColumns(lang: Lang): UploaderColumn[] {
  return [
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
      key: "unit",
      header: t("header.unit", lang),
      validate: (raw) => ({ normalized: raw }),
    },
    {
      key: "category",
      header: t("header.category", lang),
      validate: (raw) => ({ normalized: raw }),
    },
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
        let ok = 0;
        let failed = 0;
        for (const r of rows) {
          const res = await fetch("/api/master/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: r.name,
              itemType: r.itemType,
              unit: r.unit || null,
              category: r.category || null,
            }),
          });
          if (res.ok) ok++; else failed++;
        }
        if (failed === 0) {
          router.refresh();
          return { ok: true, message: t("msg.uploadResultOk", lang).replace("{ok}", String(ok)) };
        }
        return { ok: false, message: t("msg.uploadResultPartial", lang).replace("{ok}", String(ok)).replace("{failed}", String(failed)) };
      }}
    />
  );
}
