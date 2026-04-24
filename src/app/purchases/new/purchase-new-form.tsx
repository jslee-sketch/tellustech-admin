"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Field, ItemCombobox, Note, Row, SectionTitle, Select, TextInput, Textarea } from "@/components/ui";
import { CURRENCY_OPTIONS, formatCurrency } from "@/lib/currency";

type SupplierOption = { id: string; label: string; paymentTerms: number };
type ProjectInfo = { id: string; code: string; name: string; salesType: string };

type Props = {
  suppliers: SupplierOption[];
  projects: ProjectInfo[];
  employeeOptions: { value: string; label: string }[];
  warehouseOptions: { value: string; label: string }[];
};

type ItemDraft = {
  itemId: string;
  serialNumber: string;
  quantity: string;
  unitPrice: string;
  startDate: string;
  endDate: string;
};

const emptyItem: ItemDraft = {
  itemId: "",
  serialNumber: "",
  quantity: "1",
  unitPrice: "0",
  startDate: "",
  endDate: "",
};

export function PurchaseNewForm({ suppliers, projects, employeeOptions, warehouseOptions }: Props) {
  const router = useRouter();
  const projectOptions = projects.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }));
  const [supplierId, setSupplierId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const selectedProject = projects.find((p) => p.id === projectId) ?? null;
  const salesType = selectedProject?.salesType ?? null;
  const showPeriod = salesType === "MAINTENANCE" || salesType === "RENTAL";
  const showCert = salesType === "CALIBRATION";
  const showWarehouse = salesType === "TRADE";
  const [salesEmployeeId, setSalesEmployeeId] = useState("");
  const [currency, setCurrency] = useState<"VND" | "USD" | "KRW" | "JPY" | "CNY">("VND");
  const [fxRate, setFxRate] = useState("1");
  const [usagePeriodStart, setUsagePeriodStart] = useState("");
  const [usagePeriodEnd, setUsagePeriodEnd] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([{ ...emptyItem }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const supplier = suppliers.find((c) => c.id === supplierId);
  const total = useMemo(
    () =>
      items.reduce((sum, it) => {
        const q = Number(it.quantity);
        const p = Number(it.unitPrice);
        return sum + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0);
      }, 0),
    [items],
  );

  const [prevHeader, setPrevHeader] = useState({ start: "", end: "" });
  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => {
        const start = !it.startDate || it.startDate === prevHeader.start ? usagePeriodStart : it.startDate;
        const end = !it.endDate || it.endDate === prevHeader.end ? usagePeriodEnd : it.endDate;
        return { ...it, startDate: start, endDate: end };
      }),
    );
    setPrevHeader({ start: usagePeriodStart, end: usagePeriodEnd });
  }, [usagePeriodStart, usagePeriodEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateItem<K extends keyof ItemDraft>(idx: number, key: K, value: ItemDraft[K]) {
    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, [key]: value } : x)));
  }
  function addRow() {
    setItems((prev) => [
      ...prev,
      { ...emptyItem, startDate: usagePeriodStart, endDate: usagePeriodEnd },
    ]);
  }
  function removeRow(idx: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          projectId: projectId || null,
          salesEmployeeId: salesEmployeeId || null,
          warehouseId: showWarehouse ? warehouseId : null,
          usagePeriodStart: usagePeriodStart || null,
          usagePeriodEnd: usagePeriodEnd || null,
          currency,
          fxRate,
          note: note || null,
          items: items
            .filter((x) => x.itemId)
            .map((x) => ({
              itemId: x.itemId,
              serialNumber: x.serialNumber || null,
              quantity: x.quantity,
              unitPrice: x.unitPrice,
              startDate: x.startDate || null,
              endDate: x.endDate || null,
            })),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ? `저장 실패: ${body.error}` : "저장에 실패했습니다.");
        return;
      }
      const data = (await res.json()) as { purchase: { id: string } };
      router.push(`/purchases/${data.purchase.id}`);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">
        매입번호는 저장 시 <span className="font-mono">PUR-YYMMDD-###</span> 로 자동 발급되며, 공급사 결제조건(
        {supplier ? `${supplier.paymentTerms}일` : "선택 필요"})에 따라 미지급금이 자동 생성됩니다.
      </Note>

      <SectionTitle icon="📋" title="기본 정보" />
      <Row>
        <Field label="공급사" required>
          <Select
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            placeholder="선택"
            options={suppliers.map((c) => ({ value: c.id, label: c.label }))}
          />
        </Field>
        <Field label="프로젝트" required>
          <Select
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="선택"
            options={projectOptions}
          />
        </Field>
        <Field label="영업담당 (옵션)">
          <Select
            value={salesEmployeeId}
            onChange={(e) => setSalesEmployeeId(e.target.value)}
            placeholder="선택 안 함"
            options={employeeOptions}
          />
        </Field>
      </Row>
      {showPeriod && (
        <Row>
          <Field label="기간 시작" required width="200px" hint={salesType === "MAINTENANCE" ? "유지보수 기간" : "렌탈 기간"}>
            <TextInput type="date" required value={usagePeriodStart} onChange={(e) => setUsagePeriodStart(e.target.value)} />
          </Field>
          <Field label="기간 종료" required width="200px">
            <TextInput type="date" required value={usagePeriodEnd} onChange={(e) => setUsagePeriodEnd(e.target.value)} />
          </Field>
        </Row>
      )}
      {showCert && (
        <Note tone="info">
          교정(CALIBRATION) 프로젝트 — 저장 후 상세 페이지에서 라인별로 교정성적서(번호 · PDF · 발행일)를 등록할 수 있습니다.
        </Note>
      )}
      {showWarehouse && (
        <Row>
          <Field label="입고 창고" required hint="구매(TRADE) — 저장 시 각 품목이 이 창고로 IN 처리됩니다">
            <Select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="창고 선택" options={warehouseOptions} />
          </Field>
        </Row>
      )}

      <Row>
        <Field label="통화" required width="200px">
          <Select
            required
            value={currency}
            onChange={(e) => setCurrency(e.target.value as typeof currency)}
            options={CURRENCY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
          />
        </Field>
        <Field label="환율 (1 단위 → VND)" width="200px" hint={currency === "VND" ? "VND 는 기본 1" : `1 ${currency} = ? VND`}>
          <TextInput type="number" step="0.000001" min={0} value={fxRate} onChange={(e) => setFxRate(e.target.value)} disabled={currency === "VND"} />
        </Field>
      </Row>

      <SectionTitle icon="📦" title="품목" />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full table-fixed text-[13px]">
          <thead className="bg-[color:var(--tts-primary-dim)] text-left text-[12px] font-bold text-[color:var(--tts-primary)]">
            <tr>
              <th className="px-2 py-2">품목 *</th>
              <th className="px-2 py-2" style={{ width: 130 }}>S/N</th>
              {showPeriod && <th className="px-2 py-2" style={{ width: 130 }}>시작일</th>}
              {showPeriod && <th className="px-2 py-2" style={{ width: 130 }}>종료일</th>}
              <th className="px-2 py-2 text-right" style={{ width: 70 }}>수량 *</th>
              <th className="px-2 py-2 text-right" style={{ width: 130 }}>단가 *</th>
              <th className="px-2 py-2 text-right" style={{ width: 130 }}>금액</th>
              <th className="px-2 py-2" style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const lineAmount = Number(it.quantity) * Number(it.unitPrice);
              return (
                <tr key={i} className="border-b border-[color:var(--tts-border)]">
                  <td className="px-2 py-1"><ItemCombobox value={it.itemId} onChange={(id) => updateItem(i, "itemId", id)} /></td>
                  <td className="px-2 py-1"><TextInput className="w-full" value={it.serialNumber} onChange={(e) => updateItem(i, "serialNumber", e.target.value)} /></td>
                  {showPeriod && <td className="px-2 py-1"><TextInput className="w-full" type="date" value={it.startDate} onChange={(e) => updateItem(i, "startDate", e.target.value)} /></td>}
                  {showPeriod && <td className="px-2 py-1"><TextInput className="w-full" type="date" value={it.endDate} onChange={(e) => updateItem(i, "endDate", e.target.value)} /></td>}
                  <td className="px-2 py-1"><TextInput className="w-full text-right" type="number" value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} /></td>
                  <td className="px-2 py-1"><TextInput className="w-full text-right" type="number" value={it.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} /></td>
                  <td className="px-2 py-1 text-right font-mono text-[12px]">{Number.isFinite(lineAmount) ? formatCurrency(lineAmount, currency) : "—"}</td>
                  <td className="px-1 py-1 text-right">
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeRow(i)} disabled={items.length <= 1}>×</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={showPeriod ? 8 : 6} className="pt-2">
                <Button type="button" size="sm" variant="outline" onClick={addRow}>+ 품목 행 추가</Button>
              </td>
            </tr>
            <tr>
              <td colSpan={showPeriod ? 6 : 4} className="pt-3 text-right text-[13px] font-bold text-[color:var(--tts-sub)]">합계 ({currency})</td>
              <td className="pt-3 text-right font-mono text-[14px] font-extrabold text-[color:var(--tts-primary)]">{formatCurrency(total, currency)}</td>
              <td></td>
            </tr>
            {currency !== "VND" && (
              <tr>
                <td colSpan={showPeriod ? 6 : 4} className="pt-1 text-right text-[11px] text-[color:var(--tts-muted)]">≈ VND 환산 (환율 {fxRate})</td>
                <td className="pt-1 text-right font-mono text-[12px] text-[color:var(--tts-sub)]">{formatCurrency(total * Number(fxRate || 1), "VND")}</td>
                <td></td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      <SectionTitle icon="📝" title="비고" />
      <Row>
        <Field label="메모">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
      </Row>

      {error && (
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : "매입 등록하고 상세 열기"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/purchases")}>취소</Button>
      </div>
    </form>
  );
}
