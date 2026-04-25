"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExcelUploader } from "@/components/ui";
import type { UploaderColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

type RefData = { departmentCodes: string[] };

const ROLES = ["ADMIN", "MANAGER", "SALES", "TECH", "CALIBRATION", "ACCOUNTING", "HR"] as const;

function buildColumns(ref: RefData, lang: Lang): UploaderColumn[] {
  return [
    { key: "nameVi", header: t("header.empName", lang), required: true, validate: (raw) => ({ normalized: raw }) },
    { key: "departmentCode", header: t("header.deptCodeRef", lang), required: true, validate: (raw) => {
        if (!ref.departmentCodes.includes(raw)) return { error: t("msg.deptCodeNotFound", lang).replace("{sample}", ref.departmentCodes.slice(0, 5).join(", ")) };
        return { normalized: raw };
      },
    },
    { key: "position", header: t("header.position", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "role", header: t("header.role", lang), validate: (raw) => {
        const v = raw.toUpperCase();
        if (v && !(ROLES as readonly string[]).includes(v)) return { error: ROLES.join("|") };
        return { normalized: v };
      },
    },
    { key: "hireDate", header: t("header.hireDate", lang), validate: (raw) => {
        if (!raw) return { normalized: "" };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: "YYYY-MM-DD" };
        return { normalized: raw };
      },
    },
    { key: "phone", header: t("header.phoneNumberCol", lang), validate: (raw) => ({ normalized: raw.replace(/\s/g, "") }) },
    { key: "idCardNumber", header: t("header.idCardNumber", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "dateOfBirth", header: t("header.dateOfBirth", lang), validate: (raw) => {
        if (!raw) return { normalized: "" };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: "YYYY-MM-DD" };
        return { normalized: raw };
      },
    },
    { key: "salary", header: t("header.salary", lang), validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: t("msg.numberGteZero", lang) };
        return { normalized: String(n) };
      },
    },
    { key: "bankName", header: t("header.bankNameCol", lang), validate: (raw) => ({ normalized: raw }) },
    { key: "bankAccount", header: t("header.bankAccountCol", lang), validate: (raw) => ({ normalized: raw }) },
  ];
}

export function EmployeesImport({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [ref, setRef] = useState<RefData | null>(null);

  useEffect(() => {
    fetch("/api/master/departments")
      .then((r) => r.json())
      .then((j) => {
        const codes = (j?.departments ?? []).map((d: { code: string }) => d.code);
        setRef({ departmentCodes: codes });
      })
      .catch(() => setRef({ departmentCodes: [] }));
  }, []);

  if (!ref) return <div className="text-[12px] text-[color:var(--tts-muted)]">{t("msg.refLoading", lang)}</div>;

  return (
    <ExcelUploader
      title={t("title.employeesImport", lang)}
      templateName="employees-template.xlsx"
      columns={buildColumns(ref, lang)}
      onSave={async (rows) => {
        let ok = 0;
        let failed = 0;
        for (const r of rows) {
          const res = await fetch("/api/master/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nameVi: r.nameVi,
              departmentCode: r.departmentCode,
              position: r.position || null,
              role: r.role || null,
              hireDate: r.hireDate || null,
              phone: r.phone || null,
              idCardNumber: r.idCardNumber || null,
              dateOfBirth: r.dateOfBirth || null,
              salary: r.salary || null,
              bankName: r.bankName || null,
              bankAccount: r.bankAccount || null,
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
