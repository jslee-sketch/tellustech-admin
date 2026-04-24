"use client";

import { useState } from "react";
import { Button } from "./button";

// 리스트 데이터를 Excel(xlsx) 로 다운로드하는 범용 버튼.
// 컬럼 순서 + 헤더 이름을 props 로 받음. 데이터는 plain object 배열.

export type ExportColumn<T> = {
  key: keyof T & string;
  header: string; // 엑셀 헤더 (한글 가능)
  format?: (value: T[keyof T], row: T) => string | number | null | undefined;
};

type Props<T extends Record<string, unknown>> = {
  rows: T[];
  columns: ExportColumn<T>[];
  filename?: string;
  sheetName?: string;
  disabled?: boolean;
  templateOnly?: boolean; // true면 헤더만 있는 빈 템플릿
  label?: string;
};

export function ExcelDownload<T extends Record<string, unknown>>({
  rows,
  columns,
  filename = "export.xlsx",
  sheetName = "Sheet1",
  disabled,
  templateOnly,
  label,
}: Props<T>) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const data = templateOnly
        ? [] // 템플릿: 헤더만
        : rows.map((r) => {
            const out: Record<string, unknown> = {};
            for (const c of columns) {
              const v = r[c.key];
              out[c.header] = c.format ? c.format(v as T[keyof T], r) : (v as unknown);
            }
            return out;
          });
      const ws = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.header) });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={download} disabled={busy || disabled}>
      📥 {busy ? "내보내는 중..." : label ?? (templateOnly ? "빈 템플릿 다운로드" : "엑셀 다운로드")}
    </Button>
  );
}
