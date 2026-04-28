"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button, Field, ItemCombobox, Row, Select, SerialCombobox, TextInput } from "@/components/ui";
import { LABEL_SPECS, type LabelSize } from "@/lib/qr-label";
import { t, type Lang } from "@/lib/i18n";

type ItemOpt = { value: string; label: string; itemCode: string; itemName: string };
type LabelRow = { itemCode: string; itemName: string; serialNumber: string; copies: number; qrUrl?: string };
type PrintHeader = { supplierName: string; purchaseDate: string; purchaseNumber: string };
type Props = {
  items: ItemOpt[];
  prefill: { itemCode: string; itemName: string; serialNumber: string | null }[];
  printHeader?: PrintHeader | null;
  lang: Lang;
};

export function LabelsClient({ items, prefill, printHeader, lang }: Props) {
  const [rows, setRows] = useState<LabelRow[]>(
    prefill.length > 0
      ? prefill.map((p) => ({ itemCode: p.itemCode, itemName: p.itemName, serialNumber: p.serialNumber ?? "", copies: 1 }))
      : [{ itemCode: "", itemName: "", serialNumber: "", copies: 1 }],
  );
  const [size, setSize] = useState<LabelSize>("LARGE");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [sn, setSn] = useState("");
  const [copies, setCopies] = useState("1");

  async function addRow() {
    if (!selectedItemId) return;
    let item = items.find((i) => i.value === selectedItemId);
    if (!item) {
      // ItemCombobox 가 prefill 외 항목을 선택했을 때 — API 로 1건만 다시 조회
      try {
        const res = await fetch(`/api/master/items?q=${encodeURIComponent(selectedItemId)}`).then((r) => r.json());
        const found = (res.items ?? []).find((x: { id: string; itemCode: string; name: string }) => x.id === selectedItemId);
        if (found) item = { value: found.id, label: `${found.itemCode} · ${found.name}`, itemCode: found.itemCode, itemName: found.name };
      } catch {
        return;
      }
    }
    if (!item) return;
    setRows((r) => [...r, { itemCode: item!.itemCode, itemName: item!.itemName, serialNumber: sn, copies: Math.max(1, Number(copies) || 1) }]);
    setSelectedItemId("");
    setSn("");
    setCopies("1");
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }

  useEffect(() => {
    // 행별 QR 데이터 URL 생성
    (async () => {
      const updated = await Promise.all(
        rows.map(async (r) => {
          if (r.qrUrl || !r.itemCode) return r;
          const payload = JSON.stringify({ itemCode: r.itemCode, serialNumber: r.serialNumber || undefined, itemName: r.itemName });
          const qrUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 256 });
          return { ...r, qrUrl };
        }),
      );
      if (updated.some((r, i) => r.qrUrl !== rows[i]?.qrUrl)) setRows(updated);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  // 전체 복사본 (라벨 1장 = 1 label)
  const allLabels = useMemo(() => rows.flatMap((r) => Array.from({ length: r.copies }, () => r)), [rows]);
  const spec = LABEL_SPECS[size];

  return (
    <div>
      <div className="print:hidden">
        <Row>
          <Field label={t("field.labelSize", lang)} required width="240px">
            <Select value={size} onChange={(e) => setSize(e.target.value as LabelSize)} options={[
              { value: "LARGE",  label: t("labelSize.large", lang) },
              { value: "MEDIUM", label: t("labelSize.medium", lang) },
              { value: "SMALL",  label: t("labelSize.small", lang) },
            ]} />
          </Field>
          <Field label={t("field.perPage", lang)} width="140px">
            <div className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)]">
              {t("label.sheetsCount", lang).replace("{count}", String(spec.perRow * spec.perCol))}
            </div>
          </Field>
        </Row>

        <div className="mt-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-3">
          <div className="mb-2 text-[12px] font-bold text-[color:var(--tts-sub)]">{t("label.addLabel", lang)}</div>
          <Row>
            <Field label={t("field.item", lang)} required>
              <ItemCombobox value={selectedItemId} onChange={setSelectedItemId} lang={lang} />
            </Field>
            <Field label={t("field.snOpt", lang)} width="200px">
              <SerialCombobox value={sn} onChange={setSn} itemId={selectedItemId || undefined} lang={lang} />
            </Field>
            <Field label={t("field.copies", lang)} width="100px">
              <TextInput type="number" value={copies} onChange={(e) => setCopies(e.target.value)} />
            </Field>
            <Field label=" " width="100px">
              <Button type="button" onClick={addRow}>{t("btn.addShortPlus", lang)}</Button>
            </Field>
          </Row>
        </div>

        <table className="mt-4 w-full text-[12px]">
          <thead><tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"><th className="py-2 text-left">{t("th.itemCodeTh", lang)}</th><th className="py-2 text-left">{t("th.itemNameTh", lang)}</th><th className="py-2 text-left">{t("th.snTh", lang)}</th><th className="py-2 text-right">{t("th.copies", lang)}</th><th className="py-2 text-right">{t("th.delete", lang)}</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[color:var(--tts-border)]/50">
                <td className="py-2 font-mono">{r.itemCode || "-"}</td>
                <td className="py-2">{r.itemName || "-"}</td>
                <td className="py-2 font-mono">{r.serialNumber || "-"}</td>
                <td className="py-2 text-right font-mono">{r.copies}</td>
                <td className="py-2 text-right"><button onClick={() => removeRow(i)} className="text-[color:var(--tts-danger)] hover:underline">{t("action.delete", lang)}</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => window.print()}>{t("btn.print", lang)}</Button>
          <div className="text-[11px] text-[color:var(--tts-muted)]">{t("label.totalSheetsPages", lang).replace("{count}", String(allLabels.length)).replace("{pages}", String(Math.ceil(allLabels.length / (spec.perRow * spec.perCol))))}</div>
        </div>
      </div>

      {/* 인쇄용 라벨 시트 */}
      <div className="print:block hidden" id="print-area">
        <style>{`
          @media print {
            @page { size: A4; margin: 8mm; }
            html, body { background: white !important; color: #000 !important; }
            #print-area { display: block !important; }
            .print\\:hidden { display: none !important; }
            .label-sheet { page-break-after: always; }
            .label-sheet:last-child { page-break-after: auto; }
            .print-header { margin-bottom: 4mm; }
          }
        `}</style>

        {/* 인쇄 헤더 — 매입처/매입일자/출력일자/매입번호 */}
        <div className="print-header" style={{ fontFamily: "system-ui, sans-serif", color: "#000", borderBottom: "1.5pt solid #000", paddingBottom: "3mm", marginBottom: "4mm" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2mm" }}>
            <div style={{ fontSize: "14pt", fontWeight: 800, letterSpacing: "0.05em" }}>TELLUSTECH VINA</div>
            <div style={{ fontSize: "9pt" }}>QR 자산 라벨 시트</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", gap: "1mm 4mm", fontSize: "9pt" }}>
            <div style={{ fontWeight: 700 }}>매입처</div>
            <div>{printHeader?.supplierName ?? "-"}</div>
            <div style={{ fontWeight: 700 }}>매입번호</div>
            <div style={{ fontFamily: "monospace" }}>{printHeader?.purchaseNumber ?? "-"}</div>
            <div style={{ fontWeight: 700 }}>매입일자</div>
            <div>{printHeader?.purchaseDate ?? "-"}</div>
            <div style={{ fontWeight: 700 }}>출력일자</div>
            <div>{new Date().toISOString().slice(0, 10)}</div>
            <div style={{ fontWeight: 700 }}>총 라벨</div>
            <div>{allLabels.length} 매</div>
            <div style={{ fontWeight: 700 }}>라벨 사이즈</div>
            <div>{spec.label}</div>
          </div>
        </div>

        {Array.from({ length: Math.ceil(allLabels.length / (spec.perRow * spec.perCol)) }, (_, pIdx) => {
          const pageItems = allLabels.slice(pIdx * spec.perRow * spec.perCol, (pIdx + 1) * spec.perRow * spec.perCol);
          return (
            <div key={pIdx} className="label-sheet" style={{ display: "grid", gridTemplateColumns: `repeat(${spec.perRow}, ${spec.widthMm}mm)`, gap: 0 }}>
              {pageItems.map((l, i) => (
                <div key={i} style={{
                  width: `${spec.widthMm}mm`,
                  height: `${spec.heightMm}mm`,
                  border: "1px dashed #ccc",
                  padding: "1mm",
                  display: "flex",
                  gap: "1mm",
                  fontSize: `${spec.fontSize}pt`,
                  fontFamily: "monospace",
                  color: "#000",
                  background: "#fff",
                  overflow: "hidden",
                }}>
                  {l.qrUrl && <img src={l.qrUrl} alt="QR" style={{ width: `${spec.qrMm}mm`, height: `${spec.qrMm}mm` }} />}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    {size !== "SMALL" && <div style={{ fontWeight: 700 }}>{l.itemName}</div>}
                    {l.serialNumber && size !== "SMALL" && <div>SN: {l.serialNumber}</div>}
                    <div style={{ fontWeight: size === "SMALL" ? 700 : 400 }}>{l.itemCode}</div>
                    {size === "LARGE" && <div style={{ fontSize: `${spec.fontSize - 1}pt`, color: "#666" }}>TELLUSTECH VINA</div>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
