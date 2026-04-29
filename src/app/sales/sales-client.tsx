"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, ExcelDownload, SearchBar } from "@/components/ui";
import type { BadgeTone, DataTableColumn } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export type SalesRow = {
  id: string;
  salesNumber: string;
  clientCode: string;
  clientName: string;
  projectCode: string | null;
  projectType: string | null;
  totalAmount: string; // VND 환산값
  currency: string;
  fxRate: string;
  itemCount: number;
  receivableStatus: string | null;
  dueDate: string | null;
  createdAt: string;
  // 소모품 적정율 — RENTAL 매출 + 거래처에 IT 계약이 있을 때만 채워짐
  yieldRateBw: number | null;
  yieldRateColor: number | null;
  yieldIsFraud: boolean;
  // Mock 매출 워크플로 단계 — TECH(🟡)/SALES(🟠)/FINANCE(🔵)/DONE(🟢)
  stage: "TECH" | "SALES" | "FINANCE" | "DONE";
};

const STAGE_META: Record<SalesRow["stage"], { emoji: string; label: string; tone: BadgeTone }> = {
  TECH:    { emoji: "🟡", label: "기술 대기",  tone: "warn" },
  SALES:   { emoji: "🟠", label: "영업 발행 대기", tone: "accent" },
  FINANCE: { emoji: "🔵", label: "재경 CFM 대기", tone: "primary" },
  DONE:    { emoji: "🟢", label: "완료",       tone: "success" },
};

function pickYieldEmoji(rate: number): { emoji: string; cls: string } {
  if (rate >= 120) return { emoji: "🔵", cls: "text-[color:var(--tts-primary)]" };
  if (rate >= 80)  return { emoji: "🟢", cls: "text-[color:var(--tts-success)]" };
  if (rate >= 50)  return { emoji: "🟡", cls: "text-[color:var(--tts-warn)]" };
  if (rate >= 30)  return { emoji: "🟠", cls: "text-[color:var(--tts-accent)]" };
  return { emoji: "🔴", cls: "text-[color:var(--tts-danger)]" };
}

const projectTypeTone: Record<string, BadgeTone> = {
  TRADE: "purple",
  MAINTENANCE: "neutral",
  RENTAL: "primary",
  CALIBRATION: "success",
  REPAIR: "warn",
  OTHER: "neutral",
};

function projectTypeLabel(type: string, lang: Lang): string {
  switch (type) {
    case "TRADE": return t("status.salesTrade", lang);
    case "MAINTENANCE": return t("status.salesMaint", lang);
    case "RENTAL": return t("status.salesRental", lang);
    case "CALIBRATION": return t("status.salesCalibration", lang);
    case "REPAIR": return t("status.salesRepair", lang);
    case "OTHER": return t("status.salesOther", lang);
    default: return type;
  }
}

const statusTone: Record<string, BadgeTone> = {
  OPEN: "warn",
  PARTIAL: "accent",
  PAID: "success",
  WRITTEN_OFF: "neutral",
};

function statusLabel(s: string, lang: Lang): string {
  switch (s) {
    case "OPEN": return t("status.open", lang);
    case "PARTIAL": return t("status.partial", lang);
    case "PAID": return t("status.paid", lang);
    case "WRITTEN_OFF": return t("status.writtenOff", lang);
    default: return s;
  }
}

function formatVnd(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function SalesClient({ initialData, lang }: { initialData: SalesRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("all");
  const [stage, setStage] = useState<"all" | SalesRow["stage"]>("all");

  const stageCounts = useMemo(() => {
    const c: Record<SalesRow["stage"], number> = { TECH: 0, SALES: 0, FINANCE: 0, DONE: 0 };
    for (const s of initialData) c[s.stage] += 1;
    return c;
  }, [initialData]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialData.filter((s) => {
      if (status !== "all" && s.receivableStatus !== status) return false;
      if (stage !== "all" && s.stage !== stage) return false;
      if (!qLower) return true;
      return (
        s.salesNumber.toLowerCase().includes(qLower) ||
        s.clientCode.toLowerCase().includes(qLower) ||
        s.clientName.toLowerCase().includes(qLower)
      );
    });
  }, [initialData, q, status, stage]);

  const columns: DataTableColumn<SalesRow>[] = [
    {
      key: "salesNumber",
      label: t("col.salesNumber", lang),
      width: "160px",
      render: (v, row) => (
        <Link
          href={`/sales/${row.id}`}
          className="font-mono text-[12px] font-bold text-[color:var(--tts-primary)] hover:underline"
        >
          {v as string}
        </Link>
      ),
    },
    {
      key: "createdAt",
      label: t("col.createdAt", lang),
      width: "110px",
    },
    {
      key: "clientName",
      label: t("col.client", lang),
      render: (_v, row) => (
        <div>
          <span className="font-semibold">{row.clientName}</span>{" "}
          <span className="font-mono text-[11px] text-[color:var(--tts-muted)]">{row.clientCode}</span>
        </div>
      ),
    },
    {
      key: "projectCode",
      label: t("col.project", lang),
      width: "150px",
      render: (v, row) => {
        if (!v) return <span className="text-[color:var(--tts-muted)]">—</span>;
        const type = row.projectType;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[11px]">{v as string}</span>
            {type && <Badge tone={projectTypeTone[type] ?? "neutral"}>{projectTypeLabel(type, lang)}</Badge>}
          </div>
        );
      },
    },
    {
      key: "itemCount",
      label: t("col.itemCount", lang),
      width: "60px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{v as number}</span>,
    },
    {
      key: "totalAmount",
      label: t("col.amountVnd", lang),
      width: "170px",
      align: "right",
      render: (v, r) => (
        <div className="font-mono">
          <div className="text-[13px] font-bold">{formatVnd(v as string)}</div>
          {r.currency !== "VND" && (
            <div className="text-[10px] text-[color:var(--tts-muted)]">
              {lang === "VI" ? "Gốc" : lang === "EN" ? "Orig" : "원화"} {r.currency} · {lang === "VI" ? "Tỷ giá" : lang === "EN" ? "Rate" : "환율"} {r.fxRate}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "receivableStatus",
      label: t("col.arStatus", lang),
      width: "100px",
      render: (v) => {
        const s = v as string | null;
        return s ? <Badge tone={statusTone[s] ?? "neutral"}>{statusLabel(s, lang)}</Badge> : "—";
      },
    },
    {
      key: "dueDate",
      label: t("col.dueDate", lang),
      width: "110px",
      render: (v) => (v as string | null) ?? <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "stage",
      label: "단계",
      width: "140px",
      render: (_v, row) => {
        const m = STAGE_META[row.stage];
        return <Badge tone={m.tone}>{m.emoji} {m.label}</Badge>;
      },
    },
    {
      key: "yieldRateBw",
      label: t("yield.adequacyRate", lang),
      width: "180px",
      align: "right",
      render: (_v, row) => {
        if (row.yieldRateBw === null) return <span className="text-[color:var(--tts-muted)]">—</span>;
        const bw = pickYieldEmoji(row.yieldRateBw);
        const col = row.yieldRateColor !== null ? pickYieldEmoji(row.yieldRateColor) : null;
        return (
          <Link href="/admin/yield-analysis" className="inline-flex items-center gap-1.5 font-mono text-[11px] hover:underline" title="해당 거래처의 IT계약 장비 중 가장 낮은 적정율 (B/W=흑백, C=컬러)">
            <span className={bw.cls}>
              <span className="text-[9px] text-[color:var(--tts-muted)]">B/W</span> {bw.emoji} {row.yieldRateBw}%
            </span>
            {col && (
              <span className={col.cls}>
                <span className="text-[9px] text-[color:var(--tts-muted)]">C</span> {col.emoji} {row.yieldRateColor}%
              </span>
            )}
          </Link>
        );
      },
    },
  ];

  return (
    <Card
      title={lang === "VI" ? "Phiếu doanh thu" : lang === "EN" ? "Sales Receipts" : "매출 전표"}
      count={filtered.length}
      action={
        <div className="flex gap-2">
          <ExcelDownload
            rows={filtered}
            columns={[
              { key: "salesNumber", header: t("col.salesNumber", lang) },
              { key: "createdAt", header: t("field.date", lang) },
              { key: "clientCode", header: t("field.clientCode", lang) },
              { key: "clientName", header: lang === "VI" ? "Tên khách hàng" : lang === "EN" ? "Client Name" : "거래처명" },
              { key: "projectCode", header: t("col.project", lang) },
              { key: "totalAmount", header: lang === "VI" ? "Số tiền (VND)" : lang === "EN" ? "Amount (VND)" : "금액(VND)" },
              { key: "currency", header: lang === "VI" ? "Tiền gốc" : lang === "EN" ? "Source Currency" : "원통화" },
              { key: "fxRate", header: lang === "VI" ? "Tỷ giá" : lang === "EN" ? "FX Rate" : "환율" },
              { key: "itemCount", header: lang === "VI" ? "Số mặt hàng" : lang === "EN" ? "Item Count" : "품목수" },
              { key: "receivableStatus", header: lang === "VI" ? "TT phải thu" : lang === "EN" ? "AR Status" : "미수상태" },
              { key: "dueDate", header: t("field.dueDate", lang) },
            ]}
            filename={`sales-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheetName="Sales"
          />
          <Link href="/sales/new">
            <Button>{t("btn.registerSales", lang)}</Button>
          </Link>
        </div>
      }
    >
      {/* 4단계 뱃지 KPI + 클릭 필터 */}
      <div className="mb-2 flex flex-wrap gap-2 text-[12px]">
        <button onClick={() => setStage("all")} className={`rounded px-2.5 py-1 font-bold ${stage === "all" ? "bg-[color:var(--tts-primary)] text-white" : "border border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"}`}>전체 {initialData.length}</button>
        {(["TECH", "SALES", "FINANCE", "DONE"] as const).map((st) => {
          const m = STAGE_META[st];
          return (
            <button key={st} onClick={() => setStage(st)}
              className={`rounded px-2.5 py-1 font-bold ${stage === st ? "bg-[color:var(--tts-primary)] text-white" : "border border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"}`}>
              {m.emoji} {m.label} {stageCounts[st]}
            </button>
          );
        })}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder={t("placeholder.searchSales", lang)} />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">{lang === "VI" ? "Tất cả TT phải thu" : lang === "EN" ? "All AR statuses" : "전체 미수금 상태"}</option>
          <option value="OPEN">{t("status.open", lang)}</option>
          <option value="PARTIAL">{t("status.partial", lang)}</option>
          <option value="PAID">{t("status.paid", lang)}</option>
          <option value="WRITTEN_OFF">{t("status.writtenOff", lang)}</option>
        </select>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as typeof stage)}
          className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-text)] outline-none focus:border-[color:var(--tts-border-focus)]"
        >
          <option value="all">전체 단계</option>
          <option value="TECH">🟡 기술 대기</option>
          <option value="SALES">🟠 영업 발행 대기</option>
          <option value="FINANCE">🔵 재경 CFM 대기</option>
          <option value="DONE">🟢 완료</option>
        </select>
      </div>
      <DataTable columns={columns} data={filtered} rowKey={(s) => s.id} emptyMessage={t("empty.sales", lang)}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActionBar={(ids, clear) => (
          <Button type="button" size="sm" variant="ghost" onClick={async () => {
            if (!confirm(`선택된 ${ids.length}건 (sale) 삭제(soft)?`)) return;
            setBusy(true);
            for (const id of ids) {
              await fetch(`/api/sales/${id}`, { method: "DELETE" });
            }
            setBusy(false); clear(); location.reload();
          }} disabled={busy}>{busy ? "삭제 중…" : `선택 삭제 (${ids.length})`}</Button>
        )}
      />
    </Card>
  );
}
