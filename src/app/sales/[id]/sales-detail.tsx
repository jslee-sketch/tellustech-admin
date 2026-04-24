"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  Field,
  ItemCombobox,
  Note,
  Row,
  SectionTitle,
  Select,
  Tabs,
  TextInput,
  Textarea,
} from "@/components/ui";
import type { DataTableColumn, TabDef } from "@/components/ui";

type SalesCore = {
  salesNumber: string;
  clientLabel: string;
  clientPaymentTerms: number;
  projectId: string;
  salesEmployeeId: string;
  usagePeriodStart: string;
  usagePeriodEnd: string;
  note: string;
  totalAmount: string;
  createdAt: string;
};

type ItemRow = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  serialNumber: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  certNumber?: string | null;
  certFileId?: string | null;
  issuedAt?: string | null;
  nextDueAt?: string | null;
};

type Receivable = {
  id: string;
  status: string;
  amount: string;
  paidAmount: string;
  dueDate: string;
};

type ProjectInfo = { id: string; code: string; name: string; salesType: string };

type Props = {
  salesId: string;
  initial: SalesCore;
  items: ItemRow[];
  receivable: Receivable | null;
  projects: ProjectInfo[];
  employeeOptions: { value: string; label: string }[];
};

const TABS: TabDef[] = [
  { key: "basic", label: "기본정보", icon: "📋" },
  { key: "items", label: "품목", icon: "📦" },
  { key: "ar", label: "미수금", icon: "💰" },
];

function formatVnd(raw: string | number): string {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function SalesDetail({
  salesId,
  initial,
  items: initialItems,
  receivable,
  projects,
  employeeOptions,
}: Props) {
  const router = useRouter();
  const projectOptions = projects.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }));
  const [active, setActive] = useState<string>("basic");
  const [core, setCore] = useState<SalesCore>(initial);
  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const currentProject = projects.find((p) => p.id === core.projectId) ?? null;
  const salesType = currentProject?.salesType ?? null;
  const isCalibration = salesType === "CALIBRATION";
  const isPeriodic = salesType === "MAINTENANCE" || salesType === "RENTAL";
  const [savingBasic, setSavingBasic] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof SalesCore>(k: K, v: SalesCore[K]) =>
    setCore((p) => ({ ...p, [k]: v }));

  async function handleBasicSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSavingBasic(true);
    try {
      const res = await fetch(`/api/sales/${salesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: core.projectId || null,
          salesEmployeeId: core.salesEmployeeId || null,
          usagePeriodStart: core.usagePeriodStart || null,
          usagePeriodEnd: core.usagePeriodEnd || null,
          note: core.note || null,
        }),
      });
      if (!res.ok) {
        setError("저장에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setSavingBasic(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("이 매출을 삭제하면 관련 미수금도 같이 삭제됩니다. 진행할까요?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales/${salesId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("삭제에 실패했습니다.");
        return;
      }
      router.push("/sales");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <Tabs tabs={TABS} active={active} onChange={setActive} />

      {error && (
        <div className="mb-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      {active === "basic" && (
        <form onSubmit={handleBasicSubmit}>
          <SectionTitle icon="📋" title="기본 정보" />
          <Row>
            <Field label="매출번호" width="200px">
              <TextInput value={core.salesNumber} disabled />
            </Field>
            <Field label="등록일" width="160px">
              <TextInput value={core.createdAt} disabled />
            </Field>
            <Field label="거래처">
              <TextInput value={core.clientLabel} disabled />
            </Field>
          </Row>
          <Row>
            <Field label="프로젝트">
              <Select
                value={core.projectId}
                onChange={(e) => set("projectId", e.target.value)}
                placeholder="선택 안 함"
                options={projectOptions}
              />
            </Field>
            <Field label="영업담당">
              <Select
                value={core.salesEmployeeId}
                onChange={(e) => set("salesEmployeeId", e.target.value)}
                placeholder="선택 안 함"
                options={employeeOptions}
              />
            </Field>
          </Row>
          <Row>
            <Field label="사용기간 시작" width="200px">
              <TextInput
                type="date"
                value={core.usagePeriodStart}
                onChange={(e) => set("usagePeriodStart", e.target.value)}
              />
            </Field>
            <Field label="사용기간 종료" width="200px">
              <TextInput
                type="date"
                value={core.usagePeriodEnd}
                onChange={(e) => set("usagePeriodEnd", e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="비고">
              <Textarea value={core.note} onChange={(e) => set("note", e.target.value)} rows={3} />
            </Field>
          </Row>

          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingBasic}>
              {savingBasic ? "저장 중..." : "기본정보 저장"}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto"
            >
              {deleting ? "삭제 중..." : "매출 삭제"}
            </Button>
          </div>
        </form>
      )}

      {active === "items" && (
        <ItemsTab
          salesId={salesId}
          items={items}
          setItems={setItems}
          totalAmount={core.totalAmount}
          setCore={setCore}
          isCalibration={isCalibration}
          isPeriodic={isPeriodic}
          headerStart={core.usagePeriodStart}
          headerEnd={core.usagePeriodEnd}
        />
      )}

      {active === "ar" && (
        <ReceivableTab
          receivable={receivable}
          totalAmount={core.totalAmount}
          paymentTerms={core.clientPaymentTerms}
          createdAt={core.createdAt}
        />
      )}
    </div>
  );
}

// ─── Items Tab ──────────────────────────────────────────────────────────

function ItemsTab({
  salesId,
  items,
  setItems,
  totalAmount,
  setCore,
  isCalibration,
  isPeriodic,
  headerStart,
  headerEnd,
}: {
  salesId: string;
  items: ItemRow[];
  setItems: (v: ItemRow[] | ((prev: ItemRow[]) => ItemRow[])) => void;
  totalAmount: string;
  setCore: (updater: (prev: SalesCore) => SalesCore) => void;
  isCalibration: boolean;
  isPeriodic: boolean;
  headerStart: string;
  headerEnd: string;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Omit<ItemRow, "id" | "amount">>({
    itemId: "",
    itemCode: "",
    itemName: "",
    serialNumber: "",
    quantity: "1",
    unitPrice: "0",
  });
  const [certNumber, setCertNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [certFile, setCertFile] = useState<File | null>(null);
  const [lineStart, setLineStart] = useState(headerStart);
  const [lineEnd, setLineEnd] = useState(headerEnd);
  const [submitting, setSubmitting] = useState(false);

  // 추가 폼 열릴 때 헤더 기간으로 초기화
  useEffect(() => {
    if (showAdd) {
      setLineStart(headerStart);
      setLineEnd(headerEnd);
    }
  }, [showAdd, headerStart, headerEnd]);

  async function reload() {
    const r = await fetch(`/api/sales/${salesId}`).then((r) => r.json());
    const s = r.sales;
    type ApiItem = {
      id: string;
      itemId: string;
      item?: { itemCode: string; name: string } | null;
      serialNumber: string | null;
      quantity: unknown;
      unitPrice: unknown;
      amount: unknown;
      certNumber?: string | null;
      certFileId?: string | null;
      issuedAt?: string | null;
      nextDueAt?: string | null;
    };
    setItems(
      s.items.map((it: ApiItem) => ({
        id: it.id,
        itemId: it.itemId,
        itemCode: it.item?.itemCode ?? "",
        itemName: it.item?.name ?? "",
        serialNumber: it.serialNumber ?? "",
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
        amount: String(it.amount),
        certNumber: it.certNumber ?? null,
        certFileId: it.certFileId ?? null,
        issuedAt: it.issuedAt ? String(it.issuedAt).slice(0, 10) : null,
        nextDueAt: it.nextDueAt ? String(it.nextDueAt).slice(0, 10) : null,
      })),
    );
    setCore((p) => ({ ...p, totalAmount: String(s.totalAmount) }));
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!draft.itemId) { setSubmitting(false); return; }
      let certFileId: string | null = null;
      if (isCalibration && certFile) {
        const fd = new FormData();
        fd.append("file", certFile);
        fd.append("category", "PDF");
        const up = await fetch("/api/files", { method: "POST", body: fd });
        if (!up.ok) { setSubmitting(false); return; }
        const j = await up.json();
        certFileId = j.id;
      }
      const res = await fetch(`/api/sales/${salesId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: draft.itemId,
          serialNumber: draft.serialNumber || null,
          quantity: draft.quantity,
          unitPrice: draft.unitPrice,
          ...(isPeriodic ? { startDate: lineStart || null, endDate: lineEnd || null } : {}),
          ...(isCalibration
            ? {
                certNumber: certNumber || null,
                issuedAt: issuedAt || null,
                certFileId,
              }
            : {}),
        }),
      });
      if (res.ok) {
        setDraft({ itemId: "", itemCode: "", itemName: "", serialNumber: "", quantity: "1", unitPrice: "0" });
        setCertNumber("");
        setIssuedAt("");
        setCertFile(null);
        setShowAdd(false);
        await reload();
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 품목을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/sales/${salesId}/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      await reload();
      router.refresh();
    }
  }

  const columns: DataTableColumn<ItemRow>[] = [
    {
      key: "itemName",
      label: "품목명",
      render: (v, row) => (
        <div>
          <span className="font-semibold">{v as string}</span>
          {row.serialNumber && (
            <span className="ml-2 font-mono text-[11px] text-[color:var(--tts-muted)]">
              S/N: {row.serialNumber}
            </span>
          )}
        </div>
      ),
    },
    { key: "quantity", label: "수량", width: "80px", align: "right" },
    {
      key: "unitPrice",
      label: "단가",
      width: "120px",
      align: "right",
      render: (v) => formatVnd(v as string),
    },
    {
      key: "amount",
      label: "금액",
      width: "140px",
      align: "right",
      render: (v) => <span className="font-mono font-bold">{formatVnd(v as string)}</span>,
    },
    {
      key: "id",
      label: "",
      width: "80px",
      align: "right",
      render: (_, row) => (
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
          삭제
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle icon="📦" title={`품목 (${items.length}건)`} />
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            + 품목 추가
          </Button>
        )}
      </div>
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mb-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3"
        >
          <Row>
            <Field label="품목" required>
              <ItemCombobox
                value={draft.itemId}
                onChange={(id) => setDraft((p) => ({ ...p, itemId: id }))}
                required
              />
            </Field>
            <Field label="S/N" width="200px">
              <TextInput
                value={draft.serialNumber}
                onChange={(e) => setDraft((p) => ({ ...p, serialNumber: e.target.value }))}
              />
            </Field>
            <Field label="수량" required width="100px">
              <TextInput
                type="number"
                required
                value={draft.quantity}
                onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))}
              />
            </Field>
            <Field label="단가" required width="160px">
              <TextInput
                type="number"
                required
                value={draft.unitPrice}
                onChange={(e) => setDraft((p) => ({ ...p, unitPrice: e.target.value }))}
              />
            </Field>
          </Row>
          {isPeriodic && (
            <Row>
              <Field label="시작일" width="200px" hint="헤더 기본값 자동 · 라인별 수정 가능">
                <TextInput type="date" value={lineStart} onChange={(e) => setLineStart(e.target.value)} />
              </Field>
              <Field label="종료일" width="200px">
                <TextInput type="date" value={lineEnd} onChange={(e) => setLineEnd(e.target.value)} />
              </Field>
            </Row>
          )}
          {isCalibration && (
            <div className="mb-3 rounded-md bg-[color:var(--tts-primary-dim)] p-3">
              <div className="mb-1 text-[11px] font-bold text-[color:var(--tts-primary)]">교정 성적서 (라인당 1개)</div>
              <Row>
                <Field label="성적서 번호" width="240px">
                  <TextInput value={certNumber} onChange={(e) => setCertNumber(e.target.value)} placeholder="예: CERT-2026-0001" />
                </Field>
                <Field label="발행일" width="180px">
                  <TextInput type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
                </Field>
                <Field label="성적서 PDF">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
                    📎 {certFile ? certFile.name : "PDF 선택"}
                    <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => setCertFile(e.target.files?.[0] ?? null)} />
                  </label>
                </Field>
              </Row>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "저장 중..." : "품목 추가"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAdd(false);
                setDraft({ itemId: "", itemCode: "", itemName: "", serialNumber: "", quantity: "1", unitPrice: "0" });
              }}
            >
              취소
            </Button>
          </div>
        </form>
      )}
      <DataTable columns={columns} data={items} rowKey={(it) => it.id} emptyMessage="품목이 없습니다" />
      <div className="mt-3 text-right text-[14px] font-bold">
        합계 (VND){" "}
        <span className="ml-3 font-mono text-[16px] text-[color:var(--tts-primary)]">
          {formatVnd(totalAmount)}
        </span>
      </div>
    </div>
  );
}

// ─── AR Tab ─────────────────────────────────────────────────────────────

function ReceivableTab({
  receivable,
  totalAmount,
  paymentTerms,
  createdAt,
}: {
  receivable: Receivable | null;
  totalAmount: string;
  paymentTerms: number;
  createdAt: string;
}) {
  if (!receivable) {
    return (
      <div>
        <SectionTitle icon="💰" title="미수금" />
        <Note tone="warn">이 매출에 연결된 미수금이 없습니다 (시스템 이상).</Note>
      </div>
    );
  }

  const outstanding = Number(receivable.amount) - Number(receivable.paidAmount);

  return (
    <div>
      <SectionTitle icon="💰" title="미수금" />
      <div className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-4">
        <div className="grid grid-cols-[160px_1fr] gap-y-2 text-[13px]">
          <div className="text-[color:var(--tts-sub)]">상태</div>
          <div>
            <Badge
              tone={
                receivable.status === "PAID"
                  ? "success"
                  : receivable.status === "PARTIAL"
                  ? "accent"
                  : receivable.status === "OPEN"
                  ? "warn"
                  : "neutral"
              }
            >
              {receivable.status}
            </Badge>
          </div>
          <div className="text-[color:var(--tts-sub)]">매출 합계</div>
          <div className="font-mono font-bold">{formatVnd(totalAmount)} VND</div>
          <div className="text-[color:var(--tts-sub)]">청구 금액</div>
          <div className="font-mono">{formatVnd(receivable.amount)} VND</div>
          <div className="text-[color:var(--tts-sub)]">입금 금액</div>
          <div className="font-mono">{formatVnd(receivable.paidAmount)} VND</div>
          <div className="text-[color:var(--tts-sub)]">잔액</div>
          <div className="font-mono font-bold text-[color:var(--tts-danger)]">
            {formatVnd(outstanding)} VND
          </div>
          <div className="text-[color:var(--tts-sub)]">거래처 결제조건</div>
          <div>{paymentTerms}일</div>
          <div className="text-[color:var(--tts-sub)]">납기일</div>
          <div className="font-mono">{receivable.dueDate}</div>
          <div className="text-[color:var(--tts-sub)]">매출 등록일</div>
          <div className="font-mono">{createdAt}</div>
        </div>
      </div>
      <Note tone="info" className="mt-3">
        입금 확인 · 납기 연장 · 지연사유 기록 UI 는 Phase 4 재경 모듈 (미수미지급 전용 화면) 에서 제공됩니다.
        여기서는 조회만 가능합니다.
      </Note>
    </div>
  );
}
