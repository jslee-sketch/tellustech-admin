"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExcelUploader } from "@/components/ui";
import type { UploaderColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type ItemRef = { id: string; itemCode: string; name: string };

function buildColumns(items: ItemRef[], lang: Lang): UploaderColumn[] {
  const codeSet = new Set(items.map((i) => i.itemCode));
  const nameSet = new Set(items.map((i) => i.name));
  return [
    { key: "itemCode", header: t("header.itemCode", lang), required: true, validate: (raw) => {
        if (codeSet.has(raw)) return { normalized: raw };
        if (nameSet.has(raw)) {
          const match = items.find((i) => i.name === raw);
          return { normalized: match?.itemCode ?? raw };
        }
        return { error: t("msg.itemCodeOrNameDb", lang) };
      },
    },
    { key: "options", header: t("header.itemOptions", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "serialNumber", header: t("header.serial", lang), required: true, validate: (raw, _r, all) => {
        const dup = all.filter((r) => r[t("header.serial", lang)] === raw || r["S/N"] === raw).length;
        if (dup > 1) return { error: t("msg.snDup", lang) };
        return { normalized: raw };
      },
    },
    { key: "startDate", header: t("header.startDate", lang), required: true, validate: (raw) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: t("msg.dateFormat", lang) };
        return { normalized: raw };
      },
    },
    { key: "endDate", header: t("header.endDate", lang), required: true, validate: (raw) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: t("msg.dateFormat", lang) };
        return { normalized: raw };
      },
    },
    { key: "salesPrice", header: t("header.salesPriceUnit", lang), required: true, validate: (raw) => {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: t("msg.numberGteZeroShort", lang) };
        return { normalized: String(n) };
      },
    },
    { key: "supplierName", header: t("header.supplierName", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "purchasePrice", header: t("header.purchaseAmount", lang), validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: t("msg.numberOnly", lang) };
        return { normalized: String(n) };
      },
    },
    { key: "commission", header: t("header.commissionH", lang), validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: t("msg.numberOnly", lang) };
        return { normalized: String(n) };
      },
    },
  ];
}

export function TmItemsImport({ rentalId, lang }: { rentalId: string; lang: Lang }) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRef[] | null>(null);

  useEffect(() => {
    fetch("/api/master/items").then((r) => r.json()).then((j) => setItems(j?.items ?? [])).catch(() => setItems([]));
  }, []);

  if (!items) return <div className="text-[12px] text-[color:var(--tts-muted)]">{t("msg.itemRefLoading", lang)}</div>;

  return (
    <ExcelUploader
      title={t("title.tmItemsImport", lang)}
      templateName="tm-rental-items-template.xlsx"
      columns={buildColumns(items, lang)}
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
        return { ok: false, message: t("msg.uploadResultPartial", lang).replace("{ok}", String(ok)).replace("{failed}", String(failed)) };
      }}
    />
  );
}
