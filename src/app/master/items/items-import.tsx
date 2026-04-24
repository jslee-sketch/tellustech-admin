"use client";

import { useRouter } from "next/navigation";
import { ExcelUploader } from "@/components/ui";
import type { UploaderColumn } from "@/components/ui";

// 품목 일괄 업로드 — 거래처/직원 같은 참조 필드가 없어 비교적 단순.
// 품목코드(ITM-xxxx) 형식은 서버가 자동 생성하므로 업로드 시 미지정 허용 (선택).

const columns: UploaderColumn[] = [
  {
    key: "name",
    header: "품목명",
    required: true,
    validate: (raw) => {
      if (!/^[\x20-\x7E]+$/.test(raw)) return { error: "영어(ASCII)만" };
      return { normalized: raw };
    },
  },
  {
    key: "itemType",
    header: "구분",
    required: true,
    validate: (raw) => {
      const v = raw.toUpperCase();
      if (!["PRODUCT", "CONSUMABLE", "PART"].includes(v)) return { error: "PRODUCT|CONSUMABLE|PART" };
      return { normalized: v };
    },
  },
  {
    key: "unit",
    header: "단위",
    validate: (raw) => ({ normalized: raw }),
  },
  {
    key: "category",
    header: "카테고리",
    validate: (raw) => ({ normalized: raw }),
  },
];

export function ItemsImport() {
  const router = useRouter();
  return (
    <ExcelUploader
      title="품목 일괄 업로드"
      templateName="items-template.xlsx"
      columns={columns}
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
          return { ok: true, message: `${ok}건 저장 완료` };
        }
        return { ok: false, message: `${ok}건 성공 · ${failed}건 실패` };
      }}
    />
  );
}
