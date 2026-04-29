"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  Field,
  ItemCombobox,
  Note,
  Row,
  SectionTitle,
  SerialCombobox,
  Tabs,
  TextInput,
} from "@/components/ui";
import type { DataTableColumn, TabDef } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";
import { TmAmendmentsTab } from "./amendments-tab";

type RentalCore = {
  rentalCode: string;
  clientLabel: string;
  contractNumber: string;
  address: string;
  startDate: string;
  endDate: string;
  contractMgrName: string;
  contractMgrPhone: string;
  contractMgrEmail: string;
  technicalMgrName: string;
  technicalMgrPhone: string;
  technicalMgrEmail: string;
  financeMgrName: string;
  financeMgrPhone: string;
  financeMgrEmail: string;
};

type Item = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  options: string;
  serialNumber: string;
  startDate: string;
  endDate: string;
  salesPrice: string;
  supplierName: string;
  purchasePrice: string;
  commission: string;
  profit: string;
};

type Props = {
  rentalId: string;
  paymentTerms: number;
  totalSales: string;
  totalProfit: string;
  initial: RentalCore;
  items: Item[];
  warehouseOptions: { value: string; label: string }[];
  lang: Lang;
};

function buildTabs(lang: Lang): TabDef[] {
  return [
    { key: "basic", label: t("tab.basicInfo", lang), icon: "📋" },
    { key: "managers", label: t("tab.managers", lang), icon: "👥" },
    { key: "items", label: t("tab.itemsProfit", lang), icon: "📦" },
    { key: "sales", label: t("tab.salesReflect", lang), icon: "💰" },
    { key: "amend", label: t("tab.amendments", lang), icon: "🔧" },
  ];
}

function formatVnd(raw: string | number): string {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function TmRentalDetail({
  rentalId,
  paymentTerms,
  totalSales,
  totalProfit,
  initial,
  items: initialItems,
  warehouseOptions,
  lang,
}: Props) {
  const router = useRouter();
  const [active, setActive] = useState("basic");
  const [core, setCore] = useState<RentalCore>(initial);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [savingBasic, setSavingBasic] = useState(false);
  const [savingMgr, setSavingMgr] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reflecting, setReflecting] = useState(false);
  const [reflectResult, setReflectResult] = useState<{ salesNumber: string; id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof RentalCore>(k: K, v: RentalCore[K]) =>
    setCore((p) => ({ ...p, [k]: v }));

  async function patch(
    body: Partial<RentalCore>,
    setSaving: (v: boolean) => void,
  ): Promise<boolean> {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/rental/tm-rentals/${rentalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(t("msg.saveFailed", lang));
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function handleBasicSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await patch(
      {
        contractNumber: core.contractNumber,
        address: core.address,
        startDate: core.startDate,
        endDate: core.endDate,
      },
      setSavingBasic,
    );
  }

  async function handleMgrSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await patch(
      {
        contractMgrName: core.contractMgrName,
        contractMgrPhone: core.contractMgrPhone,
        contractMgrEmail: core.contractMgrEmail,
        technicalMgrName: core.technicalMgrName,
        technicalMgrPhone: core.technicalMgrPhone,
        technicalMgrEmail: core.technicalMgrEmail,
        financeMgrName: core.financeMgrName,
        financeMgrPhone: core.financeMgrPhone,
        financeMgrEmail: core.financeMgrEmail,
      },
      setSavingMgr,
    );
  }

  async function handleDelete() {
    if (!window.confirm(t("msg.deleteTmRentalConfirm", lang))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rental/tm-rentals/${rentalId}`, { method: "DELETE" });
      if (!res.ok) {
        setError(t("msg.tmRentalDelFail", lang));
        return;
      }
      router.push("/rental/tm-rentals");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleReflect() {
    if (!window.confirm(t("msg.tmRentalReflectConfirm", lang))) {
      return;
    }
    setReflecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rental/tm-rentals/${rentalId}/reflect-sales`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.details?.message ?? body.error ?? t("msg.salesReflectFail", lang));
        return;
      }
      setReflectResult({ salesNumber: body.sales.salesNumber, id: body.sales.id });
    } finally {
      setReflecting(false);
    }
  }

  async function handleTerminate() {
    const dateStr = window.prompt(t("rental.terminatePromptDate", lang), new Date().toISOString().slice(0, 10));
    if (!dateStr) return;
    const reason = window.prompt(t("rental.terminatePromptReason", lang));
    if (!reason) return;
    const status = window.confirm(t("rental.terminateNormalConfirm", lang)) ? "COMPLETED" : "CANCELED";
    setError(null);
    const res = await fetch(`/api/rental/tm-rentals/${rentalId}/terminate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endDate: dateStr, reason, status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(`${t("rental.terminateFailed", lang)}: ${j?.error ?? res.status}`);
      return;
    }
    window.alert(t("rental.terminated", lang));
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button variant="danger" size="sm" onClick={handleTerminate}>🛑 {t("rental.terminateBtn", lang)}</Button>
      </div>
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
            <Field label={t("field.tmRentalCode", lang)} width="200px">
              <TextInput value={core.rentalCode} disabled />
            </Field>
            <Field label={t("field.client", lang)}>
              <TextInput value={core.clientLabel} disabled />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.contractNumber", lang)}>
              <TextInput value={core.contractNumber} onChange={(e) => set("contractNumber", e.target.value)} />
            </Field>
            <Field label={t("field.address", lang)}>
              <TextInput value={core.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.tmRentalStart", lang)} required width="200px">
              <TextInput
                type="date"
                required
                value={core.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </Field>
            <Field label={t("field.tmRentalEnd", lang)} required width="200px">
              <TextInput
                type="date"
                required
                value={core.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </Field>
          </Row>

          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingBasic}>
              {savingBasic ? t("action.saving", lang) : t("btn.saveBasicAlt", lang)}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto"
            >
              {deleting ? t("action.deleting", lang) : t("btn.deleteTmRental", lang)}
            </Button>
          </div>
        </form>
      )}

      {active === "managers" && (
        <form onSubmit={handleMgrSubmit}>
          <SectionTitle icon="📋" title={t("section.contractMgr", lang)} />
          <MgrRow prefix="contractMgr" value={core} set={set} lang={lang} />
          <SectionTitle icon="🔧" title={t("section.technicalMgr", lang)} />
          <MgrRow prefix="technicalMgr" value={core} set={set} lang={lang} />
          <SectionTitle icon="💼" title={t("section.financeMgr", lang)} />
          <MgrRow prefix="financeMgr" value={core} set={set} lang={lang} />
          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingMgr}>
              {savingMgr ? t("action.saving", lang) : t("btn.saveMgr", lang)}
            </Button>
          </div>
        </form>
      )}

      {active === "items" && (
        <ItemsTab rentalId={rentalId} items={items} setItems={setItems} totalSales={totalSales} totalProfit={totalProfit} lang={lang} />
      )}

      {active === "sales" && (
        <div>
          <SectionTitle icon="💰" title={t("section.salesAuto", lang)} />
          <Note tone="info">
            {t("note.tmRentalReflectIntro", lang).replace("{days}", String(paymentTerms))}
          </Note>
          <div className="mt-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-4 text-[13px]">
            <div className="mb-2">
              {t("field.item", lang)} <span className="font-mono font-bold">{t("common.itemsCountUnit", lang).replace("{count}", String(items.length))}</span>, {t("field.totalSales", lang)}{" "}
              <span className="font-mono font-bold text-[color:var(--tts-primary)]">
                {formatVnd(totalSales)} VND
              </span>
              , {t("field.totalProfit", lang)}{" "}
              <span className="font-mono font-bold text-[color:var(--tts-success)]">
                {formatVnd(totalProfit)} VND
              </span>
            </div>
            {reflectResult && (
              <div className="mt-2 rounded bg-[color:var(--tts-success-dim)] px-3 py-2 text-[color:var(--tts-success)]">
                {t("msg.salesGenerated", lang).split("{salesNumber}").map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <Link href={`/sales/${reflectResult.id}`} className="font-mono font-bold underline">
                        {reflectResult.salesNumber}
                      </Link>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={handleReflect} disabled={reflecting || items.length === 0} variant="accent">
              {reflecting ? t("btn.reflectingSales", lang) : t("btn.issueSales", lang)}
            </Button>
          </div>
        </div>
      )}

      {active === "amend" && (
        <TmAmendmentsTab
          rentalId={rentalId}
          originalItems={items
            .filter((it) => !it.endDate || new Date(it.endDate) >= new Date())
            .map((it) => ({
              id: it.id,
              itemId: it.itemId,
              itemCode: it.itemCode,
              itemName: it.itemName,
              serialNumber: it.serialNumber,
              salesPrice: it.salesPrice,
              endDate: it.endDate,
            }))}
          warehouses={warehouseOptions}
          lang={lang}
        />
      )}
    </div>
  );
}

function MgrRow({
  prefix,
  value,
  set,
  lang,
}: {
  prefix: "contractMgr" | "technicalMgr" | "financeMgr";
  value: RentalCore;
  set: <K extends keyof RentalCore>(k: K, v: RentalCore[K]) => void;
  lang: Lang;
}) {
  const nk = `${prefix}Name` as keyof RentalCore;
  const pk = `${prefix}Phone` as keyof RentalCore;
  const ek = `${prefix}Email` as keyof RentalCore;
  return (
    <Row>
      <Field label={t("field.name", lang)}>
        <TextInput value={value[nk]} onChange={(e) => set(nk, e.target.value)} />
      </Field>
      <Field label={t("field.mobile", lang)}>
        <TextInput value={value[pk]} onChange={(e) => set(pk, e.target.value)} />
      </Field>
      <Field label={t("field.email", lang)}>
        <TextInput type="email" value={value[ek]} onChange={(e) => set(ek, e.target.value)} />
      </Field>
    </Row>
  );
}

function ItemsTab({
  rentalId,
  items,
  setItems,
  totalSales,
  totalProfit,
  lang,
}: {
  rentalId: string;
  items: Item[];
  setItems: (v: Item[]) => void;
  totalSales: string;
  totalProfit: string;
  lang: Lang;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Omit<Item, "id" | "profit">>({
    itemId: "",
    itemCode: "",
    itemName: "",
    options: "",
    serialNumber: "",
    startDate: "",
    endDate: "",
    salesPrice: "0",
    supplierName: "",
    purchasePrice: "",
    commission: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    const r = await fetch(`/api/rental/tm-rentals/${rentalId}`).then((r) => r.json());
    type ApiItem = {
      id: string;
      itemId: string;
      item?: { itemCode: string; name: string } | null;
      options: string | null;
      serialNumber: string;
      startDate: string;
      endDate: string;
      salesPrice: unknown;
      supplierName: string | null;
      purchasePrice: unknown;
      commission: unknown;
      profit: unknown;
    };
    setItems(
      r.rental.items.map((it: ApiItem) => ({
        id: it.id,
        itemId: it.itemId,
        itemCode: it.item?.itemCode ?? "",
        itemName: it.item?.name ?? "",
        options: it.options ?? "",
        serialNumber: it.serialNumber,
        startDate: it.startDate ? String(it.startDate).slice(0, 10) : "",
        endDate: it.endDate ? String(it.endDate).slice(0, 10) : "",
        salesPrice: String(it.salesPrice ?? ""),
        supplierName: it.supplierName ?? "",
        purchasePrice: it.purchasePrice === null ? "" : String(it.purchasePrice),
        commission: it.commission === null ? "" : String(it.commission),
        profit: it.profit === null ? "" : String(it.profit),
      })),
    );
  }

  function resetDraft() {
    setDraft({
      itemId: "",
      itemCode: "",
      itemName: "",
      options: "",
      serialNumber: "",
      startDate: "",
      endDate: "",
      salesPrice: "0",
      supplierName: "",
      purchasePrice: "",
      commission: "",
    });
    setShowAdd(false);
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      if (!draft.itemId) { setErr(t("msg.itemPickRequired", lang)); return; }
      const res = await fetch(`/api/rental/tm-rentals/${rentalId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: draft.itemId,
          options: draft.options || null,
          serialNumber: draft.serialNumber,
          startDate: draft.startDate,
          endDate: draft.endDate,
          salesPrice: draft.salesPrice,
          supplierName: draft.supplierName || null,
          purchasePrice: draft.purchasePrice || null,
          commission: draft.commission || null,
        }),
      });
      if (!res.ok) {
        setErr(t("msg.itemAddFail", lang));
        return;
      }
      resetDraft();
      await reload();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("msg.deleteItemConfirm", lang))) return;
    const res = await fetch(`/api/rental/tm-rentals/${rentalId}/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      await reload();
      router.refresh();
    }
  }

  const columns: DataTableColumn<Item>[] = [
    {
      key: "itemName",
      label: t("col.item", lang),
      render: (v, row) => (
        <div>
          <div className="font-semibold">{v as string}</div>
          {row.options && <div className="text-[11px] text-[color:var(--tts-muted)]">{row.options}</div>}
        </div>
      ),
    },
    {
      key: "serialNumber",
      label: t("col.serial", lang),
      width: "140px",
      render: (v) => <span className="font-mono text-[11px]">{v as string}</span>,
    },
    {
      key: "startDate",
      label: t("col.period", lang),
      width: "160px",
      render: (_, row) => (
        <span className="text-[11px]">
          {row.startDate} ~ {row.endDate}
        </span>
      ),
    },
    {
      key: "salesPrice",
      label: t("col.salesPrice", lang),
      width: "110px",
      align: "right",
      render: (v) => <span className="font-mono font-bold text-[color:var(--tts-primary)]">{formatVnd(v as string)}</span>,
    },
    {
      key: "supplierName",
      label: t("col.supplier", lang),
      width: "120px",
      render: (v) => (v as string) || <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "purchasePrice",
      label: t("col.purchasePrice", lang),
      width: "100px",
      align: "right",
      render: (v) => ((v as string) ? formatVnd(v as string) : <span className="text-[color:var(--tts-muted)]">—</span>),
    },
    {
      key: "commission",
      label: t("col.commission", lang),
      width: "100px",
      align: "right",
      render: (v) => ((v as string) ? formatVnd(v as string) : <span className="text-[color:var(--tts-muted)]">—</span>),
    },
    {
      key: "profit",
      label: t("col.profit", lang),
      width: "110px",
      align: "right",
      render: (v) => {
        const s = v as string;
        const n = Number(s);
        const cls = n > 0 ? "text-[color:var(--tts-success)]" : n < 0 ? "text-[color:var(--tts-danger)]" : "";
        return <span className={`font-mono font-bold ${cls}`}>{formatVnd(s)}</span>;
      },
    },
    {
      key: "id",
      label: "",
      width: "60px",
      align: "right",
      render: (_, row) => (
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
          ×
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle icon="📦" title={t("label.tmItems", lang).replace("{count}", String(items.length))} />
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            {t("btn.addItem", lang)}
          </Button>
        )}
      </div>
      <Note tone="info">
        {t("note.tmProfitFormula", lang)}
      </Note>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="my-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3"
        >
          <SectionTitle icon="💰" title={t("section.salesInfo", lang)} />
          <Row>
            <Field label={t("field.item", lang)} required>
              <ItemCombobox
                value={draft.itemId}
                onChange={(id) => setDraft((p) => ({ ...p, itemId: id }))}
                required
              />
            </Field>
            <Field label={t("field.options", lang)}>
              <TextInput value={draft.options} onChange={(e) => setDraft((p) => ({ ...p, options: e.target.value }))} />
            </Field>
            <Field label={t("field.serial", lang)} required width="180px">
              <SerialCombobox required value={draft.serialNumber} onChange={(v) => setDraft((p) => ({ ...p, serialNumber: v }))} itemId={draft.itemId || undefined} lang={lang} />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.periodStart", lang)} required width="180px">
              <TextInput type="date" required value={draft.startDate} onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))} />
            </Field>
            <Field label={t("field.periodEnd", lang)} required width="180px">
              <TextInput type="date" required value={draft.endDate} onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))} />
            </Field>
            <Field label={t("field.salesPrice", lang) + " (VND)"} required width="180px">
              <TextInput type="number" required value={draft.salesPrice} onChange={(e) => setDraft((p) => ({ ...p, salesPrice: e.target.value }))} />
            </Field>
          </Row>
          <SectionTitle icon="📥" title={t("section.purchaseInfoOpt", lang)} />
          <Row>
            <Field label={t("field.supplier", lang)}>
              <TextInput value={draft.supplierName} onChange={(e) => setDraft((p) => ({ ...p, supplierName: e.target.value }))} />
            </Field>
            <Field label={t("field.purchasePrice", lang) + " (VND)"} width="180px">
              <TextInput type="number" value={draft.purchasePrice} onChange={(e) => setDraft((p) => ({ ...p, purchasePrice: e.target.value }))} />
            </Field>
            <Field label={t("field.commission", lang) + " (VND)"} width="180px">
              <TextInput type="number" value={draft.commission} onChange={(e) => setDraft((p) => ({ ...p, commission: e.target.value }))} />
            </Field>
          </Row>
          {err && (
            <div className="mt-2 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
              {err}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? t("action.saving", lang) : t("btn.addItem", lang).replace("+ ", "")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={resetDraft}>
              {t("action.cancel", lang)}
            </Button>
          </div>
        </form>
      )}

      <DataTable columns={columns} data={items} rowKey={(it) => it.id} emptyMessage={t("empty.tmItems", lang)} />
      {items.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-end gap-4 text-[13px] font-bold">
          <div>
            {t("field.totalSales", lang)} <Badge tone="primary" className="ml-1">{formatVnd(totalSales)} VND</Badge>
          </div>
          <div>
            {t("field.totalProfit", lang)} <Badge tone="success" className="ml-1">{formatVnd(totalProfit)} VND</Badge>
          </div>
        </div>
      )}
    </div>
  );
}
