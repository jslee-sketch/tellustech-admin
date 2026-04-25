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
        return { error: t("msg.itemCodeOrName", lang) };
      },
    },
    { key: "serialNumber", header: t("header.serial", lang), required: true, validate: (raw, _row, all) => {
        const dupCount = all.filter((r) => r[t("header.serial", lang)] === raw || r["S/N"] === raw).length;
        if (dupCount > 1) return { error: t("msg.snDup", lang) };
        return { normalized: raw };
      },
    },
    { key: "manufacturer", header: t("header.manufacturer", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "monthlyBaseFee", header: t("header.monthlyBaseFeeH", lang), validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: t("msg.numberOnly", lang) };
        return { normalized: String(n) };
      },
    },
    { key: "bwIncludedPages", header: t("header.bwIncluded", lang), validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0) return { error: t("msg.intGteZeroShort", lang) };
        return { normalized: String(n) };
      },
    },
    { key: "bwOverageRate", header: t("header.bwOverage", lang), validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: t("msg.numberOnly", lang) };
        return { normalized: String(n) };
      },
    },
    { key: "colorIncludedPages", header: t("header.colorIncluded", lang), validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0) return { error: t("msg.intGteZeroShort", lang) };
        return { normalized: String(n) };
      },
    },
    { key: "colorOverageRate", header: t("header.colorOverage", lang), validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: t("msg.numberOnly", lang) };
        return { normalized: String(n) };
      },
    },
  ];
}

export function EquipmentImport({ contractId, lang }: { contractId: string; lang: Lang }) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRef[] | null>(null);

  useEffect(() => {
    fetch("/api/master/items").then((r) => r.json()).then((j) => setItems(j?.items ?? [])).catch(() => setItems([]));
  }, []);

  if (!items) return <div className="text-[12px] text-[color:var(--tts-muted)]">{t("msg.itemRefLoading", lang)}</div>;

  return (
    <ExcelUploader
      title={t("title.itEquipmentImport", lang)}
      templateName="it-equipment-template.xlsx"
      columns={buildColumns(items, lang)}
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
        return { ok: false, message: t("msg.uploadResultPartial", lang).replace("{ok}", String(ok)).replace("{failed}", String(failed)) };
      }}
    />
  );
}
