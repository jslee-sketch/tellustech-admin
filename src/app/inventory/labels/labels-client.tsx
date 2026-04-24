"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button, Field, Row, Select, TextInput } from "@/components/ui";
import { LABEL_SPECS, type LabelSize } from "@/lib/qr-label";

type ItemOpt = { value: string; label: string; itemCode: string; itemName: string };
type LabelRow = { itemCode: string; itemName: string; serialNumber: string; copies: number; qrUrl?: string };
type Props = {
  items: ItemOpt[];
  prefill: { itemCode: string; itemName: string; serialNumber: string | null }[];
};

export function LabelsClient({ items, prefill }: Props) {
  const [rows, setRows] = useState<LabelRow[]>(
    prefill.length > 0
      ? prefill.map((p) => ({ itemCode: p.itemCode, itemName: p.itemName, serialNumber: p.serialNumber ?? "", copies: 1 }))
      : [{ itemCode: "", itemName: "", serialNumber: "", copies: 1 }],
  );
  const [size, setSize] = useState<LabelSize>("LARGE");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [sn, setSn] = useState("");
  const [copies, setCopies] = useState("1");

  function addRow() {
    const item = items.find((i) => i.value === selectedItemId);
    if (!item) return;
    setRows((r) => [...r, { itemCode: item.itemCode, itemName: item.itemName, serialNumber: sn, copies: Math.max(1, Number(copies) || 1) }]);
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
          <Field label="라벨 크기" required width="240px">
            <Select value={size} onChange={(e) => setSize(e.target.value as LabelSize)} options={[
              { value: "LARGE", label: LABEL_SPECS.LARGE.label },
              { value: "MEDIUM", label: LABEL_SPECS.MEDIUM.label },
              { value: "SMALL", label: LABEL_SPECS.SMALL.label },
            ]} />
          </Field>
          <Field label="페이지당" width="140px">
            <div className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-input)] px-3 py-2 text-[13px] text-[color:var(--tts-sub)]">
              {spec.perRow * spec.perCol}장
            </div>
          </Field>
        </Row>

        <div className="mt-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-3">
          <div className="mb-2 text-[12px] font-bold text-[color:var(--tts-sub)]">라벨 추가</div>
          <Row>
            <Field label="품목" required>
              <Select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} placeholder="선택" options={items.map((i) => ({ value: i.value, label: i.label }))} />
            </Field>
            <Field label="S/N" width="200px">
              <TextInput value={sn} onChange={(e) => setSn(e.target.value)} placeholder="SN-XXX (선택)" />
            </Field>
            <Field label="장수" width="100px">
              <TextInput type="number" value={copies} onChange={(e) => setCopies(e.target.value)} />
            </Field>
            <Field label=" " width="100px">
              <Button type="button" onClick={addRow}>+ 추가</Button>
            </Field>
          </Row>
        </div>

        <table className="mt-4 w-full text-[12px]">
          <thead><tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"><th className="py-2 text-left">품목코드</th><th className="py-2 text-left">품목명</th><th className="py-2 text-left">S/N</th><th className="py-2 text-right">장수</th><th className="py-2 text-right">삭제</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[color:var(--tts-border)]/50">
                <td className="py-2 font-mono">{r.itemCode || "-"}</td>
                <td className="py-2">{r.itemName || "-"}</td>
                <td className="py-2 font-mono">{r.serialNumber || "-"}</td>
                <td className="py-2 text-right font-mono">{r.copies}</td>
                <td className="py-2 text-right"><button onClick={() => removeRow(i)} className="text-[color:var(--tts-danger)] hover:underline">삭제</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => window.print()}>🖨️ 인쇄</Button>
          <div className="text-[11px] text-[color:var(--tts-muted)]">총 {allLabels.length}장 · {Math.ceil(allLabels.length / (spec.perRow * spec.perCol))}페이지</div>
        </div>
      </div>

      {/* 인쇄용 라벨 시트 */}
      <div className="print:block hidden" id="print-area">
        <style>{`
          @media print {
            @page { size: A4; margin: 5mm; }
            body { background: white !important; }
            #print-area { display: block !important; }
            .print\\:hidden { display: none !important; }
            .label-sheet { page-break-after: always; }
            .label-sheet:last-child { page-break-after: auto; }
          }
        `}</style>
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
