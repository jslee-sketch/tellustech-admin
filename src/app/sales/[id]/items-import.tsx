"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExcelUploader } from "@/components/ui";
import type { UploaderColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type ItemRef = { id: string; itemCode: string; name: string };

function buildColumns(items: ItemRef[], isCalibration: boolean, lang: Lang): UploaderColumn[] {
  const codeSet = new Set(items.map((i) => i.itemCode));
  const nameSet = new Set(items.map((i) => i.name));
  const base: UploaderColumn[] = [
    { key: "itemCode", header: t("col.itemCode", lang), required: true, validate: (raw) => {
        if (codeSet.has(raw)) return { normalized: raw };
        if (nameSet.has(raw)) {
          const match = items.find((i) => i.name === raw);
          return { normalized: match?.itemCode ?? raw };
        }
        return { error: t("msg.itemCodeNotInDb", lang) };
      },
    },
    { key: "quantity", header: t("col.qty", lang), required: true, validate: (raw) => {
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) return { error: t("msg.mustBePositive", lang) };
        return { normalized: String(n) };
      },
    },
    { key: "unitPrice", header: t("col.unitPrice", lang), required: true, validate: (raw) => {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: t("msg.mustBeNonNegative", lang) };
        return { normalized: String(n) };
      },
    },
    { key: "serialNumber", header: "S/N", validate: (raw) => ({ normalized: raw }) },
  ];
  if (isCalibration) {
    base.push(
      { key: "certNumber", header: t("field.certificateNo", lang), validate: (raw) => ({ normalized: raw }) },
      { key: "issuedAt", header: t("field.issuedAt", lang), validate: (raw) => {
          if (!raw) return { normalized: "" };
          if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: "YYYY-MM-DD" };
          return { normalized: raw };
        },
      },
    );
  }
  return base;
}

export function SalesItemsImport({ salesId, isCalibration, lang = "EN" }: { salesId: string; isCalibration: boolean; lang?: Lang }) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRef[] | null>(null);

  useEffect(() => {
    fetch("/api/master/items").then((r) => r.json()).then((j) => setItems(j?.items ?? [])).catch(() => setItems([]));
  }, []);

  if (!items) return <div className="text-[12px] text-[color:var(--tts-muted)]">{t("common.itemRefLoading", lang)}</div>;

  return (
    <ExcelUploader
      lang={lang}
      title={isCalibration ? t("title.salesLinesAndCertImport", lang) : t("title.salesLinesImport", lang)}
      templateName="sales-items-template.xlsx"
      columns={buildColumns(items, isCalibration, lang)}
      onSave={async (rows) => {
        let ok = 0, failed = 0;
        for (const r of rows) {
          const item = items.find((i) => i.itemCode === r.itemCode);
          if (!item) { failed++; continue; }
          const res = await fetch(`/api/sales/${salesId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId: item.id,
              quantity: r.quantity,
              unitPrice: r.unitPrice,
              serialNumber: r.serialNumber || null,
              ...(isCalibration
                ? { certNumber: r.certNumber || null, issuedAt: r.issuedAt || null }
                : {}),
            }),
          });
          if (res.ok) ok++; else failed++;
        }
        if (failed === 0) { router.refresh(); return { ok: true }; }
        return { ok: false, message: t("ph.salesItemsImportFailed", lang).replace("{ok}", String(ok)).replace("{failed}", String(failed)) };
      }}
    />
  );
}
