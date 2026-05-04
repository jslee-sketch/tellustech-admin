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
    if (!sn || !sn.trim()) {
      alert(t("label.snRequired", lang));
      return;
    }
    // 마스터 검증 — InventoryItem 에 등록된 S/N 만 라벨 생성 허용
    let masterItem: { itemCode: string; itemName: string; ownerType?: "COMPANY" | "EXTERNAL_CLIENT"; ownerLabel?: string | null; warehouseCode?: string | null; warehouseName?: string | null; colorChannel?: ColorChannel | null } | null = null;
    try {
      const r = await fetch(`/api/inventory/sn/${encodeURIComponent(sn.trim())}/state`).then((x) => x.json());
      const m = r?.master ?? r?.data?.master;
      if (m) {
        masterItem = {
          itemCode: m.itemCode ?? "",
          itemName: m.itemName ?? "",
          ownerType: m.ownerType,
          ownerLabel: m.ownerClientLabel ?? null,
          warehouseCode: m.warehouseCode ?? null,
          warehouseName: m.warehouseName ?? null,
          colorChannel: m.colorChannel ?? null,
        };
      }
    } catch {
      // 네트워크 실패 — 차단
    }
    if (!masterItem) {
      alert(t("label.snNotInMaster", lang));
      return;
    }
    // 선택한 품목과 마스터 품목 일치 확인 (잘못된 매핑 방지)
    const selectedItem = items.find((i) => i.value === selectedItemId);
    if (selectedItem && selectedItem.itemCode !== masterItem.itemCode) {
      alert(t("label.snItemMismatch", lang) + `\n선택: ${selectedItem.itemCode} / 마스터: ${masterItem.itemCode}`);
      return;
    }
    setRows((r) => [...r, {
      itemCode: masterItem!.itemCode,
      itemName: masterItem!.itemName,
      serialNumber: sn.trim(),
      copies: Math.max(1, Number(copies) || 1),
      ownerType: masterItem!.ownerType,
      ownerLabel: masterItem!.ownerLabel,
      warehouseCode: masterItem!.warehouseCode,
      warehouseName: masterItem!.warehouseName,
      colorChannel: masterItem!.colorChannel,
    }]);
    setSelectedItemId("");
    setSn("");
    setCopies("1");
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }

  // 모바일 대응: 라벨을 캔버스로 그려 PNG 다운로드.
  // PC는 window.print() 직접 인쇄, 모바일은 PNG 저장 후 갤러리에서 인쇄/공유.
  // 200dpi 가정 (NIIMBOT B21 = 203dpi · 8dot/mm 근사).
  async function downloadPng(row: LabelRow) {
    const dpm = 8; // dots per mm (≈200dpi)
    const W = LABEL_SPEC.widthMm * dpm;
    const H = LABEL_SPEC.heightMm * dpm;
    const pad = LABEL_SPEC.paddingMm * dpm;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);

    // QR — 상단 정사각 (44mm). 보간 금지(pixelated) → dot 가장자리 보존.
    if (row.qrUrl) {
      const img = new Image();
      img.src = row.qrUrl;
      await new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); });
      const qrSize = LABEL_SPEC.qrMm * dpm;
      const qrX = (W - qrSize) / 2;
      const qrY = pad;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
    }

    // 정보 영역 — 하단
    const infoTop = pad + LABEL_SPEC.qrMm * dpm + 1 * dpm;
    let y = infoTop;
    ctx.fillStyle = "#000";
    ctx.textBaseline = "top";

    // 라인 1: itemCode + 컬러배지 + 소유배지 (오른쪽 정렬)
    ctx.font = `700 ${LABEL_SPEC.itemCodeFontPt * 1.6}px monospace`;
    ctx.fillText(row.itemCode || "", pad, y);

    // 우측 배지 (오른쪽 → 왼쪽 그리기)
    let badgeX = W - pad;
    const badgeH = 5 * dpm;
    const drawBadge = (text: string, fill: string, fg: string, bordered: boolean) => {
      ctx.font = `800 ${7 * 1.6}px system-ui, sans-serif`;
      const padX = 1.5 * dpm;
      const w = ctx.measureText(text).width + padX * 2;
      const x = badgeX - w;
      if (fill !== "transparent") {
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, w, badgeH);
      }
      if (bordered) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 0.4 * dpm;
        ctx.strokeRect(x + 0.2 * dpm, y + 0.2 * dpm, w - 0.4 * dpm, badgeH - 0.4 * dpm);
      }
      ctx.fillStyle = fg;
      ctx.font = `800 ${7 * 1.6}px system-ui, sans-serif`;
      ctx.fillText(text, x + padX, y + badgeH / 2 - 4.5 * 1.6);
      badgeX = x - 1 * dpm;
    };
    if (row.ownerType === "EXTERNAL_CLIENT") drawBadge("EX", "#000", "#fff", false);
    else drawBadge("TLS", "#fff", "#000", true);
    const ch = row.colorChannel && row.colorChannel !== "NONE" ? CHANNEL_META[row.colorChannel] : null;
    if (ch) drawBadge(ch.code, ch.fill, ch.text, true);

    y += badgeH + 1 * dpm;

    // 라인 2: itemName (bold)
    ctx.fillStyle = "#000";
    ctx.font = `700 ${LABEL_SPEC.itemNameFontPt * 1.6}px system-ui, sans-serif`;
    const nameMax = W - pad * 2;
    let name = row.itemName || "";
    while (ctx.measureText(name).width > nameMax && name.length > 0) name = name.slice(0, -1);
    if (name !== row.itemName && name.length > 1) name = name.slice(0, -1) + "…";
    ctx.fillText(name, pad, y);
    y += LABEL_SPEC.itemNameFontPt * 2 + 1 * dpm;

    // 라인 3: S/N
    if (row.serialNumber) {
      ctx.font = `600 ${LABEL_SPEC.snFontPt * 1.6}px monospace`;
      ctx.fillText(`S/N: ${row.serialNumber}`, pad, y);
      y += LABEL_SPEC.snFontPt * 2 + 0.5 * dpm;
    }

    // 라인 4: 위치/소유주/매입처
    const meta =
      row.ownerType === "EXTERNAL_CLIENT" && row.ownerLabel
        ? row.ownerLabel
        : row.warehouseCode
          ? `${row.warehouseCode}${row.warehouseName ? " · " + row.warehouseName : ""}`
          : row.source || "";
    if (meta) {
      ctx.font = `400 ${LABEL_SPEC.metaFontPt * 1.6}px system-ui, sans-serif`;
      let m = meta;
      while (ctx.measureText(m).width > nameMax && m.length > 0) m = m.slice(0, -1);
      if (m !== meta && m.length > 1) m = m.slice(0, -1) + "…";
      ctx.fillText(m, pad, y);
    }

    const link = document.createElement("a");
    link.download = `label-${row.serialNumber || row.itemCode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function downloadAllPng() {
    for (const row of allLabels) {
      await downloadPng(row);
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  useEffect(() => {
    (async () => {
      const updated = await Promise.all(
        rows.map(async (r) => {
          if (r.qrUrl || !r.itemCode) return r;
          // QR은 마스터 등록된 S/N 만 생성 — S/N 없는 품목 행은 QR 미생성 (라벨에 코드/이름만 표시).
          if (!r.serialNumber || !r.serialNumber.trim()) return r;
          const data = r.serialNumber.trim();
          const qrUrl = await QRCode.toDataURL(data, {
            errorCorrectionLevel: "M",
            margin: 4,
            width: 1024,
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
          <div className="mt-2 rounded border border-[color:var(--tts-warn)]/40 bg-[color:var(--tts-warn)]/10 px-2 py-1.5 text-[11px] text-[color:var(--tts-text)]">
            <span className="font-bold">⚠ {t("label.printSetupTitle", lang)}</span> {t("label.printSetupHint", lang)}
          </div>
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
                  <td className="py-2 text-right">
                    <button onClick={() => downloadPng(r)} title={t("label.savePng", lang)} className="mr-2 text-[color:var(--tts-primary)] hover:underline">📸</button>
                    <button onClick={() => removeRow(i)} className="text-[color:var(--tts-danger)] hover:underline">{t("action.delete", lang)}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <Button onClick={() => window.print()}>{t("btn.print", lang)}</Button>
          <Button type="button" variant="ghost" onClick={downloadAllPng}>📸 {t("label.savePngAll", lang)}</Button>
          <div className="text-[11px] text-[color:var(--tts-muted)]">
            {t("label.totalLabels50x70", lang).replace("{count}", String(allLabels.length))}
          </div>
        </div>

        {/* 화면 미리보기 — 실제 인쇄와 별개로 카메라 스캔 테스트용. 1.5배 확대. */}
        {allLabels.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[12px] font-bold text-[color:var(--tts-text)]">{t("label.screenPreviewTitle", lang)}</div>
              <div className="text-[11px] text-[color:var(--tts-muted)]">{t("label.screenPreviewHint", lang).replace("{n}", String(allLabels.length))}</div>
            </div>
            <div className="flex flex-wrap gap-3">
              {allLabels.map((l, i) => {
                const ch = l.colorChannel && l.colorChannel !== "NONE" ? CHANNEL_META[l.colorChannel] : null;
                const scale = 1.0;
                return (
                  <div key={i} style={{
                    width: `${LABEL_SPEC.widthMm * scale}mm`,
                    height: `${LABEL_SPEC.heightMm * scale}mm`,
                    padding: `${LABEL_SPEC.paddingMm * scale}mm`,
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    background: "#fff",
                    color: "#000",
                    border: "1px solid #999",
                    fontFamily: "system-ui, sans-serif",
                  }}>
                    <div style={{ width: `${LABEL_SPEC.qrMm * scale}mm`, height: `${LABEL_SPEC.qrMm * scale}mm`, flex: "0 0 auto" }}>
                      {l.qrUrl && <img src={l.qrUrl} alt="QR" style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }} />}
                    </div>
                    <div style={{ flex: 1, width: "100%", marginTop: `${1 * scale}mm`, display: "flex", flexDirection: "column", gap: `${0.4 * scale}mm`, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: `${1.2 * scale}mm`, fontSize: `${LABEL_SPEC.itemCodeFontPt * scale}pt`, fontFamily: "monospace", fontWeight: 700 }}>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.itemCode}</span>
                        {ch && (
                          <span style={{ padding: `${0.4 * scale}mm ${1.5 * scale}mm`, fontSize: `${7.5 * scale}pt`, fontWeight: 800, background: ch.fill, color: ch.text, border: `${0.3 * scale}mm solid #000`, borderRadius: `${0.5 * scale}mm` }}>{ch.code}</span>
                        )}
                        {l.ownerType === "EXTERNAL_CLIENT" ? (
                          <span style={{ padding: `${0.4 * scale}mm ${1.2 * scale}mm`, fontSize: `${7 * scale}pt`, fontWeight: 800, background: "#000", color: "#fff", border: `${0.3 * scale}mm solid #000`, borderRadius: `${0.5 * scale}mm` }}>EX</span>
                        ) : (
                          <span style={{ padding: `${0.4 * scale}mm ${1.2 * scale}mm`, fontSize: `${7 * scale}pt`, fontWeight: 700, border: `${0.3 * scale}mm solid #000`, borderRadius: `${0.5 * scale}mm` }}>TLS</span>
                        )}
                      </div>
                      <div style={{ fontSize: `${LABEL_SPEC.itemNameFontPt * scale}pt`, fontWeight: 700, lineHeight: 1.15, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>{l.itemName}</div>
                      {l.serialNumber && (
                        <div style={{ fontSize: `${LABEL_SPEC.snFontPt * scale}pt`, fontFamily: "monospace", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>S/N: {l.serialNumber}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
            html, body {
              background: #fff !important;
              color: #000 !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* 다크모드 토큰만 무력화 — 명시적으로 색칠한 배지(.ex-badge / .ch-badge)는 보존 */
            #print-area, #print-area > div, #print-area .label-box {
              color: #000 !important;
              background: #fff !important;
              border-color: #000 !important;
              box-shadow: none !important;
              text-shadow: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* EX/TLS/컬러채널 배지: 자체 inline style 의 색상 그대로 사용. 모든 print 드라이버에서 색상 강제 출력 */
            #print-area .ex-badge,
            #print-area .ch-badge,
            #print-area span[style*="background"] {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            /* 라벨 사이에만 페이지 분할 — 첫 라벨 앞이나 마지막 라벨 뒤에는 분할 없음.
               (page-break-after: always + :last-child auto 조합은 일부 PDF 드라이버에서
               빈 페이지를 남기므로 page-break-before + :not(:first-child) 사용) */
            #print-area .label-box + .label-box {
              page-break-before: always;
              break-before: page;
            }
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
                  style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }}
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
                      border: "0.3mm solid #000",
                      borderRadius: "0.5mm",
                      letterSpacing: "0.05em",
                    }}
                    title={l.colorChannel ?? ""}
                  >
                    {ch.code}
                  </span>
                )}
                {l.ownerType === "EXTERNAL_CLIENT" ? (
                  <span className="ex-badge" style={{ padding: "0.4mm 1.2mm", fontSize: "7pt", fontWeight: 800, background: "#000", color: "#fff", border: "0.3mm solid #000", borderRadius: "0.5mm" }}>EX</span>
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
