"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
  SerialCombobox,
  SignatureCanvas,
  Tabs,
  TextInput,
  Textarea,
} from "@/components/ui";
import type { DataTableColumn, TabDef } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";
import { ItAmendmentsTab } from "./amendments-tab";

type ContractCore = {
  contractNumber: string;
  clientCode: string;
  clientName: string;
  status: string;
  installationAddress: string;
  startDate: string;
  endDate: string;
  deposit: string;
  installationFee: string;
  deliveryFee: string;
  additionalServiceFee: string;
  contractMgrName: string;
  contractMgrPhone: string;
  contractMgrOffice: string;
  contractMgrEmail: string;
  technicalMgrName: string;
  technicalMgrPhone: string;
  technicalMgrOffice: string;
  technicalMgrEmail: string;
  financeMgrName: string;
  financeMgrPhone: string;
  financeMgrOffice: string;
  financeMgrEmail: string;
};

type Equipment = {
  id: string;
  serialNumber: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  manufacturer: string;
  installedAt: string;
  removedAt: string;
  monthlyBaseFee: string;
  bwIncludedPages: string;
  bwOverageRate: string;
  colorIncludedPages: string;
  colorOverageRate: string;
  note: string;
  // 소모품 적정율
  actualCoverage: number | null;
  lastYieldRateBw: string | null;
  lastYieldRateColor: string | null;
  lastYieldCalcAt: string | null;
};

type RentalOrder = {
  id: string;
  billingMonth: string; // YYYY-MM
  amount: string;
  editable: boolean;
  canceled: boolean;
};

type MonthlyBilling = {
  id: string;
  billingMonth: string; // YYYY-MM
  serialNumber: string;
  counterBw: number | null;
  counterColor: number | null;
  billingMethod: string;
  photoUrl: string;
  customerSignature: string;
  yieldVerified: boolean;
  computedAmount: string;
};

type Props = {
  contractId: string;
  initial: ContractCore;
  equipment: Equipment[];
  orders: RentalOrder[];
  billings: MonthlyBilling[];
  equipmentOptions: { value: string; label: string }[];
  warehouseOptions: { value: string; label: string }[];
  lang: Lang;
};

function buildTabs(lang: Lang): TabDef[] {
  return [
    { key: "basic", label: t("tab.contractBasic", lang), icon: "📝" },
    { key: "managers", label: t("tab.managers", lang), icon: "👥" },
    { key: "equipment", label: t("tab.equipment", lang), icon: "🖨️" },
    { key: "orders", label: t("tab.rentalOrders", lang), icon: "📅" },
    { key: "billing", label: t("tab.billing", lang), icon: "🧾" },
    { key: "amend", label: t("tab.amendments", lang), icon: "🔧" },
  ];
}

export function ItContractDetail({
  contractId,
  initial,
  equipment: initialEquipment,
  orders: initialOrders,
  billings: initialBillings,
  equipmentOptions,
  warehouseOptions,
  lang,
}: Props) {
  const router = useRouter();
  const [active, setActive] = useState<string>("basic");
  const [core, setCore] = useState<ContractCore>(initial);
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [orders, setOrders] = useState<RentalOrder[]>(initialOrders);
  const [billings, setBillings] = useState<MonthlyBilling[]>(initialBillings);
  const [savingBasic, setSavingBasic] = useState(false);
  const [savingMgr, setSavingMgr] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ContractCore>(k: K, v: ContractCore[K]) =>
    setCore((p) => ({ ...p, [k]: v }));

  async function patchContract(
    data: Partial<ContractCore>,
    setSaving: (v: boolean) => void,
  ): Promise<boolean> {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/rental/it-contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          details?: { message?: string; reason?: string };
        };
        setError(body.details?.message ?? mapContractError(body.error, body.details?.reason, lang));
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError(t("msg.networkError", lang));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleBasicSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await patchContract(
      {
        installationAddress: core.installationAddress,
        status: core.status,
        startDate: core.startDate,
        endDate: core.endDate,
        deposit: core.deposit,
        installationFee: core.installationFee,
        deliveryFee: core.deliveryFee,
        additionalServiceFee: core.additionalServiceFee,
      },
      setSavingBasic,
    );
  }

  async function handleManagersSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await patchContract(
      {
        contractMgrName: core.contractMgrName,
        contractMgrPhone: core.contractMgrPhone,
        contractMgrOffice: core.contractMgrOffice,
        contractMgrEmail: core.contractMgrEmail,
        technicalMgrName: core.technicalMgrName,
        technicalMgrPhone: core.technicalMgrPhone,
        technicalMgrOffice: core.technicalMgrOffice,
        technicalMgrEmail: core.technicalMgrEmail,
        financeMgrName: core.financeMgrName,
        financeMgrPhone: core.financeMgrPhone,
        financeMgrOffice: core.financeMgrOffice,
        financeMgrEmail: core.financeMgrEmail,
      },
      setSavingMgr,
    );
  }

  async function handleDelete() {
    if (!window.confirm(t("msg.deleteContractConfirm", lang))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rental/it-contracts/${contractId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(body.details?.message ?? mapContractError(body.error, undefined, lang));
        return;
      }
      router.push("/rental/it-contracts");
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setDeleting(false);
    }
  }

  async function handleTerminate() {
    const dateStr = window.prompt("종료 일자 (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
    if (!dateStr) return;
    const reason = window.prompt("종료 사유 (필수)");
    if (!reason) return;
    const status = window.confirm("정상 종료(COMPLETED) 면 OK, 중도 해지(CANCELED) 면 취소") ? "COMPLETED" : "CANCELED";
    setError(null);
    const res = await fetch(`/api/rental/it-contracts/${contractId}/terminate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endDate: dateStr, reason, status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(`종료 실패: ${j?.error ?? res.status}`);
      return;
    }
    window.alert("계약이 종료되었습니다.");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button variant="danger" size="sm" onClick={handleTerminate}>🛑 계약 종료 (조기/정상)</Button>
      </div>
      <Tabs tabs={buildTabs(lang)} active={active} onChange={setActive} />

      {error && (
        <div className="mb-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      {active === "basic" && (
        <form onSubmit={handleBasicSubmit}>
          <SectionTitle icon="📝" title={t("section.contractBasic", lang)} />
          <Row>
            <Field label={t("field.contractNumber", lang)} width="200px">
              <TextInput value={core.contractNumber} disabled />
            </Field>
            <Field label={t("field.client", lang)}>
              <TextInput value={`${core.clientCode} · ${core.clientName}`} disabled />
            </Field>
            <Field label={t("field.status", lang)} required width="160px">
              <Select
                required
                value={core.status}
                onChange={(e) => set("status", e.target.value)}
                options={[
                  { value: "DRAFT", label: t("status.draft", lang) },
                  { value: "ACTIVE", label: t("status.active", lang) },
                  { value: "EXPIRED", label: t("status.expired", lang) },
                  { value: "CANCELED", label: t("status.canceled", lang) },
                ]}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.installAddress", lang)}>
              <TextInput
                value={core.installationAddress}
                onChange={(e) => set("installationAddress", e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.rentalStart", lang)} required width="200px">
              <TextInput
                type="date"
                required
                value={core.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </Field>
            <Field label={t("field.rentalEnd", lang)} required width="200px">
              <TextInput
                type="date"
                required
                value={core.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </Field>
          </Row>

          <SectionTitle icon="💰" title={t("section.amountVnd", lang)} />
          <Row>
            <Field label={t("field.deposit", lang)} width="180px">
              <TextInput
                type="number"
                value={core.deposit}
                onChange={(e) => set("deposit", e.target.value)}
              />
            </Field>
            <Field label={t("field.installFee", lang)} width="180px">
              <TextInput
                type="number"
                value={core.installationFee}
                onChange={(e) => set("installationFee", e.target.value)}
              />
            </Field>
            <Field label={t("field.deliveryFee", lang)} width="180px">
              <TextInput
                type="number"
                value={core.deliveryFee}
                onChange={(e) => set("deliveryFee", e.target.value)}
              />
            </Field>
            <Field label={t("field.addtlServiceFee", lang)} width="180px">
              <TextInput
                type="number"
                value={core.additionalServiceFee}
                onChange={(e) => set("additionalServiceFee", e.target.value)}
              />
            </Field>
          </Row>

          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingBasic}>
              {savingBasic ? t("action.saving", lang) : t("btn.saveBasic", lang)}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto"
            >
              {deleting ? t("action.deleting", lang) : t("btn.deleteContract", lang)}
            </Button>
          </div>
        </form>
      )}

      {active === "managers" && (
        <form onSubmit={handleManagersSubmit}>
          <SectionTitle icon="📋" title={t("section.contractMgr", lang)} />
          <ManagerEditBlock prefix="contractMgr" value={core} onChange={set} lang={lang} />

          <SectionTitle icon="🔧" title={t("section.technicalMgr", lang)} />
          <ManagerEditBlock prefix="technicalMgr" value={core} onChange={set} lang={lang} />

          <SectionTitle icon="💼" title={t("section.financeMgr", lang)} />
          <ManagerEditBlock prefix="financeMgr" value={core} onChange={set} lang={lang} />

          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingMgr}>
              {savingMgr ? t("action.saving", lang) : t("btn.saveMgr", lang)}
            </Button>
          </div>
        </form>
      )}

      {active === "equipment" && (
        <EquipmentTab
          contractId={contractId}
          equipment={equipment}
          onChange={setEquipment}
          onError={setError}
          lang={lang}
        />
      )}

      {active === "orders" && (
        <OrdersTab contractId={contractId} orders={orders} setOrders={setOrders} onError={setError} lang={lang} />
      )}

      {active === "billing" && (
        <BillingsTab
          contractId={contractId}
          billings={billings}
          setBillings={setBillings}
          equipmentOptions={equipmentOptions}
          onError={setError}
          lang={lang}
        />
      )}

      {active === "amend" && (
        <ItAmendmentsTab
          contractId={contractId}
          originalEquipment={equipment
            .filter((e) => !e.removedAt)
            .map((e) => ({
              id: e.id,
              itemId: e.itemId,
              itemCode: e.itemCode,
              itemName: e.itemName,
              serialNumber: e.serialNumber,
              monthlyBaseFee: e.monthlyBaseFee,
            }))}
          warehouses={warehouseOptions}
          lang={lang}
        />
      )}
    </div>
  );
}

function ManagerEditBlock({
  prefix,
  value,
  onChange,
  lang,
}: {
  prefix: "contractMgr" | "technicalMgr" | "financeMgr";
  value: ContractCore;
  onChange: <K extends keyof ContractCore>(k: K, v: ContractCore[K]) => void;
  lang: Lang;
}) {
  const nameKey = `${prefix}Name` as keyof ContractCore;
  const phoneKey = `${prefix}Phone` as keyof ContractCore;
  const officeKey = `${prefix}Office` as keyof ContractCore;
  const emailKey = `${prefix}Email` as keyof ContractCore;
  return (
    <Row>
      <Field label={t("field.name", lang)}>
        <TextInput value={value[nameKey]} onChange={(e) => onChange(nameKey, e.target.value)} />
      </Field>
      <Field label={t("field.mobile", lang)}>
        <TextInput value={value[phoneKey]} onChange={(e) => onChange(phoneKey, e.target.value)} />
      </Field>
      <Field label={t("field.office", lang)}>
        <TextInput value={value[officeKey]} onChange={(e) => onChange(officeKey, e.target.value)} />
      </Field>
      <Field label={t("field.email", lang)}>
        <TextInput
          type="email"
          value={value[emailKey]}
          onChange={(e) => onChange(emailKey, e.target.value)}
        />
      </Field>
    </Row>
  );
}

// ─── Equipment Tab ──────────────────────────────────────────────────────

const EMPTY_EQ: Omit<Equipment, "id"> = {
  serialNumber: "",
  itemId: "",
  itemCode: "",
  itemName: "",
  manufacturer: "",
  installedAt: "",
  removedAt: "",
  monthlyBaseFee: "",
  bwIncludedPages: "",
  bwOverageRate: "",
  colorIncludedPages: "",
  colorOverageRate: "",
  note: "",
  actualCoverage: 5,
  lastYieldRateBw: null,
  lastYieldRateColor: null,
  lastYieldCalcAt: null,
};

function EquipmentTab({
  contractId,
  equipment,
  onChange,
  onError,
  lang,
}: {
  contractId: string;
  equipment: Equipment[];
  onChange: (next: Equipment[]) => void;
  onError: (msg: string | null) => void;
  lang: Lang;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Omit<Equipment, "id">>(EMPTY_EQ);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setDraft(EMPTY_EQ);
    setEditingId(null);
    setShowAdd(false);
  }

  function startEdit(eq: Equipment) {
    setEditingId(eq.id);
    setShowAdd(false);
    setDraft({
      serialNumber: eq.serialNumber,
      itemId: eq.itemId,
      itemCode: eq.itemCode,
      itemName: eq.itemName,
      manufacturer: eq.manufacturer,
      installedAt: eq.installedAt,
      removedAt: eq.removedAt,
      monthlyBaseFee: eq.monthlyBaseFee,
      bwIncludedPages: eq.bwIncludedPages,
      bwOverageRate: eq.bwOverageRate,
      colorIncludedPages: eq.colorIncludedPages,
      colorOverageRate: eq.colorOverageRate,
      note: eq.note,
      actualCoverage: eq.actualCoverage,
      lastYieldRateBw: eq.lastYieldRateBw,
      lastYieldRateColor: eq.lastYieldRateColor,
      lastYieldCalcAt: eq.lastYieldCalcAt,
    });
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    setSubmitting(true);
    try {
      const payload = {
        serialNumber: draft.serialNumber,
        itemId: draft.itemId || null,
        manufacturer: draft.manufacturer || null,
        installedAt: draft.installedAt || null,
        removedAt: draft.removedAt || null,
        monthlyBaseFee: draft.monthlyBaseFee || null,
        bwIncludedPages: draft.bwIncludedPages || null,
        bwOverageRate: draft.bwOverageRate || null,
        colorIncludedPages: draft.colorIncludedPages || null,
        colorOverageRate: draft.colorOverageRate || null,
        note: draft.note || null,
      };
      if (editingId) {
        const res = await fetch(
          `/api/rental/it-contracts/${contractId}/equipment/${editingId}`,
          { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { details?: { message?: string } };
          onError(body.details?.message ?? t("msg.equipmentEditFail", lang));
          return;
        }
        const data = (await res.json()) as { equipment: RawEquipment };
        const n = normalizeEquipment(data.equipment);
        onChange(equipment.map((x) => (x.id === editingId ? n : x)));
      } else {
        const res = await fetch(`/api/rental/it-contracts/${contractId}/equipment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { details?: { message?: string } };
          onError(body.details?.message ?? t("msg.equipmentAddFail", lang));
          return;
        }
        const data = (await res.json()) as { equipment: RawEquipment };
        onChange([normalizeEquipment(data.equipment), ...equipment]);
      }
      reset();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("msg.deleteEquipmentConfirm", lang))) return;
    onError(null);
    const res = await fetch(`/api/rental/it-contracts/${contractId}/equipment/${id}`, { method: "DELETE" });
    if (!res.ok) {
      onError(t("msg.equipmentDeleteFail", lang));
      return;
    }
    onChange(equipment.filter((x) => x.id !== id));
    router.refresh();
  }

  const columns: DataTableColumn<Equipment>[] = [
    {
      key: "serialNumber",
      label: t("col.serial", lang),
      width: "160px",
      render: (v) => (
        <span className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)]">{v as string}</span>
      ),
    },
    {
      key: "itemName",
      label: t("col.item", lang),
      render: (v, row) => (
        <div>
          <div className="font-semibold">{(v as string) || "—"}</div>
          <div className="font-mono text-[10px] text-[color:var(--tts-muted)]">{row.itemCode}</div>
          {row.manufacturer && (
            <div className="text-[11px] text-[color:var(--tts-muted)]">{row.manufacturer}</div>
          )}
        </div>
      ),
    },
    {
      key: "monthlyBaseFee",
      label: t("col.monthlyBaseFee", lang),
      align: "right",
      width: "120px",
      render: (v) => {
        const s = v as string;
        return s ? formatVnd(s) : <span className="text-[color:var(--tts-muted)]">—</span>;
      },
    },
    {
      key: "bwIncludedPages",
      label: t("col.bwBase", lang),
      align: "right",
      width: "100px",
      render: (v, row) => {
        if (!v) return <span className="text-[color:var(--tts-muted)]">—</span>;
        return (
          <span>
            {v as string}
            {row.bwOverageRate && (
              <span className="ml-1 text-[10px] text-[color:var(--tts-muted)]">
                +{formatVnd(row.bwOverageRate)}/{lang === "VI" ? "trang" : lang === "EN" ? "pg" : "매"}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "colorIncludedPages",
      label: t("col.colorBase", lang),
      align: "right",
      width: "100px",
      render: (v, row) => {
        if (!v) return <span className="text-[color:var(--tts-muted)]">—</span>;
        return (
          <span>
            {v as string}
            {row.colorOverageRate && (
              <span className="ml-1 text-[10px] text-[color:var(--tts-muted)]">
                +{formatVnd(row.colorOverageRate)}/{lang === "VI" ? "trang" : lang === "EN" ? "pg" : "매"}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "installedAt",
      label: t("col.installedAt", lang),
      width: "100px",
      render: (v) => (v as string) || <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "actualCoverage",
      label: t("yield.actualCoverage", lang),
      width: "100px",
      align: "right",
      render: (_, row) => (
        <CoverageInlineEdit
          contractId={contractId}
          eqId={row.id}
          value={row.actualCoverage}
          onSaved={(n) => onChange(equipment.map((x) => (x.id === row.id ? { ...x, actualCoverage: n } : x)))}
        />
      ),
    },
    {
      key: "lastYieldRateBw",
      label: t("yield.adequacyRate", lang),
      width: "150px",
      align: "right",
      render: (_, row) => <YieldBadgeCell bw={row.lastYieldRateBw} color={row.lastYieldRateColor} lang={lang} />,
    },
    {
      key: "id",
      label: "",
      width: "180px",
      align: "right",
      render: (_, row) => (
        <div className="flex justify-end gap-1">
          <CalcYieldButton
            contractId={contractId}
            eqId={row.id}
            onCalculated={(bw, color) => onChange(equipment.map((x) => (x.id === row.id ? { ...x, lastYieldRateBw: bw === null ? null : String(bw), lastYieldRateColor: color === null ? null : String(color), lastYieldCalcAt: new Date().toISOString() } : x)))}
            lang={lang}
          />
          <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>
            {t("action.edit", lang)}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
            {t("action.delete", lang)}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <SectionTitle icon="🖨️" title={t("label.equipmentList", lang).replace("{count}", String(equipment.length))} />
          <Note tone="info">
            {t("note.itEquipStock", lang)}
          </Note>
        </div>
        {!showAdd && !editingId && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            {t("btn.addEquipment", lang)}
          </Button>
        )}
      </div>

      {(showAdd || editingId) && (
        <form
          onSubmit={handleSave}
          className="mb-4 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3"
        >
          <Row>
            <Field label={t("field.serial", lang)} required width="220px">
              <SerialCombobox
                required
                value={draft.serialNumber}
                onChange={(v) => setDraft((p) => ({ ...p, serialNumber: v }))}
                itemId={draft.itemId || undefined}
                lang={lang}
              />
            </Field>
            <Field label={t("field.item", lang)} required>
              <ItemCombobox
                value={draft.itemId}
                initialCode={draft.itemCode}
                initialName={draft.itemName}
                onChange={(id) => setDraft((p) => ({ ...p, itemId: id }))}
                required
              />
            </Field>
            <Field label={t("field.manufacturer", lang)} width="160px">
              <TextInput
                value={draft.manufacturer}
                onChange={(e) => setDraft((p) => ({ ...p, manufacturer: e.target.value }))}
                placeholder="SINDOH"
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.monthlyBaseFee", lang) + " (VND)"} width="180px">
              <TextInput
                type="number"
                value={draft.monthlyBaseFee}
                onChange={(e) => setDraft((p) => ({ ...p, monthlyBaseFee: e.target.value }))}
              />
            </Field>
            <Field label={t("field.bwIncludedPages", lang)} width="150px">
              <TextInput
                type="number"
                value={draft.bwIncludedPages}
                onChange={(e) => setDraft((p) => ({ ...p, bwIncludedPages: e.target.value }))}
              />
            </Field>
            <Field label={t("field.bwOverageRate", lang)} width="170px">
              <TextInput
                type="number"
                value={draft.bwOverageRate}
                onChange={(e) => setDraft((p) => ({ ...p, bwOverageRate: e.target.value }))}
              />
            </Field>
            <Field label={t("field.colorIncludedPages", lang)} width="150px">
              <TextInput
                type="number"
                value={draft.colorIncludedPages}
                onChange={(e) => setDraft((p) => ({ ...p, colorIncludedPages: e.target.value }))}
              />
            </Field>
            <Field label={t("field.colorOverageRate", lang)} width="170px">
              <TextInput
                type="number"
                value={draft.colorOverageRate}
                onChange={(e) => setDraft((p) => ({ ...p, colorOverageRate: e.target.value }))}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.installedAt", lang)} width="180px">
              <TextInput
                type="date"
                value={draft.installedAt}
                onChange={(e) => setDraft((p) => ({ ...p, installedAt: e.target.value }))}
              />
            </Field>
            <Field label={t("field.removedAt", lang)} width="180px">
              <TextInput
                type="date"
                value={draft.removedAt}
                onChange={(e) => setDraft((p) => ({ ...p, removedAt: e.target.value }))}
              />
            </Field>
            <Field label={t("field.note", lang)}>
              <Textarea
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
              />
            </Field>
          </Row>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? t("action.saving", lang) : editingId ? t("btn.editSave", lang) : t("btn.addEquipment", lang).replace("+ ", "")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              {t("action.cancel", lang)}
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        data={equipment}
        rowKey={(e) => e.id}
        emptyMessage={t("empty.equipment", lang)}
      />

      {equipment.length > 0 && (
        <div className="mt-3 text-right text-[13px] text-[color:var(--tts-sub)]">
          {t("label.totalMonthlyBaseFee", lang)}{" "}
          <span className="font-mono font-bold text-[color:var(--tts-primary)]">
            {formatVnd(
              equipment
                .reduce((sum, e) => sum + Number(e.monthlyBaseFee || 0), 0)
                .toString(),
            )}{" "}
            VND
          </span>
        </div>
      )}
    </div>
  );
}

// ─── 유틸 ───────────────────────────────────────────────────────────────

function formatVnd(raw: string | number): string {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return new Intl.NumberFormat("vi-VN").format(n);
}

type RawEquipment = {
  id: string;
  serialNumber: string;
  itemId: string;
  item?: { itemCode: string; name: string } | null;
  manufacturer: string | null;
  installedAt: string | null;
  removedAt: string | null;
  monthlyBaseFee: string | null;
  bwIncludedPages: number | null;
  bwOverageRate: string | null;
  colorIncludedPages: number | null;
  colorOverageRate: string | null;
  note: string | null;
  actualCoverage?: number | null;
  lastYieldRateBw?: string | number | null;
  lastYieldRateColor?: string | number | null;
  lastYieldCalcAt?: string | null;
};

function normalizeEquipment(r: RawEquipment): Equipment {
  return {
    id: r.id,
    serialNumber: r.serialNumber,
    itemId: r.itemId,
    itemCode: r.item?.itemCode ?? "",
    itemName: r.item?.name ?? "",
    manufacturer: r.manufacturer ?? "",
    installedAt: r.installedAt ? r.installedAt.slice(0, 10) : "",
    removedAt: r.removedAt ? r.removedAt.slice(0, 10) : "",
    monthlyBaseFee: r.monthlyBaseFee ?? "",
    bwIncludedPages: r.bwIncludedPages?.toString() ?? "",
    bwOverageRate: r.bwOverageRate ?? "",
    colorIncludedPages: r.colorIncludedPages?.toString() ?? "",
    colorOverageRate: r.colorOverageRate ?? "",
    note: r.note ?? "",
    actualCoverage: r.actualCoverage ?? null,
    lastYieldRateBw: r.lastYieldRateBw !== null && r.lastYieldRateBw !== undefined ? String(r.lastYieldRateBw) : null,
    lastYieldRateColor: r.lastYieldRateColor !== null && r.lastYieldRateColor !== undefined ? String(r.lastYieldRateColor) : null,
    lastYieldCalcAt: r.lastYieldCalcAt ?? null,
  };
}

function mapContractError(code: string | undefined, reason: string | undefined, lang: Lang): string {
  if (code === "invalid_input" && reason === "before_start") {
    return t("msg.contractEndBeforeStart", lang);
  }
  switch (code) {
    case "invalid_client":
      return t("msg.invalidClient", lang);
    case "invalid_input":
      return t("msg.invalidInput", lang);
    case "has_dependent_rows":
      return t("msg.hasDependents", lang);
    case "not_found":
      return t("msg.contractNotFound", lang);
    default:
      return t("msg.saveFailed", lang);
  }
}

// ─── Orders Tab ─────────────────────────────────────────────────────────

function OrdersTab({
  contractId,
  orders,
  setOrders,
  onError,
  lang,
}: {
  contractId: string;
  orders: RentalOrder[];
  setOrders: (next: RentalOrder[]) => void;
  onError: (msg: string | null) => void;
  lang: Lang;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ created: number; skipped: number; totalMonths: number } | null>(null);

  async function reload() {
    const r = await fetch(`/api/rental/it-contracts/${contractId}/orders`).then((r) => r.json());
    setOrders(
      (r.orders ?? []).map(
        (o: { id: string; billingMonth: string; amount: unknown; editable: boolean; canceled: boolean }) => ({
          id: o.id,
          billingMonth: String(o.billingMonth).slice(0, 7),
          amount: String(o.amount),
          editable: o.editable,
          canceled: o.canceled,
        }),
      ),
    );
  }

  async function handleGenerate() {
    onError(null);
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await fetch(`/api/rental/it-contracts/${contractId}/orders`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        onError(t("msg.autoGenFail", lang));
        return;
      }
      setGenerateResult({ created: body.created, skipped: body.skipped, totalMonths: body.totalMonths });
      await reload();
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleCancel(order: RentalOrder) {
    onError(null);
    const res = await fetch(`/api/rental/it-contracts/${contractId}/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canceled: !order.canceled }),
    });
    if (res.ok) {
      await reload();
      router.refresh();
    } else onError(t("msg.statusToggleFail", lang));
  }

  async function handleAmountEdit(order: RentalOrder) {
    const input = window.prompt(t("msg.amountPrompt", lang).replace("{month}", order.billingMonth), order.amount);
    if (input === null) return;
    const res = await fetch(`/api/rental/it-contracts/${contractId}/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: input }),
    });
    if (res.ok) {
      await reload();
      router.refresh();
    } else onError(t("msg.amountChangeFail", lang));
  }

  async function handleDelete(order: RentalOrder) {
    if (!window.confirm(t("msg.deleteOrderConfirm", lang).replace("{month}", order.billingMonth))) return;
    const res = await fetch(`/api/rental/it-contracts/${contractId}/orders/${order.id}`, { method: "DELETE" });
    if (res.ok) {
      await reload();
      router.refresh();
    } else onError(t("msg.deleteFailedShort", lang));
  }

  const activeTotal = orders
    .filter((o) => !o.canceled)
    .reduce((sum, o) => sum + Number(o.amount), 0);

  const columns: DataTableColumn<RentalOrder>[] = [
    {
      key: "billingMonth",
      label: t("col.billingMonth", lang),
      width: "120px",
      render: (v) => <span className="font-mono text-[12px] font-bold">{v as string}</span>,
    },
    {
      key: "amount",
      label: t("col.amountVndShort", lang),
      width: "160px",
      align: "right",
      render: (v, row) => (
        <span
          className={
            row.canceled
              ? "font-mono text-[12px] text-[color:var(--tts-muted)] line-through"
              : "font-mono text-[13px] font-bold"
          }
        >
          {new Intl.NumberFormat("vi-VN").format(Number(v as string))}
        </span>
      ),
    },
    {
      key: "canceled",
      label: t("col.status", lang),
      width: "100px",
      render: (v) => (v ? <Badge tone="danger">{t("status.cancel", lang)}</Badge> : <Badge tone="success">{t("status.activeShort", lang)}</Badge>),
    },
    {
      key: "editable",
      label: t("col.lock", lang),
      width: "80px",
      render: (v) =>
        v ? (
          <span className="text-[11px] text-[color:var(--tts-muted)]">{t("field.editable", lang)}</span>
        ) : (
          <Badge tone="warn">{t("status.locked", lang)}</Badge>
        ),
    },
    {
      key: "id",
      label: "",
      width: "220px",
      align: "right",
      render: (_, row) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" disabled={!row.editable} onClick={() => handleAmountEdit(row)}>
            {t("field.amount", lang)}
          </Button>
          <Button
            size="sm"
            variant={row.canceled ? "success" : "outline"}
            disabled={!row.editable}
            onClick={() => handleToggleCancel(row)}
          >
            {row.canceled ? t("action.restore", lang) : t("status.cancel", lang)}
          </Button>
          <Button size="sm" variant="danger" disabled={!row.editable} onClick={() => handleDelete(row)}>
            ×
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle icon="📅" title={t("label.monthlyOrders", lang).replace("{count}", String(orders.length))} />
        <Button size="sm" onClick={handleGenerate} disabled={generating} variant="accent">
          {generating ? t("action.generating", lang) : t("btn.regenerate", lang)}
        </Button>
      </div>
      <Note tone="info">
        {t("note.itGenerateOrders", lang)}
      </Note>
      {generateResult && (
        <div className="my-3 rounded-md bg-[color:var(--tts-success-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-success)]">
          {t("msg.generationResult", lang)
            .replace("{created}", String(generateResult.created))
            .replace("{skipped}", String(generateResult.skipped))
            .replace("{total}", String(generateResult.totalMonths))}
        </div>
      )}
      <DataTable columns={columns} data={orders} rowKey={(o) => o.id} emptyMessage={t("empty.orders", lang)} />
      {orders.length > 0 && (
        <div className="mt-3 text-right text-[14px] font-bold">
          {t("label.activeTotal", lang)}{" "}
          <span className="ml-3 font-mono text-[16px] text-[color:var(--tts-primary)]">
            {new Intl.NumberFormat("vi-VN").format(activeTotal)} VND
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Billings Tab (Phase 2 #4c) ─────────────────────────────────────────

function currentYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function BillingsTab({
  contractId,
  billings,
  setBillings,
  equipmentOptions,
  onError,
  lang,
}: {
  contractId: string;
  billings: MonthlyBilling[];
  setBillings: (v: MonthlyBilling[]) => void;
  equipmentOptions: { value: string; label: string }[];
  onError: (msg: string | null) => void;
  lang: Lang;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<{
    serialNumber: string;
    billingMonth: string;
    counterBw: string;
    counterColor: string;
    billingMethod: string;
    yieldVerified: boolean;
    customerSignature: string | null;
    photoUrl: string | null;
  }>({
    serialNumber: "",
    billingMonth: currentYm(),
    counterBw: "",
    counterColor: "",
    billingMethod: "MANUAL",
    yieldVerified: false,
    customerSignature: null,
    photoUrl: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastCalc, setLastCalc] = useState<string | null>(null);

  async function reload() {
    const r = await fetch(`/api/rental/it-contracts/${contractId}/billings`).then((r) => r.json());
    setBillings(
      (r.billings ?? []).map(
        (b: MonthlyBilling & { billingMonth: string; computedAmount: unknown }) => ({
          id: b.id,
          billingMonth: String(b.billingMonth).slice(0, 7),
          serialNumber: b.serialNumber,
          counterBw: b.counterBw,
          counterColor: b.counterColor,
          billingMethod: b.billingMethod,
          photoUrl: b.photoUrl ?? "",
          customerSignature: b.customerSignature ?? "",
          yieldVerified: b.yieldVerified,
          computedAmount: b.computedAmount == null ? "0" : String(b.computedAmount),
        }),
      ),
    );
  }

  function resetDraft() {
    setDraft({
      serialNumber: "",
      billingMonth: currentYm(),
      counterBw: "",
      counterColor: "",
      billingMethod: "MANUAL",
      yieldVerified: false,
      customerSignature: null,
      photoUrl: null,
    });
    setShowAdd(false);
    setLastCalc(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rental/it-contracts/${contractId}/billings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serialNumber: draft.serialNumber,
          billingMonth: draft.billingMonth,
          counterBw: draft.counterBw || null,
          counterColor: draft.counterColor || null,
          billingMethod: draft.billingMethod,
          photoUrl: draft.photoUrl,
          customerSignature: draft.customerSignature,
          yieldVerified: draft.yieldVerified,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        onError(body.details?.message ?? t("msg.billingSaveFail", lang));
        return;
      }
      setLastCalc(body.billing?.computedAmount ?? null);
      resetDraft();
      await reload();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("msg.deleteBillingConfirm", lang))) return;
    const res = await fetch(`/api/rental/it-contracts/${contractId}/billings/${id}`, { method: "DELETE" });
    if (res.ok) {
      await reload();
      router.refresh();
    }
  }

  async function handleVerifyToggle(b: MonthlyBilling) {
    const res = await fetch(`/api/rental/it-contracts/${contractId}/billings/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yieldVerified: !b.yieldVerified }),
    });
    if (res.ok) {
      await reload();
      router.refresh();
    }
  }

  async function handleUploadPhoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", "PHOTO");
    const res = await fetch("/api/files", { method: "POST", body: fd });
    if (res.ok) {
      const data = (await res.json()) as { id: string };
      setDraft((p) => ({ ...p, photoUrl: `/api/files/${data.id}` }));
    } else {
      onError(t("msg.photoUploadFail", lang));
    }
  }

  // 월별로 그룹화
  const months = Array.from(new Set(billings.map((b) => b.billingMonth))).sort().reverse();
  const totalByMonth: Record<string, number> = {};
  for (const b of billings) {
    totalByMonth[b.billingMonth] = (totalByMonth[b.billingMonth] ?? 0) + Number(b.computedAmount);
  }

  const columns: DataTableColumn<MonthlyBilling>[] = [
    {
      key: "serialNumber",
      label: t("col.serial", lang),
      width: "160px",
      render: (v) => <span className="font-mono text-[11px]">{v as string}</span>,
    },
    {
      key: "counterBw",
      label: t("col.bw", lang),
      width: "90px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{v == null ? "—" : Number(v).toLocaleString()}</span>,
    },
    {
      key: "counterColor",
      label: t("col.color", lang),
      width: "90px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{v == null ? "—" : Number(v).toLocaleString()}</span>,
    },
    {
      key: "billingMethod",
      label: t("col.method", lang),
      width: "80px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={s === "SNMP" ? "primary" : s === "PHOTO" ? "accent" : "neutral"}>{s}</Badge>;
      },
    },
    {
      key: "yieldVerified",
      label: t("col.yieldVerified", lang),
      width: "90px",
      render: (v, row) => (
        <button
          type="button"
          onClick={() => handleVerifyToggle(row)}
          className="text-[11px]"
        >
          {v ? <Badge tone="success">{t("status.verified", lang)}</Badge> : <Badge tone="warn">{t("status.unverified", lang)}</Badge>}
        </button>
      ),
    },
    {
      key: "customerSignature",
      label: t("col.signature", lang),
      width: "60px",
      align: "center",
      render: (v) => (v ? "✍️" : <span className="text-[color:var(--tts-muted)]">—</span>),
    },
    {
      key: "computedAmount",
      label: t("col.computedAmount", lang),
      width: "130px",
      align: "right",
      render: (v) => <span className="font-mono text-[13px] font-bold text-[color:var(--tts-primary)]">{formatVnd(v as string)}</span>,
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
        <SectionTitle icon="🧾" title={t("label.monthlyBillings", lang).replace("{count}", String(billings.length))} />
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)} disabled={equipmentOptions.length === 0}>
            {t("btn.billingInput", lang)}
          </Button>
        )}
      </div>
      <Note tone="info">
        {t("note.itBillingDelta", lang)}
      </Note>
      {lastCalc && (
        <div className="my-3 rounded-md bg-[color:var(--tts-success-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-success)]">
          {t("msg.billingSaved", lang).replace("{amount}", formatVnd(lastCalc))}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleSubmit}
          className="my-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3"
        >
          <Row>
            <Field label={t("field.serialEquipment", lang)} required>
              <Select
                required
                value={draft.serialNumber}
                onChange={(e) => setDraft((p) => ({ ...p, serialNumber: e.target.value }))}
                placeholder={t("placeholder.select", lang)}
                options={equipmentOptions}
              />
            </Field>
            <Field label={t("field.billingMonth", lang)} required width="180px" hint={t("hint.ymFormat", lang)}>
              <TextInput
                required
                value={draft.billingMonth}
                onChange={(e) => setDraft((p) => ({ ...p, billingMonth: e.target.value }))}
                placeholder="2026-05"
                pattern="\d{4}-\d{2}"
              />
            </Field>
            <Field label={t("field.billingMethod", lang)} width="140px">
              <Select
                value={draft.billingMethod}
                onChange={(e) => setDraft((p) => ({ ...p, billingMethod: e.target.value }))}
                options={[
                  { value: "MANUAL", label: t("billingMethod.manual", lang) },
                  { value: "SNMP", label: t("billingMethod.snmp", lang) },
                  { value: "PHOTO", label: t("billingMethod.photo", lang) },
                ]}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.bwCounter", lang)} width="200px">
              <TextInput
                type="number"
                value={draft.counterBw}
                onChange={(e) => setDraft((p) => ({ ...p, counterBw: e.target.value }))}
                placeholder="12345"
              />
            </Field>
            <Field label={t("field.colorCounter", lang)} width="200px">
              <TextInput
                type="number"
                value={draft.counterColor}
                onChange={(e) => setDraft((p) => ({ ...p, counterColor: e.target.value }))}
                placeholder="678"
              />
            </Field>
            <Field label={t("field.yieldVerified", lang)} width="160px">
              <Checkbox
                checked={draft.yieldVerified}
                onChange={(e) => setDraft((p) => ({ ...p, yieldVerified: e.target.checked }))}
                label={t("action.confirm", lang)}
              />
            </Field>
          </Row>
          <Row>
            <Field label={t("field.meterPhoto", lang)} hint={t("hint.photoMethod", lang)}>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[12px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
                📎 {draft.photoUrl ? t("action.replace", lang) : t("action.select", lang)}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadPhoto(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {draft.photoUrl && (
                <div className="mt-1 text-[11px] text-[color:var(--tts-muted)]">{t("msg.attached", lang)}</div>
              )}
            </Field>
          </Row>
          <div className="mt-2">
            <div className="mb-1 text-[12px] font-semibold text-[color:var(--tts-sub)]">{t("field.customerSignature", lang)}</div>
            <SignatureCanvas
              value={draft.customerSignature}
              onChange={(v) => setDraft((p) => ({ ...p, customerSignature: v }))}
              width={480}
              height={150}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? t("action.saving", lang) : t("action.save", lang)}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={resetDraft}>
              {t("action.cancel", lang)}
            </Button>
          </div>
        </form>
      )}

      {months.length === 0 ? (
        <Note tone="info">{t("empty.billings", lang)}</Note>
      ) : (
        months.map((m) => {
          const rows = billings.filter((b) => b.billingMonth === m);
          return (
            <div key={m} className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="font-mono font-bold text-[color:var(--tts-primary)]">{m}</span>
                <span className="text-[color:var(--tts-sub)]">
                  {t("label.monthTotal", lang)}{" "}
                  <span className="font-mono font-bold text-[color:var(--tts-text)]">
                    {formatVnd(totalByMonth[m])} VND
                  </span>
                </span>
              </div>
              <DataTable columns={columns} data={rows} rowKey={(b) => b.id} emptyMessage="—" />
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── 적정율 인라인 편집 / 뱃지 / 계산 버튼 ─────────────────────────────

function CoverageInlineEdit({
  contractId,
  eqId,
  value,
  onSaved,
}: {
  contractId: string;
  eqId: string;
  value: number | null;
  onSaved: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value ?? 5));
  const [saving, setSaving] = useState(false);
  async function commit() {
    const n = Number(draft);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      setDraft(String(value ?? 5));
      return;
    }
    if (n === (value ?? 5)) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/rental/it-contracts/${contractId}/equipment/${eqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualCoverage: n }),
      });
      if (r.ok) onSaved(n);
      else setDraft(String(value ?? 5));
    } finally {
      setSaving(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        min={1}
        max={100}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        disabled={saving}
        className="w-12 rounded border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-1 py-0.5 text-right text-[11px] font-mono"
      />
      <span className="text-[10px] text-[color:var(--tts-muted)]">%</span>
    </span>
  );
}

function YieldBadgeCell({ bw, color, lang }: { bw: string | null; color: string | null; lang: Lang }) {
  if (bw === null) return <span className="text-[10px] text-[color:var(--tts-muted)]">{t("yield.recalculate", lang)}</span>;
  const bwNum = Number(bw);
  const colorNum = color === null ? null : Number(color);
  function pickEmoji(rate: number): { emoji: string; cls: string } {
    if (rate >= 120) return { emoji: "🔵", cls: "text-[color:var(--tts-primary)]" };
    if (rate >= 80)  return { emoji: "🟢", cls: "text-[color:var(--tts-success)]" };
    if (rate >= 50)  return { emoji: "🟡", cls: "text-[color:var(--tts-warn)]" };
    if (rate >= 30)  return { emoji: "🟠", cls: "text-[color:var(--tts-accent)]" };
    return { emoji: "🔴", cls: "text-[color:var(--tts-danger)]" };
  }
  const bwInfo = pickEmoji(bwNum);
  const colorInfo = colorNum !== null ? pickEmoji(colorNum) : null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono">
      <span className={bwInfo.cls}>{bwInfo.emoji} {bwNum}%</span>
      {colorInfo && <span className={colorInfo.cls}>· {colorInfo.emoji} {colorNum}%</span>}
    </span>
  );
}

function CalcYieldButton({
  contractId,
  eqId,
  onCalculated,
  lang,
}: {
  contractId: string;
  eqId: string;
  onCalculated: (bw: number | null, color: number | null) => void;
  lang: Lang;
}) {
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!window.confirm(t("yield.recentMonths", lang).replace("{n}", "6") + " — 재계산하시겠습니까?")) return;
    setBusy(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 6);
      const r = await fetch("/api/yield-analysis/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipmentId: eqId, periodStart: start.toISOString(), periodEnd: end.toISOString() }),
      });
      const j = await r.json();
      if (!r.ok) {
        alert("계산 실패: " + (j?.error ?? "unknown"));
        return;
      }
      const first = j?.results?.[0];
      if (first) onCalculated(first.yieldRateBw, first.yieldRateColor);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button size="sm" variant="accent" onClick={go} disabled={busy}>
      {busy ? "..." : "📊"}
    </Button>
  );
}
