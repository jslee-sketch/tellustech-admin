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
        return { error: "품목코드 또는 품목명(DB 정확 일치) 필요" };
      },
    },
    { key: "serialNumber", header: "S/N", required: true, validate: (raw, _row, all) => {
        const dupCount = all.filter((r) => r["S/N"] === raw).length;
        if (dupCount > 1) return { error: "파일 내 S/N 중복" };
        return { normalized: raw };
      },
    },
    { key: "manufacturer", header: "제조사", validate: (raw) => ({ normalized: raw }) },
    { key: "monthlyBaseFee", header: "월기본료", validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: "숫자" };
        return { normalized: String(n) };
      },
    },
    { key: "bwIncludedPages", header: "흑백 기본매수", validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0) return { error: "정수 ≥0" };
        return { normalized: String(n) };
      },
    },
    { key: "bwOverageRate", header: "흑백 초과단가", validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: "숫자" };
        return { normalized: String(n) };
      },
    },
    { key: "colorIncludedPages", header: "칼라 기본매수", validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0) return { error: "정수 ≥0" };
        return { normalized: String(n) };
      },
    },
    { key: "colorOverageRate", header: "칼라 초과단가", validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: "숫자" };
        return { normalized: String(n) };
      },
    },
  ];
}

export function EquipmentImport({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRef[] | null>(null);

  useEffect(() => {
    fetch("/api/master/items").then((r) => r.json()).then((j) => setItems(j?.items ?? [])).catch(() => setItems([]));
  }, []);

  if (!items) return <div className="text-[12px] text-[color:var(--tts-muted)]">품목 참조 로드 중...</div>;

  return (
    <ExcelUploader
      title="IT 계약 장비 일괄 업로드"
      templateName="it-equipment-template.xlsx"
      columns={buildColumns(items)}
      onSave={async (rows) => {
        let ok = 0;
        let failed = 0;
        for (const r of rows) {
          const item = items.find((i) => i.itemCode === r.itemCode);
          if (!item) { failed++; continue; }
          const res = await fetch(`/api/rental/it-contracts/${contractId}/equipment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId: item.id,
              serialNumber: r.serialNumber,
              manufacturer: r.manufacturer || null,
              monthlyBaseFee: r.monthlyBaseFee || null,
              bwIncludedPages: r.bwIncludedPages ? Number(r.bwIncludedPages) : null,
              bwOverageRate: r.bwOverageRate || null,
              colorIncludedPages: r.colorIncludedPages ? Number(r.colorIncludedPages) : null,
              colorOverageRate: r.colorOverageRate || null,
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
