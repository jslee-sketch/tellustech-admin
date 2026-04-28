import QRCode from "qrcode";

// QR 라벨 시스템 — 핸드폰 카메라 인식률 개선 버전.
//
// 개선 사항 (2026-04 핸드폰 인식 안 되던 이슈):
//   ① QR 최소 30mm × 30mm 보장 (대형 라벨은 그대로, 중·소형은 QR 본체만 30mm 유지하고 라벨 자체 크기 키움)
//   ② QR 주변 흰색 quiet zone 4셀 (margin: 4)
//   ③ QR 데이터 최소화 — S/N (또는 itemCode) 만, JSON·URL 제거 → 더 큰 dot, 카메라 픽셀 밀도 ↑
//   ④ 흰 배경 + 검정 QR 강제 (다크모드 영향 차단)
//   ⑤ errorCorrectionLevel: "H" (30% 손상 복원, 흐릿한 카메라 환경에서 유리)
//
// A4 배치는 신규 라벨 크기에 맞춰 재산정.

export type LabelSize = "LARGE" | "MEDIUM" | "SMALL";

export type QrPayload = {
  itemCode: string;
  serialNumber?: string;
  itemName?: string;
  contractNumber?: string;
};

// 신규 라벨 스펙: QR 본체는 모두 ≥ 30mm.
//   대형: 60×40mm (장비) — 4열 × 6행 = 24장
//   중형: 50×35mm (소모품) — 4열 × 7행 = 28장
//   소형: 40×30mm (부품)   — 5열 × 9행 = 45장
//   QR 본체는 모두 30mm 이상 (S/N 만 인코딩하므로 dot 크기 충분)
export const LABEL_SPECS: Record<LabelSize, {
  widthMm: number;
  heightMm: number;
  qrMm: number;
  perRow: number;
  perCol: number;
  fontSize: number;
  label: string;
}> = {
  LARGE:  { widthMm: 60, heightMm: 40, qrMm: 32, perRow: 3, perCol: 6, fontSize: 8, label: "대형 (60×40mm · 장비용)" },
  MEDIUM: { widthMm: 50, heightMm: 35, qrMm: 30, perRow: 4, perCol: 7, fontSize: 7, label: "중형 (50×35mm · 소모품용)" },
  SMALL:  { widthMm: 40, heightMm: 30, qrMm: 30, perRow: 5, perCol: 9, fontSize: 6, label: "소형 (40×30mm · 부품용)" },
};

// QR 인코딩 — 데이터 최소화: serialNumber 우선, 없으면 itemCode.
// 핸드폰 카메라가 가장 안정적으로 읽는 short ASCII 만 사용.
export async function encodeQr(payload: QrPayload): Promise<string> {
  // S/N 우선, 없으면 itemCode. JSON·URL 사용 금지 (dot 크기↑, 인식률↑).
  const data = (payload.serialNumber ?? payload.itemCode).trim();
  return await QRCode.toDataURL(data, {
    errorCorrectionLevel: "H",   // 30% 손상 복원 — 흐릿한 카메라 / 인쇄 번짐 대응
    margin: 4,                    // quiet zone 4셀 (표준 권장 = 4)
    width: 512,                   // 출력 해상도 ↑ (인쇄 시 dot 선명)
    color: {
      dark: "#000000",            // 검정 QR (다크모드 무관)
      light: "#FFFFFF",           // 흰 배경 강제
    },
  });
}

export async function encodeQrBatch(payloads: QrPayload[]): Promise<string[]> {
  return await Promise.all(payloads.map(encodeQr));
}
