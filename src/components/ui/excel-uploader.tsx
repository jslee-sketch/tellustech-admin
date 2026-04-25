"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "./button";
import { Note } from "./card";
import { t, type Lang } from "@/lib/i18n";

// 2단계 엑셀 업로더 — 업로드 → 미리보기 검증 → 저장.
// 전체 행이 🟢 일 때만 저장 가능. 미리보기에서 직접 수정 시 실시간 재검증.

export type ValidatedCell = {
  raw: string;
  error?: string;
};

export type ValidatedRow = {
  values: Record<string, ValidatedCell>; // column key → cell
  rowError?: string; // 행 전체 오류(예: 중복 S/N)
};

export type UploaderColumn = {
  key: string; // 내부 키
  header: string; // 엑셀 헤더명
  required?: boolean;
  // 값 → { normalized?, error? } — 정규화된 값을 반환(서버 전송용). 실패 시 error.
  validate: (raw: string, row: Record<string, string>, allRows: Record<string, string>[]) => { normalized?: string; error?: string };
};

type Props = {
  title: string;
  columns: UploaderColumn[];
  // 정규화된 행 배열을 서버로 보낼 때 호출. 성공 시 미리보기 닫기.
  onSave: (rows: Record<string, string>[]) => Promise<{ ok: boolean; message?: string }>;
  // 템플릿 파일명
  templateName?: string;
  lang?: Lang;
};

export function ExcelUploader({ title, columns, onSave, templateName, lang = "EN" }: Props) {
  const [rawRows, setRawRows] = useState<Record<string, string>[] | null>(null);
  const [validated, setValidated] = useState<ValidatedRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => columns.map((c) => c.header), [columns]);

  const validate = useCallback(
    (rows: Record<string, string>[]): ValidatedRow[] => {
      return rows.map((r) => {
        const values: Record<string, ValidatedCell> = {};
        for (const col of columns) {
          const raw = String(r[col.header] ?? "").trim();
          if (col.required && !raw) {
            values[col.key] = { raw, error: t("excel.required", lang) };
            continue;
          }
          if (!raw) {
            values[col.key] = { raw };
            continue;
          }
          const res = col.validate(raw, r, rows);
          values[col.key] = { raw: res.normalized ?? raw, error: res.error };
        }
        return { values };
      });
    },
    [columns, lang],
  );

  async function handleFile(file: File) {
    setError(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "", raw: false });
      // 헤더 매핑 정리
      const rows = raw.map((r) => {
        const out: Record<string, string> = {};
        for (const h of headers) out[h] = String(r[h] ?? "").trim();
        return out;
      });
      setRawRows(rows);
      setValidated(validate(rows));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("excel.parseFailed", lang));
    }
  }

  function updateCell(rowIdx: number, colKey: string, value: string) {
    if (!rawRows) return;
    const col = columns.find((c) => c.key === colKey);
    if (!col) return;
    const next = rawRows.slice();
    next[rowIdx] = { ...next[rowIdx], [col.header]: value };
    setRawRows(next);
    setValidated(validate(next));
  }

  const errorCount = validated.reduce((n, r) => {
    const cellErrs = Object.values(r.values).filter((c) => c.error).length;
    return n + cellErrs + (r.rowError ? 1 : 0);
  }, 0);
  const canSave = rawRows !== null && rawRows.length > 0 && errorCount === 0;

  async function handleSave() {
    if (!rawRows || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      // 정규화 값으로 전송
      const normalized = rawRows.map((_, i) => {
        const out: Record<string, string> = {};
        for (const col of columns) {
          out[col.key] = validated[i].values[col.key]?.raw ?? "";
        }
        return out;
      });
      const result = await onSave(normalized);
      if (!result.ok) {
        setError(result.message ?? t("excel.saveFailed", lang));
        return;
      }
      setRawRows(null);
      setValidated([]);
    } finally {
      setSaving(false);
    }
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet([], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = templateName ?? "template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[13px] font-bold">{title}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadTemplate}>
            {t("excel.emptyTemplateBtn", lang)}
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-1.5 text-[12px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
            {t("excel.uploadBtn", lang)}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      <Note tone="info">
        {t("excel.headerRequired", lang).replace("{cols}", headers.map((h, i) => `${h}${columns[i].required ? "*" : ""}`).join(", "))}
        {" "}{t("excel.refValuesMustMatch", lang)}
      </Note>
      {error && (
        <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>
      )}
      {rawRows && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <div className={`text-[12px] font-bold ${errorCount === 0 ? "text-[color:var(--tts-success)]" : "text-[color:var(--tts-danger)]"}`}>
              {errorCount === 0
                ? t("excel.allRowsOk", lang).replace("{count}", String(rawRows.length))
                : t("excel.errorRows", lang).replace("{count}", String(errorCount))}
            </div>
            <Button size="sm" disabled={!canSave || saving} onClick={handleSave} variant="accent">
              {saving ? t("excel.savingDot", lang) : t("excel.saveRows", lang).replace("{count}", String(rawRows.length))}
            </Button>
          </div>
          <div className="max-h-[420px] overflow-auto rounded border border-[color:var(--tts-border)]">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[color:var(--tts-primary-dim)] text-[color:var(--tts-primary)]">
                <tr>
                  <th className="px-2 py-1 text-left">#</th>
                  {columns.map((c) => (
                    <th key={c.key} className="px-2 py-1 text-left">{c.header}{c.required && "*"}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validated.map((row, i) => (
                  <tr key={i} className="border-t border-[color:var(--tts-border)]">
                    <td className="px-2 py-1 text-[color:var(--tts-muted)]">{i + 1}</td>
                    {columns.map((c) => {
                      const cell = row.values[c.key];
                      const hasErr = !!cell?.error;
                      return (
                        <td key={c.key} className={`px-1 py-1 ${hasErr ? "bg-[color:var(--tts-danger-dim)]" : ""}`}>
                          <input
                            type="text"
                            value={rawRows[i][c.header] ?? ""}
                            onChange={(e) => updateCell(i, c.key, e.target.value)}
                            className={`w-full rounded border px-1 py-0.5 text-[11px] ${hasErr ? "border-[color:var(--tts-danger)]" : "border-transparent bg-transparent"}`}
                          />
                          {hasErr && <div className="text-[9px] text-[color:var(--tts-danger)]">{cell.error}</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
