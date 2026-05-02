import QRCode from "qrcode";

// QR 라벨 — NIIMBOT B21 (50mm 폭 감열 라벨) 전용 단일 규격.
//
// 결정된 단일 규격 (2026-05):
//   라벨   : 70mm × 50mm  (장비/소모품/부품 전부 동일)
//   QR     : 38mm × 38mm  (상단 중앙, 5mm 패딩)
//   정보   : 하단 영역 (itemCode·소유배지 / itemName / S/N / 위치·출처)
//   배경   : 흰색 강제, 잉크 검정 강제 (다크모드 영향 차단)
//   QR 데이터 : JSON 유지 — { itemCode, serialNumber, contractNumber }
//   여백   : @page margin 0 — 감열 프린터는 라벨 단위 절단이라 시트 여백 불필요
//   페이지 분할 : page-break-after: always 라벨마다
//
// QR 인식률 (핸드폰 카메라 / 흐릿한 인쇄 환경):
//   errorCorrectionLevel: "M" (JSON 페이로드는 dot 수가 늘어 H 면 너무 dense)
//   margin: 4 quiet zone 표준 권장
//   width: 512 출력 해상도

export type QrPayload = {
  itemCode: string;
  serialNumber?: string;
  contractNumber?: string;
};

// 단일 규격 — 라벨 크기/QR 크기/폰트 모두 고정.
// 세로형 50mm(가로) × 70mm(세로). 상단 정사각 QR + 하단 설명.
export const LABEL_SPEC = {
  widthMm: 50,
  heightMm: 70,
  qrMm: 44,
  paddingMm: 3,
  // 정보 영역 폰트
  itemCodeFontPt: 9,
  itemNameFontPt: 10,
  snFontPt: 8,
  metaFontPt: 7,
  label: "50×70mm (세로형)",
} as const;

// QR 인코딩 — 핸드폰 카메라 인식률 우선.
// S/N 우선, 없으면 itemCode 만 인코딩 (짧을수록 dot 큼 → 인식 ↑).
// ECC M = grid 작게 (셀 큼) / margin 4 표준 quiet zone / width 1024 화면·인쇄 모두 선명.
export async function encodeQr(payload: QrPayload): Promise<string> {
  const data = (payload.serialNumber || payload.itemCode).trim();
  return await QRCode.toDataURL(data, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 1024,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

export async function encodeQrBatch(payloads: QrPayload[]): Promise<string[]> {
  return await Promise.all(payloads.map(encodeQr));
}
