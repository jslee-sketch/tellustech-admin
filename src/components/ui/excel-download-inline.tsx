"use client";

import { ExcelDownload, type ExportColumn } from "./excel-download";

// 서버 컴포넌트에서도 쉽게 임포트해 쓸 수 있도록 한 번 더 래핑.
// (ExcelDownload 가 이미 "use client" 이지만 명시적 경로로 임포트할 수 있게)
export function ExcelDownloadInline<T extends Record<string, unknown>>(props: {
  rows: T[];
  columns: ExportColumn<T>[];
  filename?: string;
  sheetName?: string;
  disabled?: boolean;
  label?: string;
}) {
  return <ExcelDownload {...props} />;
}
