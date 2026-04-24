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
        return { error: "품목코드/품목명 DB 불일치" };
      },
    },
    { key: "quantity", header: "수량", required: true, validate: (raw) => {
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) return { error: "양수" };
        return { normalized: String(n) };
      },
    },
    { key: "unitPrice", header: "단가", required: true, validate: (raw) => {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: "숫자 ≥0" };
        return { normalized: String(n) };
      },
    },
    { key: "serialNumber", header: "S/N", validate: (raw) => ({ normalized: raw }) },
  ];
}

export function PurchaseItemsImport({ purchaseId }: { purchaseId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRef[] | null>(null);

  useEffect(() => {
    fetch("/api/master/items").then((r) => r.json()).then((j) => setItems(j?.items ?? [])).catch(() => setItems([]));
  }, []);

  if (!items) return <div className="text-[12px] text-[color:var(--tts-muted)]">품목 참조 로드 중...</div>;

  return (
    <ExcelUploader
      title="매입 라인 일괄 업로드"
      templateName="purchase-items-template.xlsx"
      columns={buildColumns(items)}
      onSave={async (rows) => {
        let ok = 0, failed = 0;
        for (const r of rows) {
          const item = items.find((i) => i.itemCode === r.itemCode);
          if (!item) { failed++; continue; }
          const res = await fetch(`/api/purchases/${purchaseId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId: item.id,
              quantity: r.quantity,
              unitPrice: r.unitPrice,
              serialNumber: r.serialNumber || null,
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
