"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";

export type PurchaseRow = {
  id: string;
  purchaseNumber: string;
  supplierCode: string;
  supplierName: string;
  projectCode: string | null;
  projectType: string | null;
  totalAmount: string;
  currency: string;
  fxRate: string;
  itemCount: number;
  payableStatus: string | null;
  dueDate: string | null;
  createdAt: string;
};

const projectTypeTone: Record<string, BadgeTone> = {
  TRADE: "purple",
  MAINTENANCE: "neutral",
  RENTAL: "primary",
  CALIBRATION: "success",
  REPAIR: "warn",
  OTHER: "neutral",
};
const projectTypeLabel: Record<string, string> = {
  TRADE: "구매",
  MAINTENANCE: "유지",
  RENTAL: "렌탈",
  CALIBRATION: "교정",
  REPAIR: "수리",
  OTHER: "기타",
};

const statusTone: Record<string, BadgeTone> = {
  OPEN: "warn",
  PARTIAL: "accent",
  PAID: "success",
  WRITTEN_OFF: "neutral",
};
const statusLabel: Record<string, string> = {
  OPEN: "미지급",
  PARTIAL: "부분지급",
  PAID: "완결",
  WRITTEN_OFF: "대손",
};

function formatVnd(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function PurchasesClient({ initialData }: { initialData: PurchaseRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((s) => {
      if (status !== "all" && s.payableStatus !== status) return false;
      if (!qLower) return true;
      return (
        s.purchaseNumber.toLowerCase().includes(qLower) ||
        s.supplierCode.toLowerCase().includes(qLower) ||
        s.supplierName.toLowerCase().includes(qLower)
      );
    });
  }, [initialData, q, status]);

  const columns: DataTableColumn<PurchaseRow>[] = [
    {
      key: "purchaseNumber",
      label: "매입번호",
      width: "160px",
      render: (v, row) => (
        <Link
          href={`/purchases/${row.id}`}
          className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline"
        >
          {v as string}
        </Link>
      ),
    },
    { key: "createdAt", label: "등록일", width: "110px" },
    {
      key: "supplierName",
      label: "공급사",
      render: (_v, row) => (
        <div>
          <span className="font-semibold">{row.supplierName}</span>{" "}
          <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.supplierCode}</span>
        </div>
      ),
    },
    {
      key: "projectCode",
      label: "프로젝트",
      width: "150px",
      render: (v, row) => {
        if (!v) return <span className="text-[color:var(--tts-muted)]">—</span>;
        const type = row.projectType;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[11px]">{v as string}</span>
            {type && <Badge tone={projectTypeTone[type] ?? "neutral"}>{projectTypeLabel[type] ?? type}</Badge>}
          </div>
        );
      },
    },
    {
      key: "itemCount",
      label: "품목",
      width: "60px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{v as number}</span>,
    },
    {
      key: "totalAmount",
      label: "금액 (VND)",
      width: "170px",
      align: "right",
      render: (v, r) => (
        <div className="font-mono">
          <div className="text-[13px] font-bold">{formatVnd(v as string)}</div>
          {r.currency !== "VND" && (
            <div className="text-[10px] text-[color:var(--tts-muted)]">원화 {r.currency} · 환율 {r.fxRate}</div>
          )}
        </div>
      ),
    },
    {
      key: "payableStatus",
      label: "미지급",
      width: "100px",
      render: (v) => {
        const s = v as string | null;
        return s ? <Badge tone={statusTone[s] ?? "neutral"}>{statusLabel[s] ?? s}</Badge> : "—";
      },
    },
    {
      key: "dueDate",
      label: "납기일",
      width: "110px",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
  ];

  return (
    <Card
      title="매입 전표"
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "purchaseNumber", header: "매입번호" },
              { key: "createdAt", header: "일자" },
              { key: "supplierCode", header: "공급사코드" },
              { key: "supplierName", header: "공급사명" },
              { key: "projectCode", header: "프로젝트" },
              { key: "totalAmount", header: "금액(VND)" },
              { key: "currency", header: "원통화" },
              { key: "fxRate", header: "환율" },
              { key: "itemCount", header: "품목수" },
              { key: "payableStatus", header: "미지급상태" },
              { key: "dueDate", header: "납기" },
            ]}
            filename={`purchases-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheetName="Purchases"
          />
          <Link href="/purchases/new">
            <Button>+ 매입 등록</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="매입번호/공급사 검색..." />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 미지급 상태</option>
          <option value="OPEN">미지급</option>
          <option value="PARTIAL">부분지급</option>
          <option value="PAID">완결</option>
          <option value="WRITTEN_OFF">대손</option>
        </select>
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(s) => s.id} emptyMessage="등록된 매입이 없습니다" />
    </Card>
  );
}
