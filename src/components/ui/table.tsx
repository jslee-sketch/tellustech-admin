"use client";

import { useMemo, type ReactNode } from "react";

export type DataTableColumn<Row> = {
  key: keyof Row | string;
  label: ReactNode;
  /** 값이 바로 문자열/숫자로 렌더되지 않는 경우 직접 커스텀 렌더. */
  render?: (value: unknown, row: Row) => ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
  className?: string;
};

type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  data: Row[];
  onRowClick?: (row: Row) => void;
  emptyMessage?: ReactNode;
  /** 각 행을 uniquely 식별할 키. 기본은 idx. */
  rowKey?: (row: Row, idx: number) => string;
  className?: string;
  // ── Phase 2.A — selection / lock ────────────────────────────
  /** true 면 첫 컬럼에 체크박스 추가. selectedIds + onSelectionChange 둘 다 필수. */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (next: string[]) => void;
  /** 행이 잠겨있으면 체크박스 비활성 + 행 우측에 자물쇠 표시. */
  isRowLocked?: (row: Row) => boolean;
  lockReasonOf?: (row: Row) => string | null;
  /** 선택 시 상단 bulk action 바 컨텐츠 (삭제/잠금/해제 버튼 등). */
  bulkActionBar?: (selectedIds: string[], clear: () => void) => ReactNode;
};

export function DataTable<Row extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data",
  rowKey,
  className,
  selectable,
  selectedIds,
  onSelectionChange,
  isRowLocked,
  lockReasonOf,
  bulkActionBar,
}: DataTableProps<Row>) {
  const selSet = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);
  const allIds = useMemo(
    () => (selectable && rowKey ? data.map((row, i) => rowKey(row, i)) : []),
    [selectable, rowKey, data],
  );
  const selectableIds = useMemo(() => {
    if (!selectable || !rowKey) return [] as string[];
    return data
      .map((row, i) => ({ id: rowKey(row, i), locked: isRowLocked?.(row) ?? false }))
      .filter((x) => !x.locked)
      .map((x) => x.id);
  }, [selectable, rowKey, data, isRowLocked]);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selSet.has(id));
  const someSelected = selectableIds.some((id) => selSet.has(id));

  function toggleAll() {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : selectableIds);
  }
  function toggleOne(id: string) {
    if (!onSelectionChange) return;
    const next = selSet.has(id) ? (selectedIds ?? []).filter((x) => x !== id) : [...(selectedIds ?? []), id];
    onSelectionChange(next);
  }

  return (
    <div className={className}>
      {selectable && (selectedIds?.length ?? 0) > 0 && bulkActionBar && (
        <div className="mb-2 flex items-center justify-between rounded-md border border-[color:var(--tts-primary)] bg-[color:var(--tts-primary-dim)] px-3 py-2 text-[12px]">
          <span className="font-semibold text-[color:var(--tts-primary)]">
            선택된 항목: {selectedIds?.length ?? 0}건
          </span>
          <div className="flex items-center gap-2">
            {bulkActionBar(selectedIds ?? [], () => onSelectionChange?.([]))}
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-[color:var(--tts-border)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[color:var(--tts-primary-dim)]">
              {selectable && (
                <th
                  style={{ width: 36 }}
                  className="border-b border-[color:var(--tts-primary)] px-3 py-2.5 text-center"
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="select all"
                  />
                </th>
              )}
              {columns.map((col, i) => (
                <th
                  key={i}
                  style={{ textAlign: col.align ?? "left", width: col.width }}
                  className="whitespace-nowrap border-b border-[color:var(--tts-primary)] px-3 py-2.5 text-[12px] font-bold text-[color:var(--tts-primary)]"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-3 py-10 text-center text-[color:var(--tts-sub)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, ri) => {
                const id = rowKey ? rowKey(row, ri) : String(ri);
                const locked = isRowLocked?.(row) ?? false;
                const lockReason = lockReasonOf?.(row) ?? null;
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={
                      "border-b border-[color:var(--tts-border)] " +
                      (ri % 2 === 0 ? "bg-transparent" : "bg-[color:var(--tts-card-hover)]/40 ") +
                      (onRowClick ? "cursor-pointer hover:bg-[color:var(--tts-card-hover)]" : "") +
                      (locked ? " opacity-80" : "")
                    }
                  >
                    {selectable && (
                      <td
                        className="px-3 py-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {locked ? (
                          <span title={lockReason ?? "locked"} className="cursor-not-allowed text-[color:var(--tts-warn)]">🔒</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={selSet.has(id)}
                            onChange={() => toggleOne(id)}
                            aria-label={`select ${id}`}
                          />
                        )}
                      </td>
                    )}
                    {columns.map((col, ci) => {
                      const rawValue =
                        typeof col.key === "string" ? (row as Record<string, unknown>)[col.key] : row[col.key];
                      return (
                        <td
                          key={ci}
                          style={{ textAlign: col.align ?? "left" }}
                          className={
                            "whitespace-nowrap px-3 py-2" + (col.className ? " " + col.className : "")
                          }
                        >
                          {col.render ? col.render(rawValue, row) : (rawValue as ReactNode)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {selectable && allIds.length === 0 && null}
    </div>
  );
}
