import "server-only";
import { PDFDocument, rgb } from "pdf-lib";
import { embedCjkFont } from "@/lib/pdf-fonts";

// 사용량 확인서 PDF 생성기
// 1페이지: 헤더 + 합계 + 서명. 추가 페이지: 장비별 상세 표.
// 폰트: Noto Sans CJK (한/베/영 모두 커버)

type EquipmentRow = {
  serialNumber: string;
  brand: string;
  itemName: string;
  prevBw: number;
  prevColor: number;
  currBw: number;
  currColor: number;
  usageBw: number;
  usageColor: number;
  baseFee: number;
  baseIncludedBw: number;
  baseIncludedColor: number;
  extraBw: number;
  extraColor: number;
  extraChargeBw: number;
  extraChargeColor: number;
  subtotal: number;
};

export async function generateUsageConfirmationPdf(args: {
  confirmCode: string;
  contractNumber: string;
  clientCode: string;
  clientName: string;
  billingMonth: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  equipmentUsage: EquipmentRow[];
  customerConfirmedAt: Date | null;
  customerSignature: string | null; // base64 PNG data URL
  customerNote: string | null;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await embedCjkFont(doc);
  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "₫";
  const fmtN = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

  // === 페이지 1: 헤더 + 합계 + 서명 ===
  let page = doc.addPage([595, 842]); // A4
  let { width, height } = page.getSize();
  let y = height - 60;

  function drawText(s: string, x: number, yPos: number, size = 10, bold = false) {
    page.drawText(s, { x, y: yPos, size, font, color: rgb(0, 0, 0) });
  }
  function hr(yPos: number, color = rgb(0.7, 0.7, 0.7)) {
    page.drawLine({ start: { x: 40, y: yPos }, end: { x: width - 40, y: yPos }, thickness: 0.5, color });
  }

  drawText("사 용 량  확 인 서", 200, y, 18); y -= 22;
  drawText("Xác nhận sản lượng sử dụng / Usage Confirmation", 170, y, 10); y -= 30;

  drawText(`발행일: ${new Date().toISOString().slice(0, 10)}`, 40, y, 10);
  drawText(`확인코드: ${args.confirmCode}`, 320, y, 10); y -= 16;
  drawText(`계약번호: ${args.contractNumber}`, 40, y, 10); y -= 16;
  drawText(`고객: ${args.clientName} (${args.clientCode})`, 40, y, 10); y -= 16;
  drawText(`사용기간: ${args.periodStart.toISOString().slice(0, 10)} ~ ${args.periodEnd.toISOString().slice(0, 10)}`, 40, y, 10); y -= 24;

  hr(y); y -= 24;
  drawText("■ 장비별 사용현황", 40, y, 12); y -= 18;
  drawText(`총 ${args.equipmentUsage.length}대 — 상세는 다음 페이지 참조`, 40, y, 9); y -= 30;

  hr(y); y -= 28;
  drawText(`합계 / Tổng / Total: ${fmt(args.totalAmount)}`, 40, y, 14); y -= 30;

  hr(y); y -= 30;
  drawText("상기 사용량을 확인합니다.", 40, y, 10); y -= 14;
  drawText("Tôi xác nhận sản lượng sử dụng trên là chính xác.", 40, y, 10); y -= 14;
  drawText("I confirm the above usage is correct.", 40, y, 10); y -= 24;

  if (args.customerConfirmedAt) {
    drawText(`확인일: ${args.customerConfirmedAt.toISOString().slice(0, 10)}`, 40, y, 10); y -= 18;
  }

  // 서명 이미지 임베드
  if (args.customerSignature) {
    try {
      const m = args.customerSignature.match(/^data:image\/(png|jpeg);base64,(.+)$/);
      if (m) {
        const isPng = m[1] === "png";
        const bytes = Buffer.from(m[2], "base64");
        const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const imgDims = img.scale(0.5);
        page.drawImage(img, { x: 100, y: y - imgDims.height, width: imgDims.width, height: imgDims.height });
        y -= imgDims.height + 4;
      }
    } catch { /* skip signature on error */ }
  }
  if (args.customerNote) {
    drawText(`수동 확인 메모: ${args.customerNote}`, 40, y, 9); y -= 16;
  }

  // === 다음 페이지: 장비별 상세 ===
  for (const e of args.equipmentUsage) {
    page = doc.addPage([595, 842]);
    ({ width, height } = page.getSize());
    y = height - 60;
    drawText(`■ ${e.brand} ${e.itemName} (${e.serialNumber})`, 40, y, 12); y -= 24;

    drawText("구분", 40, y, 10); drawText("흑백", 220, y, 10); drawText("컬러", 360, y, 10); y -= 14;
    hr(y); y -= 14;
    drawText("전월 카운터", 40, y, 10); drawText(fmtN(e.prevBw), 220, y, 10); drawText(fmtN(e.prevColor), 360, y, 10); y -= 14;
    drawText("금월 카운터", 40, y, 10); drawText(fmtN(e.currBw), 220, y, 10); drawText(fmtN(e.currColor), 360, y, 10); y -= 14;
    drawText("사용량",     40, y, 10); drawText(fmtN(e.usageBw), 220, y, 10); drawText(fmtN(e.usageColor), 360, y, 10); y -= 18;
    hr(y); y -= 14;
    drawText(`기본료: ${fmt(e.baseFee)}`, 40, y, 10); y -= 14;
    drawText(`기본 포함: 흑백 ${fmtN(e.baseIncludedBw)}매 / 컬러 ${fmtN(e.baseIncludedColor)}매`, 40, y, 9); y -= 14;
    drawText(`추가 사용: 흑백 ${fmtN(e.extraBw)}매 / 컬러 ${fmtN(e.extraColor)}매`, 40, y, 9); y -= 14;
    drawText(`추가 과금: ${fmt(e.extraChargeBw + e.extraChargeColor)}`, 40, y, 10); y -= 18;
    hr(y); y -= 16;
    drawText(`소계: ${fmt(e.subtotal)}`, 40, y, 12);
  }

  return await doc.save();
}
