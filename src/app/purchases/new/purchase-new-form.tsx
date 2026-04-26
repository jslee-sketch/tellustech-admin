"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Field, ItemCombobox, Note, Row, SectionTitle, Select, TextInput, Textarea } from "@/components/ui";
import { CURRENCY_OPTIONS, formatCurrency } from "@/lib/currency";
import { t, type Lang } from "@/lib/i18n";

type SupplierOption = { id: string; label: string; paymentTerms: number };
type ProjectInfo = { id: string; code: string; name: string; salesType: string };

type Props = {
  suppliers: SupplierOption[];
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

export function PurchaseNewForm({ suppliers, projects, employeeOptions, warehouseOptions, lang }: Props) {
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
        setError(body.error ? t("msg.saveFailedDetail", lang).replace("{error}", body.error) : t("msg.saveFailed", lang));
        return;
      }
      const data = (await res.json()) as { purchase: { id: string } };
      router.push(`/purchases/${data.purchase.id}`);
      router.refresh();
    } catch {
      setError(t("msg.networkError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  const daysSuffix = lang === "VI" ? " ngày" : lang === "EN" ? " days" : "일";
  const selectionRequiredLabel = lang === "VI" ? "Cần chọn" : lang === "EN" ? "Selection required" : "선택 필요";

  return (
    <form onSubmit={handleSubmit}>
      <Note tone="info">
        {t("note.purchaseAutoNumberPrefix", lang)} <span className="font-mono">PUR-YYMMDD-###</span> {t("note.purchaseAutoNumberSuffix", lang)} (
        {supplier ? `${supplier.paymentTerms}${daysSuffix}` : selectionRequiredLabel})
      </Note>

      <SectionTitle icon="📋" title={t("section.basicInfo", lang)} />
      <Row>
        <Field label={t("field.supplierField", lang)} required>
          <Select
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            placeholder={t("placeholder.select", lang)}
            options={suppliers.map((c) => ({ value: c.id, label: c.label }))}
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
          <Field label={t("field.periodStart", lang)} required width="200px" hint={salesType === "MAINTENANCE" ? t("hint.maintenancePeriod", lang) : t("hint.rentalPeriod", lang)}>
            <TextInput type="date" required value={usagePeriodStart} onChange={(e) => setUsagePeriodStart(e.target.value)} />
          </Field>
          <Field label={t("field.periodEnd", lang)} required width="200px">
            <TextInput type="date" required value={usagePeriodEnd} onChange={(e) => setUsagePeriodEnd(e.target.value)} />
          </Field>
        </Row>
      )}
      {showCert && (
        <Note tone="info">{t("note.calibrationProject", lang)}</Note>
      )}
      {salesType && salesType !== "TRADE" && (
        <Note tone="info">{t("note.nonTradeStock", lang)}</Note>
      )}
      {showWarehouse && (
        <Row>
          <Field label={t("field.warehouseInbnd", lang)} required hint={t("hint.tradeWarehouseIn", lang)}>
            <Select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder={t("placeholder.selectWh", lang)} options={warehouseOptions} />
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
          <TextInput type="number" step="0.000001" min={0} value={fxRate} onChange={(e) => setFxRate(e.target.value)} disabled={currency === "VND"} />
        </Field>
      </Row>

      <SectionTitle icon="📦" title={t("tab.itemsTab", lang)} />
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
                <Button type="button" size="sm" variant="outline" onClick={addRow}>{t("btn.addRow", lang)}</Button>
              </td>
            </tr>
            <tr>
              <td colSpan={showPeriod ? 6 : 4} className="pt-3 text-right text-[13px] font-bold text-[color:var(--tts-sub)]">{t("label.totalLabel", lang).replace("{currency}", currency)}</td>
              <td className="pt-3 text-right font-mono text-[14px] font-extrabold text-[color:var(--tts-primary)]">{formatCurrency(total, currency)}</td>
              <td></td>
            </tr>
            {currency !== "VND" && (
              <tr>
                <td colSpan={showPeriod ? 6 : 4} className="pt-1 text-right text-[11px] text-[color:var(--tts-muted)]">{t("label.fxConvert", lang).replace("{rate}", fxRate)}</td>
                <td className="pt-1 text-right font-mono text-[12px] text-[color:var(--tts-sub)]">{formatCurrency(total * Number(fxRate || 1), "VND")}</td>
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
        <div className="mt-3 rounded-md bg-[color:var(--tts-danger-dim)] px-3 py-2 text-[12px] text-[color:var(--tts-danger)]">{error}</div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--tts-border)] pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("action.saving", lang) : t("btn.purchaseNewSubmit", lang)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/purchases")}>{t("action.cancel", lang)}</Button>
      </div>
    </form>
  );
}
