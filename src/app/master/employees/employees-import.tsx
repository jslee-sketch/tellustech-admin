"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExcelUploader } from "@/components/ui";
import type { UploaderColumn } from "@/components/ui";

type RefData = { departmentCodes: string[] };

const ROLES = ["ADMIN", "MANAGER", "SALES", "TECH", "CALIBRATION", "ACCOUNTING", "HR"] as const;

function buildColumns(ref: RefData): UploaderColumn[] {
  return [
    { key: "nameVi", header: "성명", required: true, validate: (raw) => ({ normalized: raw }) },
    { key: "departmentCode", header: "부서코드", required: true, validate: (raw) => {
        if (!ref.departmentCodes.includes(raw)) return { error: `부서 없음. 유효: ${ref.departmentCodes.slice(0, 5).join(", ")}...` };
        return { normalized: raw };
      },
    },
    { key: "position", header: "직책", validate: (raw) => ({ normalized: raw }) },
    { key: "role", header: "권한", validate: (raw) => {
        const v = raw.toUpperCase();
        if (v && !(ROLES as readonly string[]).includes(v)) return { error: ROLES.join("|") };
        return { normalized: v };
      },
    },
    { key: "hireDate", header: "입사일", validate: (raw) => {
        if (!raw) return { normalized: "" };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: "YYYY-MM-DD" };
        return { normalized: raw };
      },
    },
    { key: "phone", header: "전화번호", validate: (raw) => ({ normalized: raw.replace(/\s/g, "") }) },
    { key: "idCardNumber", header: "CCCD", validate: (raw) => ({ normalized: raw }) },
    { key: "dateOfBirth", header: "생년월일", validate: (raw) => {
        if (!raw) return { normalized: "" };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: "YYYY-MM-DD" };
        return { normalized: raw };
      },
    },
    { key: "salary", header: "기본급", validate: (raw) => {
        if (!raw) return { normalized: "" };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: "숫자 0 이상" };
        return { normalized: String(n) };
      },
    },
    { key: "bankName", header: "은행명", validate: (raw) => ({ normalized: raw }) },
    { key: "bankAccount", header: "계좌번호", validate: (raw) => ({ normalized: raw }) },
  ];
}

export function EmployeesImport() {
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

  if (!ref) return <div className="text-[12px] text-[color:var(--tts-muted)]">참조 데이터 로드 중...</div>;

  return (
    <ExcelUploader
      title="직원 일괄 업로드"
      templateName="employees-template.xlsx"
      columns={buildColumns(ref)}
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
        return { ok: false, message: `${ok}건 성공 · ${failed}건 실패` };
      }}
    />
  );
}
