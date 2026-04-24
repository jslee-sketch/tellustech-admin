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
  SignatureCanvas,
  Tabs,
  TextInput,
  Textarea,
} from "@/components/ui";
import type { DataTableColumn, TabDef } from "@/components/ui";

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
};

const TABS: TabDef[] = [
  { key: "basic", label: "계약기본", icon: "📝" },
  { key: "managers", label: "담당자", icon: "👥" },
  { key: "equipment", label: "장비 목록", icon: "🖨️" },
  { key: "orders", label: "렌탈 오더", icon: "📅" },
  { key: "billing", label: "청구내역", icon: "🧾" },
];

export function ItContractDetail({
  contractId,
  initial,
  equipment: initialEquipment,
  orders: initialOrders,
  billings: initialBillings,
  equipmentOptions,
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
        setError(body.details?.message ?? mapContractError(body.error, body.details?.reason));
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("네트워크 오류가 발생했습니다.");
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
    if (!window.confirm("이 계약을 삭제하시겠습니까? 관련 이력이 있으면 실패합니다.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rental/it-contracts/${contractId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; details?: { message?: string } };
        setError(body.details?.message ?? mapContractError(body.error));
        return;
      }
      router.push("/rental/it-contracts");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
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
          <SectionTitle icon="📝" title="계약 기본" />
          <Row>
            <Field label="계약번호" width="200px">
              <TextInput value={core.contractNumber} disabled />
            </Field>
            <Field label="거래처">
              <TextInput value={`${core.clientCode} · ${core.clientName}`} disabled />
            </Field>
            <Field label="상태" required width="160px">
              <Select
                required
                value={core.status}
                onChange={(e) => set("status", e.target.value)}
                options={[
                  { value: "DRAFT", label: "작성중" },
                  { value: "ACTIVE", label: "활성" },
                  { value: "EXPIRED", label: "만료" },
                  { value: "CANCELED", label: "취소" },
                ]}
              />
            </Field>
          </Row>
          <Row>
            <Field label="설치 주소">
              <TextInput
                value={core.installationAddress}
                onChange={(e) => set("installationAddress", e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="렌탈 시작일" required width="200px">
              <TextInput
                type="date"
                required
                value={core.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </Field>
            <Field label="렌탈 종료일" required width="200px">
              <TextInput
                type="date"
                required
                value={core.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </Field>
          </Row>

          <SectionTitle icon="💰" title="금액 (VND)" />
          <Row>
            <Field label="보증금" width="180px">
              <TextInput
                type="number"
                value={core.deposit}
                onChange={(e) => set("deposit", e.target.value)}
              />
            </Field>
            <Field label="설치비" width="180px">
              <TextInput
                type="number"
                value={core.installationFee}
                onChange={(e) => set("installationFee", e.target.value)}
              />
            </Field>
            <Field label="배송비" width="180px">
              <TextInput
                type="number"
                value={core.deliveryFee}
                onChange={(e) => set("deliveryFee", e.target.value)}
              />
            </Field>
            <Field label="부가서비스비" width="180px">
              <TextInput
                type="number"
                value={core.additionalServiceFee}
                onChange={(e) => set("additionalServiceFee", e.target.value)}
              />
            </Field>
          </Row>

          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingBasic}>
              {savingBasic ? "저장 중..." : "기본 정보 저장"}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto"
            >
              {deleting ? "삭제 중..." : "계약 삭제"}
            </Button>
          </div>
        </form>
      )}

      {active === "managers" && (
        <form onSubmit={handleManagersSubmit}>
          <SectionTitle icon="📋" title="계약 담당자" />
          <ManagerEditBlock prefix="contractMgr" value={core} onChange={set} />

          <SectionTitle icon="🔧" title="기술 담당자" />
          <ManagerEditBlock prefix="technicalMgr" value={core} onChange={set} />

          <SectionTitle icon="💼" title="재경 담당자" />
          <ManagerEditBlock prefix="financeMgr" value={core} onChange={set} />

          <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
            <Button type="submit" disabled={savingMgr}>
              {savingMgr ? "저장 중..." : "담당자 저장"}
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
        />
      )}

      {active === "orders" && (
        <OrdersTab contractId={contractId} orders={orders} setOrders={setOrders} onError={setError} />
      )}

      {active === "billing" && (
        <BillingsTab
          contractId={contractId}
          billings={billings}
          setBillings={setBillings}
          equipmentOptions={equipmentOptions}
          onError={setError}
        />
      )}
    </div>
  );
}

function ManagerEditBlock({
  prefix,
  value,
  onChange,
}: {
  prefix: "contractMgr" | "technicalMgr" | "financeMgr";
  value: ContractCore;
  onChange: <K extends keyof ContractCore>(k: K, v: ContractCore[K]) => void;
}) {
  const nameKey = `${prefix}Name` as keyof ContractCore;
  const phoneKey = `${prefix}Phone` as keyof ContractCore;
  const officeKey = `${prefix}Office` as keyof ContractCore;
  const emailKey = `${prefix}Email` as keyof ContractCore;
  return (
    <Row>
      <Field label="이름">
        <TextInput value={value[nameKey]} onChange={(e) => onChange(nameKey, e.target.value)} />
      </Field>
      <Field label="휴대폰">
        <TextInput value={value[phoneKey]} onChange={(e) => onChange(phoneKey, e.target.value)} />
      </Field>
      <Field label="사무실">
        <TextInput value={value[officeKey]} onChange={(e) => onChange(officeKey, e.target.value)} />
      </Field>
      <Field label="이메일">
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
};

function EquipmentTab({
  contractId,
  equipment,
  onChange,
  onError,
}: {
  contractId: string;
  equipment: Equipment[];
  onChange: (next: Equipment[]) => void;
  onError: (msg: string | null) => void;
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
          onError(body.details?.message ?? "장비 수정에 실패했습니다.");
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
          onError(body.details?.message ?? "장비 추가에 실패했습니다.");
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
    if (!window.confirm("이 장비를 목록에서 제거할까요?")) return;
    onError(null);
    const res = await fetch(`/api/rental/it-contracts/${contractId}/equipment/${id}`, { method: "DELETE" });
    if (!res.ok) {
      onError("장비 삭제에 실패했습니다.");
      return;
    }
    onChange(equipment.filter((x) => x.id !== id));
    router.refresh();
  }

  const columns: DataTableColumn<Equipment>[] = [
    {
      key: "serialNumber",
      label: "S/N",
      width: "160px",
      render: (v) => (
        <span className="font-mono text-[11px] font-bold text-[color:var(--tts-primary)]">{v as string}</span>
      ),
    },
    {
      key: "itemName",
      label: "품목",
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
      label: "월 기본료",
      align: "right",
      width: "120px",
      render: (v) => {
        const s = v as string;
        return s ? formatVnd(s) : <span className="text-[color:var(--tts-muted)]">—</span>;
      },
    },
    {
      key: "bwIncludedPages",
      label: "흑백 기본",
      align: "right",
      width: "100px",
      render: (v, row) => {
        if (!v) return <span className="text-[color:var(--tts-muted)]">—</span>;
        return (
          <span>
            {v as string}
            {row.bwOverageRate && (
              <span className="ml-1 text-[10px] text-[color:var(--tts-muted)]">
                +{formatVnd(row.bwOverageRate)}/매
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "colorIncludedPages",
      label: "컬러 기본",
      align: "right",
      width: "100px",
      render: (v, row) => {
        if (!v) return <span className="text-[color:var(--tts-muted)]">—</span>;
        return (
          <span>
            {v as string}
            {row.colorOverageRate && (
              <span className="ml-1 text-[10px] text-[color:var(--tts-muted)]">
                +{formatVnd(row.colorOverageRate)}/매
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "installedAt",
      label: "설치일",
      width: "100px",
      render: (v) => (v as string) || <span className="text-[color:var(--tts-muted)]">—</span>,
    },
    {
      key: "id",
      label: "",
      width: "140px",
      align: "right",
      render: (_, row) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>
            수정
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
            삭제
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <SectionTitle icon="🖨️" title={`장비 목록 (${equipment.length}대)`} />
          <Note tone="info">
            S/N 엄격 재고확인은 Phase 2 #5 재고관리 구현 후 활성화됩니다. 지금은 계약 내
            S/N 중복만 방지합니다. 엑셀 대량 업로드도 다음 청크에서 추가 예정입니다.
          </Note>
        </div>
        {!showAdd && !editingId && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            + 장비 추가
          </Button>
        )}
      </div>

      {(showAdd || editingId) && (
        <form
          onSubmit={handleSave}
          className="mb-4 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3"
        >
          <Row>
            <Field label="S/N" required width="220px">
              <TextInput
                required
                value={draft.serialNumber}
                onChange={(e) => setDraft((p) => ({ ...p, serialNumber: e.target.value }))}
                placeholder="SL-X7500-ABC-123"
              />
            </Field>
            <Field label="품목" required>
              <ItemCombobox
                value={draft.itemId}
                initialCode={draft.itemCode}
                initialName={draft.itemName}
                onChange={(id) => setDraft((p) => ({ ...p, itemId: id }))}
                required
              />
            </Field>
            <Field label="제조사" width="160px">
              <TextInput
                value={draft.manufacturer}
                onChange={(e) => setDraft((p) => ({ ...p, manufacturer: e.target.value }))}
                placeholder="SINDOH"
              />
            </Field>
          </Row>
          <Row>
            <Field label="월 기본료 (VND)" width="180px">
              <TextInput
                type="number"
                value={draft.monthlyBaseFee}
                onChange={(e) => setDraft((p) => ({ ...p, monthlyBaseFee: e.target.value }))}
              />
            </Field>
            <Field label="흑백 기본 매수" width="150px">
              <TextInput
                type="number"
                value={draft.bwIncludedPages}
                onChange={(e) => setDraft((p) => ({ ...p, bwIncludedPages: e.target.value }))}
              />
            </Field>
            <Field label="흑백 초과 (VND/매)" width="170px">
              <TextInput
                type="number"
                value={draft.bwOverageRate}
                onChange={(e) => setDraft((p) => ({ ...p, bwOverageRate: e.target.value }))}
              />
            </Field>
            <Field label="컬러 기본 매수" width="150px">
              <TextInput
                type="number"
                value={draft.colorIncludedPages}
                onChange={(e) => setDraft((p) => ({ ...p, colorIncludedPages: e.target.value }))}
              />
            </Field>
            <Field label="컬러 초과 (VND/매)" width="170px">
              <TextInput
                type="number"
                value={draft.colorOverageRate}
                onChange={(e) => setDraft((p) => ({ ...p, colorOverageRate: e.target.value }))}
              />
            </Field>
          </Row>
          <Row>
            <Field label="설치일" width="180px">
              <TextInput
                type="date"
                value={draft.installedAt}
                onChange={(e) => setDraft((p) => ({ ...p, installedAt: e.target.value }))}
              />
            </Field>
            <Field label="철거일" width="180px">
              <TextInput
                type="date"
                value={draft.removedAt}
                onChange={(e) => setDraft((p) => ({ ...p, removedAt: e.target.value }))}
              />
            </Field>
            <Field label="비고">
              <Textarea
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
              />
            </Field>
          </Row>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "저장 중..." : editingId ? "수정 저장" : "장비 추가"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              취소
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        data={equipment}
        rowKey={(e) => e.id}
        emptyMessage="등록된 장비가 없습니다"
      />

      {equipment.length > 0 && (
        <div className="mt-3 text-right text-[13px] text-[color:var(--tts-sub)]">
          합계 월 기본료:{" "}
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
  };
}

function mapContractError(code: string | undefined, reason?: string): string {
  if (code === "invalid_input" && reason === "before_start") {
    return "종료일이 시작일보다 빠를 수 없습니다.";
  }
  switch (code) {
    case "invalid_client":
      return "선택한 거래처를 찾을 수 없습니다.";
    case "invalid_input":
      return "입력값이 올바르지 않습니다.";
    case "has_dependent_rows":
      return "관련 이력이 있어 삭제할 수 없습니다.";
    case "not_found":
      return "계약을 찾을 수 없습니다.";
    default:
      return "저장에 실패했습니다.";
  }
}

// ─── Orders Tab ─────────────────────────────────────────────────────────

function OrdersTab({
  contractId,
  orders,
  setOrders,
  onError,
}: {
  contractId: string;
  orders: RentalOrder[];
  setOrders: (next: RentalOrder[]) => void;
  onError: (msg: string | null) => void;
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
        onError("자동 생성 실패");
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
    } else onError("오더 상태 변경 실패");
  }

  async function handleAmountEdit(order: RentalOrder) {
    const input = window.prompt(`월 ${order.billingMonth} 청구액을 입력하세요 (VND)`, order.amount);
    if (input === null) return;
    const res = await fetch(`/api/rental/it-contracts/${contractId}/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: input }),
    });
    if (res.ok) {
      await reload();
      router.refresh();
    } else onError("금액 변경 실패");
  }

  async function handleDelete(order: RentalOrder) {
    if (!window.confirm(`월 ${order.billingMonth} 오더를 삭제할까요? (자동 생성 버튼으로 다시 만들 수 있습니다)`)) return;
    const res = await fetch(`/api/rental/it-contracts/${contractId}/orders/${order.id}`, { method: "DELETE" });
    if (res.ok) {
      await reload();
      router.refresh();
    } else onError("삭제 실패");
  }

  const activeTotal = orders
    .filter((o) => !o.canceled)
    .reduce((sum, o) => sum + Number(o.amount), 0);

  const columns: DataTableColumn<RentalOrder>[] = [
    {
      key: "billingMonth",
      label: "청구 월",
      width: "120px",
      render: (v) => <span className="font-mono text-[12px] font-bold">{v as string}</span>,
    },
    {
      key: "amount",
      label: "금액 (VND)",
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
      label: "상태",
      width: "100px",
      render: (v) => (v ? <Badge tone="danger">취소</Badge> : <Badge tone="success">활성</Badge>),
    },
    {
      key: "editable",
      label: "잠금",
      width: "80px",
      render: (v) =>
        v ? (
          <span className="text-[11px] text-[color:var(--tts-muted)]">편집가능</span>
        ) : (
          <Badge tone="warn">잠김</Badge>
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
            금액
          </Button>
          <Button
            size="sm"
            variant={row.canceled ? "success" : "outline"}
            disabled={!row.editable}
            onClick={() => handleToggleCancel(row)}
          >
            {row.canceled ? "복원" : "취소"}
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
        <SectionTitle icon="📅" title={`월별 렌탈 오더 (${orders.length}건)`} />
        <Button size="sm" onClick={handleGenerate} disabled={generating} variant="accent">
          {generating ? "생성 중..." : "🔄 누락 월 자동 생성"}
        </Button>
      </div>
      <Note tone="info">
        계약기간에 해당하는 월을 자동으로 채웁니다. 이미 있는 월은 건너뛰므로 여러 번 눌러도 안전.
        각 오더는 <strong>편집 가능</strong> 이면 금액 수정/취소/삭제가 됩니다. 취소된 오더는 활성 합계에서
        제외됩니다. 장비 기본료 변경 시 기존 오더 금액은 자동 재산정되지 않습니다 — 개별 수정 또는 해당 월을
        삭제 후 재생성.
      </Note>
      {generateResult && (
        <div className="my-3 rounded-md bg-[color:var(--tts-success-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-success)]">
          ✅ {generateResult.created}건 신규 생성, {generateResult.skipped}건 스킵 (총 대상 월 {generateResult.totalMonths}).
        </div>
      )}
      <DataTable columns={columns} data={orders} rowKey={(o) => o.id} emptyMessage="생성된 렌탈 오더가 없습니다. 위 버튼으로 생성하세요." />
      {orders.length > 0 && (
        <div className="mt-3 text-right text-[14px] font-bold">
          활성 합계{" "}
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
}: {
  contractId: string;
  billings: MonthlyBilling[];
  setBillings: (v: MonthlyBilling[]) => void;
  equipmentOptions: { value: string; label: string }[];
  onError: (msg: string | null) => void;
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
        onError(body.details?.message ?? "청구 저장 실패");
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
    if (!window.confirm("이 청구를 삭제하시겠습니까?")) return;
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
      onError("사진 업로드 실패");
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
      label: "S/N",
      width: "160px",
      render: (v) => <span className="font-mono text-[11px]">{v as string}</span>,
    },
    {
      key: "counterBw",
      label: "흑백",
      width: "90px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{v == null ? "—" : Number(v).toLocaleString()}</span>,
    },
    {
      key: "counterColor",
      label: "컬러",
      width: "90px",
      align: "right",
      render: (v) => <span className="font-mono text-[12px]">{v == null ? "—" : Number(v).toLocaleString()}</span>,
    },
    {
      key: "billingMethod",
      label: "방식",
      width: "80px",
      render: (v) => {
        const s = v as string;
        return <Badge tone={s === "SNMP" ? "primary" : s === "PHOTO" ? "accent" : "neutral"}>{s}</Badge>;
      },
    },
    {
      key: "yieldVerified",
      label: "수율검증",
      width: "90px",
      render: (v, row) => (
        <button
          type="button"
          onClick={() => handleVerifyToggle(row)}
          className="text-[11px]"
        >
          {v ? <Badge tone="success">검증됨</Badge> : <Badge tone="warn">미검증</Badge>}
        </button>
      ),
    },
    {
      key: "customerSignature",
      label: "서명",
      width: "60px",
      align: "center",
      render: (v) => (v ? "✍️" : <span className="text-[color:var(--tts-muted)]">—</span>),
    },
    {
      key: "computedAmount",
      label: "청구액",
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
        <SectionTitle icon="🧾" title={`월별 청구 컨펌 (${billings.length}건)`} />
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)} disabled={equipmentOptions.length === 0}>
            + 청구 입력
          </Button>
        )}
      </div>
      <Note tone="info">
        이전 월 카운터와의 delta 로 사용량을 계산해 장비별 기본료 + 흑백/컬러 초과 과금을 자동 합산합니다.
        <strong>첫 월은 이전 기록이 없어 현재 카운터 전체를 사용량으로 간주</strong>합니다 — 설치 시점 공장
        초기값이 아닌 기존 사용 기기라면 설치 시 카운터를 별도로 관리하는 첫 컨펌 레코드를 먼저 생성하고
        이후 월부터 delta 가 맞게 계산되도록 사용하세요. 고객 서명은 HTML5 Canvas 에서 base64 PNG 로 저장.
      </Note>
      {lastCalc && (
        <div className="my-3 rounded-md bg-[color:var(--tts-success-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-success)]">
          ✅ 청구 저장됨 — 자동 계산액 {formatVnd(lastCalc)} VND
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleSubmit}
          className="my-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card-hover)] p-3"
        >
          <Row>
            <Field label="장비 S/N" required>
              <Select
                required
                value={draft.serialNumber}
                onChange={(e) => setDraft((p) => ({ ...p, serialNumber: e.target.value }))}
                placeholder="선택"
                options={equipmentOptions}
              />
            </Field>
            <Field label="청구 월" required width="180px" hint="YYYY-MM">
              <TextInput
                required
                value={draft.billingMonth}
                onChange={(e) => setDraft((p) => ({ ...p, billingMonth: e.target.value }))}
                placeholder="2026-05"
                pattern="\d{4}-\d{2}"
              />
            </Field>
            <Field label="수집 방식" width="140px">
              <Select
                value={draft.billingMethod}
                onChange={(e) => setDraft((p) => ({ ...p, billingMethod: e.target.value }))}
                options={[
                  { value: "MANUAL", label: "수동" },
                  { value: "SNMP", label: "SNMP" },
                  { value: "PHOTO", label: "사진" },
                ]}
              />
            </Field>
          </Row>
          <Row>
            <Field label="흑백 카운터" width="200px">
              <TextInput
                type="number"
                value={draft.counterBw}
                onChange={(e) => setDraft((p) => ({ ...p, counterBw: e.target.value }))}
                placeholder="12345"
              />
            </Field>
            <Field label="컬러 카운터" width="200px">
              <TextInput
                type="number"
                value={draft.counterColor}
                onChange={(e) => setDraft((p) => ({ ...p, counterColor: e.target.value }))}
                placeholder="678"
              />
            </Field>
            <Field label="수율 검증" width="160px">
              <Checkbox
                checked={draft.yieldVerified}
                onChange={(e) => setDraft((p) => ({ ...p, yieldVerified: e.target.checked }))}
                label="확인함"
              />
            </Field>
          </Row>
          <Row>
            <Field label="미터기 사진" hint="방식=PHOTO 일 때 권장">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[12px] text-[color:var(--tts-sub)] hover:border-[color:var(--tts-primary)]">
                📎 {draft.photoUrl ? "교체" : "사진 선택"}
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
                <div className="mt-1 text-[11px] text-[color:var(--tts-muted)]">✅ 첨부됨</div>
              )}
            </Field>
          </Row>
          <div className="mt-2">
            <div className="mb-1 text-[12px] font-semibold text-[color:var(--tts-sub)]">고객 전자서명</div>
            <SignatureCanvas
              value={draft.customerSignature}
              onChange={(v) => setDraft((p) => ({ ...p, customerSignature: v }))}
              width={480}
              height={150}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "저장 중..." : "청구 저장"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={resetDraft}>
              취소
            </Button>
          </div>
        </form>
      )}

      {months.length === 0 ? (
        <Note tone="info">등록된 청구가 없습니다. 위 버튼으로 입력하세요.</Note>
      ) : (
        months.map((m) => {
          const rows = billings.filter((b) => b.billingMonth === m);
          return (
            <div key={m} className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="font-mono font-bold text-[color:var(--tts-primary)]">{m}</span>
                <span className="text-[color:var(--tts-sub)]">
                  월 합계{" "}
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
