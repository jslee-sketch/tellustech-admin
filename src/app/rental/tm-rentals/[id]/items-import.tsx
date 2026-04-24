"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExcelUploader } from "@/components/ui";
import type { UploaderColumn } from "@/components/ui";

type ItemRef = { id: string; itemCode: string; name: string };

function buildColumns(items: ItemRef[]): UploaderColumn[] {
  const codeSet = new Set(items.map((i) => i.itemCode));
  const nameSet = new Set(items.map((i) => i.name));
  return [
    { key: "itemCode", header: "품목코드", required: true, validate: (raw) => {
        if (codeSet.has(raw)) return { normalized: raw };
        if (nameSet.has(raw)) {
          const match = items.find((i) => i.name === raw);
          return { normalized: match?.itemCode ?? raw };
        }
        return { error: "품목코드/품목명 DB에 없음" };
      },
    },
    { key: "options", header: "옵션", validate: (raw) => ({ normalized: raw }) },
    { key: "serialNumber", header: "S/N", required: true, validate: (raw, _r, all) => {
        const dup = all.filter((r) => r["S/N"] === raw).length;
        if (dup > 1) return { error: "파일 내 S/N 중복" };
        return { normalized: raw };
      },
    },
    { key: "startDate", header: "렌탈시작일", required: true, validate: (raw) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: "YYYY-MM-DD" };
        return { normalized: raw };
      },
    },
    { key: "endDate", header: "렌탈종료일", required: true, validate: (raw) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: "YYYY-MM-DD" };
        return { normalized: raw };
      },
    },
    { key: "salesPrice", header: "매출단가", required: true, validate: (raw) => {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: "숫자 ≥0" };
        return { normalized: String(n) };
      },
    },
    { key: "supplierName", header: "매입처", validate: (raw) => ({ normalized: raw }) },
    { key: "purchasePrice", header: "매입금액", validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: "숫자" };
        return { normalized: String(n) };
      },
    },
    { key: "commission", header: "커미션", validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: "숫자" };
        return { normalized: String(n) };
      },
    },
  ];
}

export function TmItemsImport({ rentalId }: { rentalId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRef[] | null>(null);

  useEffect(() => {
    fetch("/api/master/items").then((r) => r.json()).then((j) => setItems(j?.items ?? [])).catch(() => setItems([]));
  }, []);

  if (!items) return <div className="text-[12px] text-[color:var(--tts-muted)]">품목 참조 로드 중...</div>;

  return (
    <ExcelUploader
      title="TM 렌탈 품목 일괄 업로드"
      templateName="tm-rental-items-template.xlsx"
      columns={buildColumns(items)}
      onSave={async (rows) => {
        let ok = 0, failed = 0;
        for (const r of rows) {
          const item = items.find((i) => i.itemCode === r.itemCode);
          if (!item) { failed++; continue; }
          const res = await fetch(`/api/rental/tm-rentals/${rentalId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId: item.id,
              options: r.options || null,
              serialNumber: r.serialNumber,
              startDate: r.startDate,
              endDate: r.endDate,
              salesPrice: r.salesPrice,
              supplierName: r.supplierName || null,
              purchasePrice: r.purchasePrice || null,
              commission: r.commission || null,
            }),
          });
          if (res.ok) ok++; else failed++;
        }
        if (failed === 0) { router.refresh(); return { ok: true }; }
        return { ok: false, message: `${ok}건 성공 · ${failed}건 실패` };
      }}
    />
  );
}
