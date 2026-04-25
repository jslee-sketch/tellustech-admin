"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
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
import { t, type Lang } from "@/lib/i18n";

type PurchaseCore = {
  purchaseNumber: string;
  supplierLabel: string;
  supplierPaymentTerms: number;
  projectId: string;
  salesEmployeeId: string;
  usagePeriodStart: string;
  usagePeriodEnd: string;
  note: string;
  totalAmount: string;
  createdAt: string;
  warehouseInboundDone: boolean;
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

type ProjectInfo = { id: string; code: string; name: string; salesType: string };

type Payable = {
  id: string;
  status: string;
  amount: string;
  paidAmount: string;
  dueDate: string;
};

type Props = {
  purchaseId: string;
  initial: PurchaseCore;
  items: ItemRow[];
  payable: Payable | null;
  projects: ProjectInfo[];
  employeeOptions: { value: string; label: string }[];
  lang: Lang;
};

function buildTabs(lang: Lang): TabDef[] {
  return [
    { key: "basic", label: t("tab.basicInfo", lang), icon: "📋" },
    { key: "items", label: t("tab.itemsTab", lang), icon: "📦" },
    { key: "ap", label: t("tab.ap", lang), icon: "💰" },
  ];
}

function formatVnd(raw: string | number): string {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function PurchaseDetail({
  purchaseId,
  initial,
  items: initialItems,
  payable,
  projects,
  employeeOptions,
  lang,
}: Props) {
  const router = useRouter();
  const projectOptions = projects.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }));
  const [active, setActive] = useState<string>("basic");
  const [core, setCore] = useState<PurchaseCore>(initial);
  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const currentProject = projects.find((p) => p.id === core.projectId) ?? null;
  const salesType = currentProject?.salesType ?? null;
  const isCalibration = salesType === "CALIBRATION";
  const isPeriodic = salesType === "MAINTENANCE" || salesType === "RENTAL";
  const [savingBasic, setSavingBasic] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof PurchaseCore>(k: K, v: PurchaseCore[K]) =>
    setCore((p) => ({ ...p, [k]: v }));

  async function handleBasicSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingBasic(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: core.projectId || null,
          salesEmployeeId: core.salesEmployeeId || null,
          usagePeriodStart: core.usagePeriodStart || null,
          usagePeriodEnd: core.usagePeriodEnd || null,
          note: core.note || null,
          warehouseInboundDone: core.warehouseInboundDone,
        }),
      });
      if (!res.ok) setError(t("msg.saveFailed", lang));
      else router.refresh();
    } finally {
      setSavingBasic(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t("msg.deletePurchaseConfirm", lang))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}`, { method: "DELETE" });
      if (!res.ok) setError(t("msg.deleteFailed", lang));
      else {
        router.push("/purchases");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <Tabs tabs={buildTabs(lang)} active={active} onChange={setActive} />

      {error && (
        <div className="mb-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      {active === "basic" && (
        <form onSubmit={handleBasicSubmit}>
          <SectionTitle icon="📋" title={t("section.basicInfo", lang)} />
          <Row>
            <Field label={t("field.purchaseNumber", lang)} width="200px">
              <TextInput value={core.purchaseNumber} disabled />
            </Field>
            <Field label={t("field.createdAt", lang)} width="160px">
              <TextInput value={core.createdAt} disabled />
            </Field>
            <Field label={t("field.supplierField", lang)}>
              <TextInput value={core.supplierLabel} disabled />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.project", lang)}>
              <Select
                value={core.projectId}
                onChange={(e) => set("projectId", e.target.value)}
                placeholder={t("placeholder.notSelected", lang)}
                options={projectOptions}
              />
            </Field>
            <Field label={t("field.salesEmployee", lang)}>
              <Select
                value={core.salesEmployeeId}
                onChange={(e) => set("salesEmployeeId", e.target.value)}
                placeholder={t("placeholder.notSelected", lang)}
                options={employeeOptions}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.usageStart", lang)} width="200px">
              <TextInput
                type="date"
                value={core.usagePeriodStart}
                onChange={(e) => set("usagePeriodStart", e.target.value)}
              />
            </Field>
            <Field label={t("field.usageEnd", lang)} width="200px">
              <TextInput
                type="date"
                value={core.usagePeriodEnd}
                onChange={(e) => set("usagePeriodEnd", e.target.value)}
              />
            </Field>
            <Field label={t("field.warehouseInbound", lang)} width="180px">
              <Checkbox
                checked={core.warehouseInboundDone}
                onChange={(e) => set("warehouseInboundDone", e.target.checked)}
                label={t("field.warehouseInboundDone", lang)}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.note", lang)}>
              <Textarea value={core.note} onChange={(e) => set("note", e.target.value)} rows={3} />
            </Field>
          </Row>

          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingBasic}>
              {savingBasic ? t("action.saving", lang) : t("btn.savePurchaseBasic", lang)}
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting} className="ml-auto">
              {deleting ? t("action.deleting", lang) : t("btn.deletePurchase", lang)}
            </Button>
          </div>
        </form>
      )}

      {active === "items" && (
        <ItemsTab purchaseId={purchaseId} items={items} setItems={setItems} totalAmount={core.totalAmount} setCore={setCore} isCalibration={isCalibration} isPeriodic={isPeriodic} headerStart={core.usagePeriodStart} headerEnd={core.usagePeriodEnd} lang={lang} />
      )}

      {active === "ap" && (
        <PayableTab
          payable={payable}
          totalAmount={core.totalAmount}
          paymentTerms={core.supplierPaymentTerms}
          createdAt={core.createdAt}
          lang={lang}
        />
      )}
    </div>
  );
}

function ItemsTab({
  purchaseId,
  items,
  setItems,
  totalAmount,
  setCore,
  isCalibration,
  isPeriodic,
  headerStart,
  headerEnd,
  lang,
}: {
  purchaseId: string;
  items: ItemRow[];
  setItems: (v: ItemRow[] | ((prev: ItemRow[]) => ItemRow[])) => void;
  totalAmount: string;
  setCore: (updater: (prev: PurchaseCore) => PurchaseCore) => void;
  isCalibration: boolean;
  isPeriodic: boolean;
  headerStart: string;
  headerEnd: string;
  lang: Lang;
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

  useEffect(() => {
    if (showAdd) {
      setLineStart(headerStart);
      setLineEnd(headerEnd);
    }
  }, [showAdd, headerStart, headerEnd]);

  async function reload() {
    const r = await fetch(`/api/purchases/${purchaseId}`).then((r) => r.json());
    const p = r.purchase;
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
      p.items.map((it: ApiItem) => ({
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
    setCore((prev) => ({ ...prev, totalAmount: String(p.totalAmount) }));
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
      const res = await fetch(`/api/purchases/${purchaseId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: draft.itemId,
          serialNumber: draft.serialNumber || null,
          quantity: draft.quantity,
          unitPrice: draft.unitPrice,
          ...(isPeriodic ? { startDate: lineStart || null, endDate: lineEnd || null } : {}),
          ...(isCalibration
            ? { certNumber: certNumber || null, issuedAt: issuedAt || null, certFileId }
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
    if (!window.confirm(t("msg.deleteItemConfirm", lang))) return;
    const res = await fetch(`/api/purchases/${purchaseId}/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      await reload();
      router.refresh();
    }
  }

  const columns: DataTableColumn<ItemRow>[] = [
    {
      key: "itemName",
      label: t("col.itemName", lang),
      render: (v, row) => (
        <div>
          <span className="font-semibold">{v as string}</span>
          {row.serialNumber && (
            <span className="ml-2 font-mono text-[11px] text-[color:var(--tts-muted)]">S/N: {row.serialNumber}</span>
          )}
        </div>
      ),
    },
    { key: "quantity", label: t("col.qty", lang), width: "80px", align: "right" },
    { key: "unitPrice", label: t("col.unitPrice", lang), width: "120px", align: "right", render: (v) => formatVnd(v as string) },
    {
      key: "amount",
      label: t("col.amount", lang),
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
          {t("action.delete", lang)}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle icon="📦" title={t("label.itemsCount", lang).replace("{count}", String(items.length))} />
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            {t("btn.addItem", lang)}
          </Button>
        )}
      </div>
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mb-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3"
        >
          <Row>
            <Field label={t("field.item", lang)} required>
              <ItemCombobox
                value={draft.itemId}
                onChange={(id) => setDraft((p) => ({ ...p, itemId: id }))}
                required
              />
            </Field>
            <Field label={t("field.serial", lang)} width="200px">
              <TextInput
                value={draft.serialNumber}
                onChange={(e) => setDraft((p) => ({ ...p, serialNumber: e.target.value }))}
              />
            </Field>
            <Field label={t("field.qty", lang)} required width="100px">
              <TextInput
                type="number"
                required
                value={draft.quantity}
                onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))}
              />
            </Field>
            <Field label={t("field.unitPrice", lang)} required width="160px">
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
              <Field label={t("field.startDate", lang)} width="200px" hint={t("hint.headerDefault", lang)}>
                <TextInput type="date" value={lineStart} onChange={(e) => setLineStart(e.target.value)} />
              </Field>
              <Field label={t("field.endDate", lang)} width="200px">
                <TextInput type="date" value={lineEnd} onChange={(e) => setLineEnd(e.target.value)} />
              </Field>
            </Row>
          )}
          {isCalibration && (
            <div className="mb-3 rounded-md bg-[color:var(--tts-primary-dim)] p-3">
              <div className="mb-1 text-[11px] font-bold text-[color:var(--tts-primary)]">{t("label.calibCertOnePerLine", lang)}</div>
              <Row>
                <Field label={t("field.certificateNo", lang)} width="240px">
                  <TextInput value={certNumber} onChange={(e) => setCertNumber(e.target.value)} placeholder="CERT-2026-0001" />
                </Field>
                <Field label={t("field.issuedAt", lang)} width="180px">
                  <TextInput type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
                </Field>
                <Field label={t("field.certPdf", lang)}>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
                    📎 {certFile ? certFile.name : t("btn.selectPdf", lang)}
                    <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => setCertFile(e.target.files?.[0] ?? null)} />
                  </label>
                </Field>
              </Row>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? t("action.saving", lang) : t("btn.addItem", lang).replace("+ ", "")}
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
              {t("action.cancel", lang)}
            </Button>
          </div>
        </form>
      )}
      <DataTable columns={columns} data={items} rowKey={(it) => it.id} emptyMessage={t("empty.purchaseItems", lang)} />
      <div className="mt-3 text-right text-[14px] font-bold">
        {t("label.totalSum", lang)} (VND){" "}
        <span className="ml-3 font-mono text-[16px] text-[color:var(--tts-primary)]">{formatVnd(totalAmount)}</span>
      </div>
    </div>
  );
}

function PayableTab({
  payable,
  totalAmount,
  paymentTerms,
  createdAt,
  lang,
}: {
  payable: Payable | null;
  totalAmount: string;
  paymentTerms: number;
  createdAt: string;
  lang: Lang;
}) {
  if (!payable) {
    return (
      <div>
        <SectionTitle icon="💰" title={t("section.ap", lang)} />
        <Note tone="warn">{t("msg.purchaseNoPayable", lang)}</Note>
      </div>
    );
  }
  const outstanding = Number(payable.amount) - Number(payable.paidAmount);
  return (
    <div>
      <SectionTitle icon="💰" title={t("section.ap", lang)} />
      <div className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-4">
        <div className="grid grid-cols-[160px_1fr] gap-y-2 text-[13px]">
          <div className="text-[color:var(--tts-sub)]">{t("field.status", lang)}</div>
          <div>
            <Badge
              tone={
                payable.status === "PAID"
                  ? "success"
                  : payable.status === "PARTIAL"
                  ? "accent"
                  : payable.status === "OPEN"
                  ? "warn"
                  : "neutral"
              }
            >
              {payable.status}
            </Badge>
          </div>
          <div className="text-[color:var(--tts-sub)]">{t("field.totalPurchase", lang)}</div>
          <div className="font-mono font-bold">{formatVnd(totalAmount)} VND</div>
          <div className="text-[color:var(--tts-sub)]">{t("field.billedAmount", lang)}</div>
          <div className="font-mono">{formatVnd(payable.amount)} VND</div>
          <div className="text-[color:var(--tts-sub)]">{t("field.paidAmount", lang)}</div>
          <div className="font-mono">{formatVnd(payable.paidAmount)} VND</div>
          <div className="text-[color:var(--tts-sub)]">{t("field.outstanding", lang)}</div>
          <div className="font-mono font-bold text-[color:var(--tts-danger)]">{formatVnd(outstanding)} VND</div>
          <div className="text-[color:var(--tts-sub)]">{t("field.supplierPaymentTerms", lang)}</div>
          <div>{paymentTerms} {t("common.days", lang)}</div>
          <div className="text-[color:var(--tts-sub)]">{t("field.dueDate", lang)}</div>
          <div className="font-mono">{payable.dueDate}</div>
          <div className="text-[color:var(--tts-sub)]">{t("field.purchaseCreatedAt", lang)}</div>
          <div className="font-mono">{createdAt}</div>
        </div>
      </div>
      <Note tone="info" className="mt-3">
        {t("note.purchaseApPhase4", lang)}
      </Note>
    </div>
  );
}
