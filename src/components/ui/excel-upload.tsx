"use client";

import { useState } from "react";
import { Button } from "./button";
import { Note } from "./card";
import { t, type Lang } from "@/lib/i18n";

// 공통 엑셀 업로드 컴포넌트.
// - 사용자: columns 정의(label ↔ 키 매핑) + onImport(rows) 콜백
// - 첫 행을 헤더로 간주, 이후 행을 객체로 매핑
// - 헤더 매칭은 "정확히 일치" 우선, 없으면 "정확히 일치(대소문자 무시)"
// - 미리보기 상위 5행 표시 후 "저장" 버튼

export type ExcelColumn<T> = {
  key: keyof T & string;
  label: string; // 엑셀 헤더 라벨
  required?: boolean;
  parser?: (raw: unknown) => unknown;
};

type Props<T extends Record<string, unknown>> = {
  columns: ExcelColumn<T>[];
  onImport: (rows: T[]) => Promise<{ ok: number; failed: number } | void>;
  templateHint?: string;
  disabled?: boolean;
  lang?: Lang;
};

export function ExcelUpload<T extends Record<string, unknown>>({
  columns,
  onImport,
  templateHint,
  disabled,
  lang = "EN",
}: Props<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [preview, setPreview] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setRows([]);
    setPreview([]);
    setResult(null);
    setParsing(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

      // 헤더 매핑 — 컬럼 label 기준으로 picker
      const mapped: T[] = raw.map((r) => {
        const out: Record<string, unknown> = {};
        for (const col of columns) {
          let value: unknown = null;
          if (col.label in r) value = r[col.label];
          else {
            // 대소문자 무시 매칭
            const found = Object.keys(r).find((k) => k.trim().toLowerCase() === col.label.trim().toLowerCase());
            if (found) value = r[found];
          }
          out[col.key] = col.parser ? col.parser(value) : value;
        }
        return out as T;
      });

      // required 누락 체크
      const missing = mapped.findIndex((row) =>
        columns.some((c) => c.required && (row[c.key] === null || row[c.key] === undefined || row[c.key] === "")),
      );
      if (missing >= 0) {
        setError(t("excel.missingRequired", lang).replace("{row}", String(missing + 2)));
        return;
      }

      setRows(mapped);
      setPreview(mapped.slice(0, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("excel.parseFailed", lang));
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const r = await onImport(rows);
      if (r) setResult(r);
      else setResult({ ok: rows.length, failed: 0 });
      setRows([]);
      setPreview([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("excel.saveFailed", lang));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
          📊 {parsing ? t("excel.parsing", lang) : t("excel.pickFile", lang)}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={disabled || parsing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
        {rows.length > 0 && (
          <Button size="sm" onClick={handleImport} disabled={importing || disabled} variant="accent">
            {importing ? t("excel.savingDot", lang) : t("excel.saveRows", lang).replace("{count}", String(rows.length))}
          </Button>
        )}
      </div>
      <Note tone="info">
        {t("excel.requiredHeaderRow", lang).replace("{cols}", columns.map((c) => `${c.label}${c.required ? "*" : ""}`).join(", "))}
        {templateHint && <> {templateHint}</>}
      </Note>
      {error && <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>}
      {result && (
        <div className="mt-2 rounded-md bg-[color:var(--tts-success-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-success)]">
          {t("excel.savedOkFailed", lang).replace("{ok}", String(result.ok)).replace("{failed}", String(result.failed))}
        </div>
      )}
      {preview.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] text-[color:var(--tts-muted)]">{t("excel.previewTop", lang).replace("{count}", String(preview.length))}</div>
          <div className="overflow-x-auto rounded-md border border-[color:var(--tts-border)]">
            <table className="w-full text-[12px]">
              <thead className="bg-[color:var(--tts-primary-dim)]">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="px-2 py-1 text-left text-[color:var(--tts-primary)]">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t border-[color:var(--tts-border)]">
                    {columns.map((c) => (
                      <td key={c.key} className="px-2 py-1 font-mono text-[11px]">
                        {row[c.key] == null ? "—" : String(row[c.key])}
                      </td>
                    ))}
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
