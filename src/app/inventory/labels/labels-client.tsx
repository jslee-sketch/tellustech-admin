"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button, Field, ItemCombobox, Row, SerialCombobox, TextInput } from "@/components/ui";
import { LABEL_SPEC } from "@/lib/qr-label";
import { t, type Lang } from "@/lib/i18n";
import type { LabelPrefill } from "./page";

type ItemOpt = { value: string; label: string; itemCode: string; itemName: string };
type ColorChannel = "BLACK" | "CYAN" | "MAGENTA" | "YELLOW" | "DRUM" | "FUSER" | "NONE";
type LabelRow = {
  itemCode: string;
  itemName: string;
  serialNumber: string;
  copies: number;
  ownerType?: "COMPANY" | "EXTERNAL_CLIENT";
  ownerLabel?: string | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  source?: string | null;
  colorChannel?: ColorChannel | null;
  qrUrl?: string;
};

// 토너/소모품 채널별 시각 표현. 컬러 전사지 사용 시 그대로 인쇄됨.
// 흑백 전사지 사용 시 OS 인쇄 다이얼로그가 grayscale 로 자동 변환 → 채널 코드(C/M/Y/K)는 글자로도 명시.
const CHANNEL_META: Record<ColorChannel, { fill: string; text: string; code: string; emoji: string; }> = {
  BLACK:   { fill: "#000000", text: "#ffffff", code: "K", emoji: "⬛" },
  CYAN:    { fill: "#00B7E2", text: "#000000", code: "C", emoji: "🟦" },
  MAGENTA: { fill: "#E5007E", text: "#ffffff", code: "M", emoji: "🟪" },
  YELLOW:  { fill: "#FFCC00", text: "#000000", code: "Y", emoji: "🟨" },
  DRUM:    { fill: "#6B7280", text: "#ffffff", code: "D", emoji: "🥁" },
  FUSER:   { fill: "#DC2626", text: "#ffffff", code: "F", emoji: "🔥" },
  NONE:    { fill: "transparent", text: "transparent", code: "", emoji: "" },
};
type PrintHeader = { supplierName: string; purchaseDate: string; purchaseNumber: string };
type Props = {
  items: ItemOpt[];
  prefill: LabelPrefill[];
  printHeader?: PrintHeader | null;
  lang: Lang;
};

export function LabelsClient({ items, prefill, printHeader, lang }: Props) {
  const [rows, setRows] = useState<LabelRow[]>(
    prefill.length > 0
      ? prefill.map((p) => ({
          itemCode: p.itemCode,
          itemName: p.itemName,
          serialNumber: p.serialNumber ?? "",
          copies: 1,
          ownerType: p.ownerType,
          ownerLabel: p.ownerLabel ?? null,
          warehouseCode: p.warehouseCode ?? null,
          warehouseName: p.warehouseName ?? null,
          source: p.source ?? null,
          colorChannel: p.colorChannel ?? null,
        }))
      : [{ itemCode: "", itemName: "", serialNumber: "", copies: 1 }],
  );
  const [selectedItemId, setSelectedItemId] = useState("");
  const [sn, setSn] = useState("");
  const [copies, setCopies] = useState("1");

  async function addRow() {
    if (!selectedItemId) return;
    let item = items.find((i) => i.value === selectedItemId);
    let colorChannel: ColorChannel | null = null;
    try {
      const res = await fetch(`/api/master/items?q=${encodeURIComponent(selectedItemId)}`).then((r) => r.json());
      const found = (res.items ?? []).find((x: { id: string; itemCode: string; name: string; colorChannel?: ColorChannel | null }) => x.id === selectedItemId);
      if (found) {
        if (!item) item = { value: found.id, label: `${found.itemCode} · ${found.name}`, itemCode: found.itemCode, itemName: found.name };
        colorChannel = found.colorChannel ?? null;
      }
    } catch {
      if (!item) return;
    }
    if (!item) return;
    setRows((r) => [...r, { itemCode: item!.itemCode, itemName: item!.itemName, serialNumber: sn, copies: Math.max(1, Number(copies) || 1), colorChannel }]);
    setSelectedItemId("");
    setSn("");
    setCopies("1");
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }

  useEffect(() => {
    (async () => {
      const updated = await Promise.all(
        rows.map(async (r) => {
          if (r.qrUrl || !r.itemCode) return r;
          // JSON 페이로드 — 요구사항대로 유지.
          const payload = JSON.stringify({
            itemCode: r.itemCode,
            serialNumber: r.serialNumber || undefined,
          });
          const qrUrl = await QRCode.toDataURL(payload, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 256,
            color: { dark: "#000000", light: "#FFFFFF" },
          });
          return { ...r, qrUrl };
        }),
      );
      if (updated.some((r, i) => r.qrUrl !== rows[i]?.qrUrl)) setRows(updated);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  const allLabels = useMemo(() => rows.flatMap((r) => Array.from({ length: r.copies }, () => r)), [rows]);

  const printDate = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="print:hidden">
        <div className="mb-3 rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-3 text-[12px] text-[color:var(--tts-sub)]">
          <div className="font-bold text-[color:var(--tts-text)]">{t("label.unifiedSpecTitle", lang)}</div>
          <div className="mt-1">{t("label.unifiedSpecDesc", lang)}</div>
        </div>

        <div className="rounded-md border border-[color:var(--tts-border)] bg-[color:var(--tts-card)] p-3">
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
          <thead><tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"><th className="py-2 text-left">{t("th.itemCodeTh", lang)}</th><th className="py-2 text-left">{t("th.itemNameTh", lang)}</th><th className="py-2 text-left">{t("th.snTh", lang)}</th><th className="py-2 text-left">{t("item.colorChannel", lang)}</th><th className="py-2 text-left">{t("col.belongsTo", lang)}</th><th className="py-2 text-right">{t("th.copies", lang)}</th><th className="py-2 text-right">{t("th.delete", lang)}</th></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const ch = r.colorChannel && r.colorChannel !== "NONE" ? CHANNEL_META[r.colorChannel] : null;
              return (
                <tr key={i} className="border-b border-[color:var(--tts-border)]/50">
                  <td className="py-2 font-mono">{r.itemCode || "-"}</td>
                  <td className="py-2">{r.itemName || "-"}</td>
                  <td className="py-2 font-mono">{r.serialNumber || "-"}</td>
                  <td className="py-2 text-[11px]">
                    {ch ? (
                      <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold" style={{ background: ch.fill, color: ch.text }}>
                        <span>{ch.code}</span>
                        <span>·</span>
                        <span>{r.colorChannel}</span>
                      </span>
                    ) : (
                      <span className="text-[color:var(--tts-muted)]">—</span>
                    )}
                  </td>
                  <td className="py-2 text-[11px]">
                    {r.ownerType === "EXTERNAL_CLIENT" ? (
                      <span className="rounded bg-black px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">EX</span>
                    ) : (
                      <span className="rounded border border-[color:var(--tts-border)] px-1.5 py-0.5 font-mono text-[10px]">TLS</span>
                    )}
                    {r.ownerLabel && <span className="ml-1 text-[color:var(--tts-sub)]">{r.ownerLabel}</span>}
                  </td>
                  <td className="py-2 text-right font-mono">{r.copies}</td>
                  <td className="py-2 text-right"><button onClick={() => removeRow(i)} className="text-[color:var(--tts-danger)] hover:underline">{t("action.delete", lang)}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => window.print()}>{t("btn.print", lang)}</Button>
          <div className="text-[11px] text-[color:var(--tts-muted)]">
            {t("label.totalLabels50x70", lang).replace("{count}", String(allLabels.length))}
          </div>
        </div>
      </div>

      {/* ─── 인쇄 영역 ─────────────────────────────────────────────────
          NIIMBOT B21: 50mm 폭 감열 라벨. @page size = 50mm × 70mm.
          라벨 1장 = 1 페이지. page-break-after: always 로 분리.
          @media print 에서 다크모드 색상 전부 #000/#fff 강제.
      */}
      <div className="print:block hidden" id="print-area">
        <style>{`
          @media print {
            @page { size: ${LABEL_SPEC.widthMm}mm ${LABEL_SPEC.heightMm}mm; margin: 0; }
            html, body { background: #fff !important; color: #000 !important; margin: 0 !important; padding: 0 !important; }
            #print-area, #print-area * {
              color: #000 !important;
              background: transparent !important;
              border-color: #000 !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            #print-area .ex-badge {
              background: #000 !important;
              color: #fff !important;
            }
            /* 컬러 채널 배지 — 컬러 전사지에서는 그대로 인쇄, 흑백 전사지에서는 OS 가 자동 grayscale 변환 */
            #print-area .ch-badge {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #print-area .label-box {
              page-break-after: always;
              break-after: page;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #print-area .label-box:last-child { page-break-after: auto; break-after: auto; }
            .print\\:hidden { display: none !important; }
            #print-area { display: block !important; }
            /* 인쇄 헤더(시트형)는 NIIMBOT 라벨에서는 숨김 — 라벨 = 1 페이지 */
            #print-area .print-header { display: none !important; }
          }
          /* 화면에서는 인쇄 영역 숨김 (print:block 으로만 표시) */
        `}</style>

        {/* 시트형 인쇄 헤더 — 매입 ID 프리필 시에만 의미 있음, NIIMBOT 인쇄 시에는 CSS 로 숨김 */}
        {printHeader && (
          <div className="print-header" style={{ fontFamily: "system-ui, sans-serif", color: "#000", borderBottom: "1.5pt solid #000", paddingBottom: "3mm", marginBottom: "4mm" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2mm" }}>
              <div style={{ fontSize: "14pt", fontWeight: 800, letterSpacing: "0.05em" }}>TELLUSTECH VINA</div>
              <div style={{ fontSize: "9pt" }}>{t("labels.qrAssetSheet", lang)}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", gap: "1mm 4mm", fontSize: "9pt" }}>
              <div style={{ fontWeight: 700 }}>{t("labels.purchaseSource", lang)}</div>
              <div>{printHeader.supplierName}</div>
              <div style={{ fontWeight: 700 }}>{t("labels.purchaseNumber", lang)}</div>
              <div style={{ fontFamily: "monospace" }}>{printHeader.purchaseNumber}</div>
              <div style={{ fontWeight: 700 }}>{t("labels.purchaseDate", lang)}</div>
              <div>{printHeader.purchaseDate}</div>
              <div style={{ fontWeight: 700 }}>{t("labels.printDate", lang)}</div>
              <div>{printDate}</div>
              <div style={{ fontWeight: 700 }}>{t("labels.totalLabels", lang)}</div>
              <div>{allLabels.length} {t("labels.labelsUnit", lang)}</div>
              <div style={{ fontWeight: 700 }}>{t("labels.labelSize", lang)}</div>
              <div>{LABEL_SPEC.label}</div>
            </div>
          </div>
        )}

        {/* 라벨 — 1장 = 1 페이지 */}
        {allLabels.map((l, i) => {
          const ch = l.colorChannel && l.colorChannel !== "NONE" ? CHANNEL_META[l.colorChannel] : null;
          return (
          <div
            key={i}
            className="label-box"
            style={{
              width: `${LABEL_SPEC.widthMm}mm`,
              height: `${LABEL_SPEC.heightMm}mm`,
              padding: `${LABEL_SPEC.paddingMm}mm`,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              fontFamily: "system-ui, sans-serif",
              color: "#000",
              background: "#fff",
              overflow: "hidden",
            }}
          >
            {/* QR — 상단 중앙 */}
            <div style={{ width: `${LABEL_SPEC.qrMm}mm`, height: `${LABEL_SPEC.qrMm}mm`, flex: "0 0 auto" }}>
              {l.qrUrl && (
                <img
                  src={l.qrUrl}
                  alt="QR"
                  style={{ width: "100%", height: "100%", display: "block" }}
                />
              )}
            </div>

            {/* 정보 영역 — 하단 */}
            <div style={{
              flex: 1,
              width: "100%",
              marginTop: "1mm",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              gap: "0.4mm",
              minWidth: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1.2mm", fontSize: `${LABEL_SPEC.itemCodeFontPt}pt`, fontFamily: "monospace", fontWeight: 700, lineHeight: 1.1 }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.itemCode}</span>
                {ch && (
                  <span
                    className="ch-badge"
                    style={{
                      padding: "0.4mm 1.5mm",
                      fontSize: "7.5pt",
                      fontWeight: 800,
                      fontFamily: "system-ui, sans-serif",
                      background: ch.fill,
                      color: ch.text,
                      borderRadius: "0.5mm",
                      letterSpacing: "0.05em",
                    }}
                    title={l.colorChannel ?? ""}
                  >
                    {ch.code}
                  </span>
                )}
                {l.ownerType === "EXTERNAL_CLIENT" ? (
                  <span className="ex-badge" style={{ padding: "0.4mm 1.2mm", fontSize: "7pt", fontWeight: 800, background: "#000", color: "#fff", borderRadius: "0.5mm" }}>EX</span>
                ) : (
                  <span style={{ padding: "0.4mm 1.2mm", fontSize: "7pt", fontWeight: 700, border: "0.3mm solid #000", borderRadius: "0.5mm" }}>TLS</span>
                )}
              </div>
              <div style={{ fontSize: `${LABEL_SPEC.itemNameFontPt}pt`, fontWeight: 700, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>
                {l.itemName}
              </div>
              {l.serialNumber && (
                <div style={{ fontSize: `${LABEL_SPEC.snFontPt}pt`, fontFamily: "monospace", fontWeight: 600, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  S/N: {l.serialNumber}
                </div>
              )}
              {(l.warehouseCode || l.source || l.ownerLabel) && (
                <div style={{ fontSize: `${LABEL_SPEC.metaFontPt}pt`, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#000" }}>
                  {l.ownerType === "EXTERNAL_CLIENT" && l.ownerLabel
                    ? l.ownerLabel
                    : l.warehouseCode
                      ? `${l.warehouseCode}${l.warehouseName ? " · " + l.warehouseName : ""}`
                      : l.source || ""}
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
