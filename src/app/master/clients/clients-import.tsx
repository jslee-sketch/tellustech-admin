"use client";

import { useRouter } from "next/navigation";
import { ExcelUploader } from "@/components/ui";
import type { UploaderColumn } from "@/components/ui";

const INDUSTRIES = ["MANUFACTURING", "LOGISTICS", "EDUCATION", "IT", "OTHER"] as const;

const columns: UploaderColumn[] = [
  { key: "companyNameVi", header: "거래처명", required: true, validate: (raw) => ({ normalized: raw }) },
  { key: "ceoName", header: "대표자", validate: (raw) => ({ normalized: raw }) },
  { key: "phone", header: "전화번호", validate: (raw) => {
      const s = raw.replace(/\s/g, "");
      if (s && !/^[+\d\-()]{5,}$/.test(s)) return { error: "숫자/하이픈/괄호만" };
      return { normalized: s };
    },
  },
  { key: "taxCode", header: "사업자번호", validate: (raw) => ({ normalized: raw }) },
  { key: "address", header: "주소", validate: (raw) => ({ normalized: raw }) },
  { key: "industry", header: "업종", validate: (raw) => {
      const v = raw.toUpperCase();
      if (v && !(INDUSTRIES as readonly string[]).includes(v)) return { error: INDUSTRIES.join("|") };
      return { normalized: v };
    },
  },
  { key: "paymentTerms", header: "결제조건(일)", validate: (raw) => {
      if (!raw) return { normalized: "" };
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return { error: "정수 0 이상" };
      return { normalized: String(n) };
    },
  },
  { key: "bankName", header: "은행명", validate: (raw) => ({ normalized: raw }) },
  { key: "bankAccount", header: "계좌번호", validate: (raw) => ({ normalized: raw }) },
  { key: "bankHolder", header: "예금주", validate: (raw) => ({ normalized: raw }) },
];

export function ClientsImport() {
  const router = useRouter();
  return (
    <ExcelUploader
      title="거래처 일괄 업로드"
      templateName="clients-template.xlsx"
      columns={columns}
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
        return { ok: false, message: `${ok}건 성공 · ${failed}건 실패` };
      }}
    />
  );
}
