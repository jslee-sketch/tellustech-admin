"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Button,
  Field,
  ItemCombobox,
  Note,
  Row,
  SectionTitle,
  Select,
  TextInput,
  Textarea,
} from "@/components/ui";
import { CURRENCY_OPTIONS, formatCurrency } from "@/lib/currency";
import { t, type Lang } from "@/lib/i18n";

type ClientOption = { id: string; label: string; paymentTerms: number };
type ProjectInfo = { id: string; code: string; name: string; salesType: string };

type Props = {
  clients: ClientOption[];
  projects: ProjectInfo[];
  employeeOptions: { value: string; label: string }[];
  warehouseOptions: { value: string; label: string }[];
  lang: Lang;
};

type ItemDraft = {
  itemId: string;
  serialNumber: string;
  quantity: string;
  unitPrice: string;
  // MAINTENANCE/RENTAL 전용 — 라인 기간
  startDate: string;
  endDate: string;
  // CALIBRATION 전용
  certNumber: string;
  issuedAt: string;
  certFile: File | null;
};

const emptyItem: ItemDraft = {
  itemId: "",
  serialNumber: "",
  quantity: "1",
  unitPrice: "0",
  startDate: "",
  endDate: "",
  certNumber: "",
  issuedAt: "",
  certFile: null,
};


export function SalesNewForm({ clients, projects, employeeOptions, warehouseOptions, lang }: Props) {
  const router = useRouter();
  const projectOptions = projects.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }));
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const selectedProject = projects.find((p) => p.id === projectId) ?? null;
  const salesType = selectedProject?.salesType ?? null;
  const showPeriod = salesType === "MAINTENANCE" || salesType === "RENTAL";
  const showCert = salesType === "CALIBRATION";
  const showWarehouse = salesType === "TRADE";
  const [salesEmployeeId, setSalesEmployeeId] = useState("");
  const [usagePeriodStart, setUsagePeriodStart] = useState("");
  const [usagePeriodEnd, setUsagePeriodEnd] = useState("");
  const [currency, setCurrency] = useState<"VND" | "USD" | "KRW" | "JPY" | "CNY">("VND");
  const [fxRate, setFxRate] = useState("1");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([{ ...emptyItem }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);
  const total = useMemo(
    () =>
      items.reduce((sum, it) => {
        const q = Number(it.quantity);
        const p = Number(it.unitPrice);
        return sum + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0);
      }, 0),
    [items],
  );

  // 헤더 기간이 바뀌면 라인 기간이 비어있거나 이전 헤더값과 동일한 라인에 자동 적용.
  // (사용자가 이미 수정한 라인은 건드리지 않도록 "prevHeader" 를 추적)
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
    // 신규 라인은 헤더 기간을 기본값으로 시작
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
      const payload = {
        clientId,
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
      };
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; details?: { field?: string; message?: string } };
        setError(body.details?.message ?? mapError(body.error, body.details?.field, lang));
        return;
      }
      const data = (await res.json()) as { sales: { id: string } };
      router.push(`/sales/${data.sales.id}`);
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">
        {t("note.salesAutoNumberPre", lang)} <span className="font-mono">SLS-YYMMDD-###</span> {t("note.salesAutoNumberPost", lang)}
        {selectedClient ? `${selectedClient.paymentTerms} ${t("common.daySuffix", lang)}` : t("common.selectionRequired", lang)}{t("note.salesAutoNumberEnd", lang)}
      </Note>

      <SectionTitle icon="📋" title={t("section.basicInfo", lang)} />
      <Row>
        <Field label={t("field.client", lang)} required>
          <Select
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={clients.map((c) => ({ value: c.id, label: c.label }))}
          />
        </Field>
        <Field label={t("field.project", lang)} required>
          <Select
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={projectOptions}
          />
        </Field>
        <Field label={t("field.salesPicOpt", lang)}>
          <Select
            value={salesEmployeeId}
            onChange={(e) => setSalesEmployeeId(e.target.value)}
            placeholder={t("placeholder.notSelected", lang)}
            options={employeeOptions}
          />
        </Field>
      </Row>
      {showPeriod && (
        <Row>
          <Field label={t("field.periodStart", lang)} required={showPeriod} width="200px" hint={salesType === "MAINTENANCE" ? t("hint.maintenancePeriod", lang) : t("hint.rentalPeriod", lang)}>
            <TextInput
              type="date"
              required={showPeriod}
              value={usagePeriodStart}
              onChange={(e) => setUsagePeriodStart(e.target.value)}
            />
          </Field>
          <Field label={t("field.periodEnd", lang)} required={showPeriod} width="200px">
            <TextInput
              type="date"
              required={showPeriod}
              value={usagePeriodEnd}
              onChange={(e) => setUsagePeriodEnd(e.target.value)}
            />
          </Field>
        </Row>
      )}
      {showCert && (
        <Note tone="info">{t("note.calibProject", lang)}</Note>
      )}
      {salesType && salesType !== "TRADE" && (
        <Note tone="info">{t("note.nonTradeStock", lang)}</Note>
      )}
      {showWarehouse && (
        <Row>
          <Field label={t("field.warehouseShip", lang)} required hint={t("hint.tradeWarehouse", lang)}>
            <Select
              required
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder={t("placeholder.selectWh", lang)}
              options={warehouseOptions}
            />
          </Field>
        </Row>
      )}

      <Row>
        <Field label={t("field.currency", lang)} required width="200px">
          <Select
            required
            value={currency}
            onChange={(e) => setCurrency(e.target.value as typeof currency)}
            options={CURRENCY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
          />
        </Field>
        <Field label={t("field.fxRate", lang)} width="200px" hint={currency === "VND" ? t("hint.fxRateVndDefault", lang) : t("hint.fxRateConversion", lang).replace("{currency}", currency)}>
          <TextInput
            type="number"
            step="0.000001"
            min={0}
            value={fxRate}
            onChange={(e) => setFxRate(e.target.value)}
            disabled={currency === "VND"}
          />
        </Field>
      </Row>

      <SectionTitle icon="📦" title={t("tab.itemsTab", lang)} />
      <Note tone="info">{t("note.snLooseSales", lang)}</Note>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full table-fixed text-[13px]">
          <thead className="bg-[color:var(--tts-primary-dim)] text-left text-[12px] font-bold text-[color:var(--tts-primary)]">
            <tr>
              <th className="px-2 py-2">{t("field.itemRequired", lang)}</th>
              <th className="px-2 py-2" style={{ width: 130 }}>{t("col.serial", lang)}</th>
              {showPeriod && <th className="px-2 py-2" style={{ width: 130 }}>{t("field.startDate", lang)}</th>}
              {showPeriod && <th className="px-2 py-2" style={{ width: 130 }}>{t("field.endDate", lang)}</th>}
              <th className="px-2 py-2 text-right" style={{ width: 70 }}>{t("col.qty", lang)} *</th>
              <th className="px-2 py-2 text-right" style={{ width: 130 }}>{t("col.unitPrice", lang)} *</th>
              <th className="px-2 py-2 text-right" style={{ width: 130 }}>{t("col.amount", lang)}</th>
              <th className="px-2 py-2" style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const lineAmount = Number(it.quantity) * Number(it.unitPrice);
              return (
                <tr key={i} className="border-b border-[color:var(--tts-border)]">
                  <td className="px-2 py-1">
                    <ItemCombobox
                      value={it.itemId}
                      onChange={(id) => updateItem(i, "itemId", id)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <TextInput
                      className="w-full"
                      value={it.serialNumber}
                      onChange={(e) => updateItem(i, "serialNumber", e.target.value)}
                    />
                  </td>
                  {showPeriod && (
                    <td className="px-2 py-1">
                      <TextInput
                        className="w-full"
                        type="date"
                        value={it.startDate}
                        onChange={(e) => updateItem(i, "startDate", e.target.value)}
                      />
                    </td>
                  )}
                  {showPeriod && (
                    <td className="px-2 py-1">
                      <TextInput
                        className="w-full"
                        type="date"
                        value={it.endDate}
                        onChange={(e) => updateItem(i, "endDate", e.target.value)}
                      />
                    </td>
                  )}
                  <td className="px-2 py-1">
                    <TextInput
                      className="w-full text-right"
                      type="number"
                      value={it.quantity}
                      onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <TextInput
                      className="w-full text-right"
                      type="number"
                      value={it.unitPrice}
                      onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-mono text-[12px]">
                    {Number.isFinite(lineAmount) ? formatCurrency(lineAmount, currency) : "—"}
                  </td>
                  <td className="px-1 py-1 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRow(i)}
                      disabled={items.length <= 1}
                    >
                      ×
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={showPeriod ? 8 : 6} className="pt-2">
                <Button type="button" size="sm" variant="outline" onClick={addRow}>
                  {t("btn.addRow", lang)}
                </Button>
              </td>
            </tr>
            <tr>
              <td colSpan={showPeriod ? 6 : 4} className="pt-3 text-right text-[13px] font-bold text-[color:var(--tts-sub)]">
                {t("label.totalLabel", lang).replace("{currency}", currency)}
              </td>
              <td className="pt-3 text-right font-mono text-[14px] font-extrabold text-[color:var(--tts-primary)]">
                {formatCurrency(total, currency)}
              </td>
              <td></td>
            </tr>
            {currency !== "VND" && (
              <tr>
                <td colSpan={showPeriod ? 6 : 4} className="pt-1 text-right text-[11px] text-[color:var(--tts-muted)]">
                  {t("label.fxConvert", lang).replace("{rate}", fxRate)}
                </td>
                <td className="pt-1 text-right font-mono text-[12px] text-[color:var(--tts-sub)]">
                  {formatCurrency(total * Number(fxRate || 1), "VND")}
                </td>
                <td></td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      <SectionTitle icon="📝" title={t("section.memo", lang)} />
      <Row>
        <Field label={t("field.notes", lang)}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
      </Row>

      {error && (
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("action.saving", lang) : t("btn.salesNewSubmit", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/sales")}>
          {t("action.cancel", lang)}
        </Button>
      </div>
    </form>
  );
}

function mapError(code: string | undefined, field: string | undefined, lang: Lang): string {
  if (code === "invalid_input" && field) return `${t("msg.invalidInputField", lang)} ${field}`;
  switch (code) {
    case "invalid_client":
      return t("msg.invalidClient", lang);
    case "invalid_sales_employee":
      return t("msg.invalidSalesEmp", lang);
    case "invalid_project":
      return t("msg.invalidProject", lang);
    default:
      return t("msg.saveFailed", lang);
  }
}
