"use client";

import { useRouter } from "next/navigation";
import { ExcelUploader } from "@/components/ui";
import type { UploaderColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

const INDUSTRIES = ["MANUFACTURING", "LOGISTICS", "EDUCATION", "IT", "OTHER"] as const;

function buildColumns(lang: Lang): UploaderColumn[] {
  return [
    { key: "companyNameVi", header: t("header.companyNameVi", lang), required: true, validate: (raw) => ({ normalized: raw }) },
    { key: "ceoName", header: t("header.ceoName", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "phone", header: t("header.phoneNumber", lang), validate: (raw) => {
        const s = raw.replace(/\s/g, "");
        if (s && !/^[+\d\-()]{5,}$/.test(s)) return { error: t("msg.phoneFormatOnly", lang) };
        return { normalized: s };
      },
    },
    { key: "taxCode", header: t("header.taxCode", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "address", header: t("header.address", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "industry", header: t("header.industry", lang), validate: (raw) => {
        const v = raw.toUpperCase();
        if (v && !(INDUSTRIES as readonly string[]).includes(v)) return { error: INDUSTRIES.join("|") };
        return { normalized: v };
      },
    },
    { key: "paymentTerms", header: t("header.paymentTerms", lang), validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return { error: t("msg.intGteZero", lang) };
        return { normalized: String(n) };
      },
    },
    { key: "bankName", header: t("header.bankName", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "bankAccount", header: t("header.bankAccount", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "bankHolder", header: t("header.bankHolder", lang), validate: (raw) => ({ normalized: raw }) },
  ];
}

export function ClientsImport({ lang }: { lang: Lang }) {
  const router = useRouter();
  return (
    <ExcelUploader
      title={t("title.clientsImport", lang)}
      templateName="clients-template.xlsx"
      columns={buildColumns(lang)}
      onSave={async (rows) => {
        let ok = 0;
        let failed = 0;
        for (const r of rows) {
          const res = await fetch("/api/master/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyNameVi: r.companyNameVi,
              ceoName: r.ceoName || null,
              phone: r.phone || null,
              taxCode: r.taxCode || null,
              address: r.address || null,
              industry: r.industry || null,
              paymentTerms: r.paymentTerms ? Number(r.paymentTerms) : null,
              bankName: r.bankName || null,
              bankAccount: r.bankAccount || null,
              bankHolder: r.bankHolder || null,
            }),
          });
          if (res.ok) ok++; else failed++;
        }
        if (failed === 0) {
          router.refresh();
          return { ok: true };
        }
        return { ok: false, message: t("msg.uploadResultPartial", lang).replace("{ok}", String(ok)).replace("{failed}", String(failed)) };
      }}
    />
  );
}
