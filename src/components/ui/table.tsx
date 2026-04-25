import type { ReactNode } from "react";

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
};

export function DataTable<Row extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data",
  rowKey,
  className,
}: DataTableProps<Row>) {
  return (
    <div
      className={
        "overflow-x-auto rounded-lg border border-[color:var(--tts-border)]" +
        (className ? " " + className : "")
      }
    >
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-[color:var(--tts-primary-dim)]">
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
                colSpan={columns.length}
                className="px-3 py-10 text-center text-[color:var(--tts-sub)]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, ri) => (
              <tr
                key={rowKey ? rowKey(row, ri) : ri}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={
                  "border-b border-[color:var(--tts-border)] " +
                  (ri % 2 === 0 ? "bg-transparent" : "bg-[color:var(--tts-card-hover)]/40 ") +
                  (onRowClick ? "cursor-pointer hover:bg-[color:var(--tts-card-hover)]" : "")
                }
              >
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
