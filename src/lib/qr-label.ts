import QRCode from "qrcode";

// QR 라벨 시스템 — JSON payload 를 QR 로 인코딩.
// 크기 3종: 대(50x30mm, 장비) / 중(30x20mm, 소모품) / 소(20x12mm, 부품)
// A4 자동 배치:
//   대: 4열 × 7행 = 28장 (약 50.8×41mm 간격)
//   중: 6열 × 10행 = 60장 (약 33×27mm 간격)
//   소: 8열 × 14행 = 112장 (약 25×19mm 간격)

export type LabelSize = "LARGE" | "MEDIUM" | "SMALL";

export type QrPayload = {
  itemCode: string;
  serialNumber?: string;
  itemName?: string;
  contractNumber?: string;
};

export const LABEL_SPECS: Record<LabelSize, {
  widthMm: number;
  heightMm: number;
  qrMm: number;
  perRow: number;
  perCol: number;
  fontSize: number;
  label: string;
}> = {
  LARGE:  { widthMm: 50, heightMm: 30, qrMm: 26, perRow: 4, perCol: 7,  fontSize: 7, label: "대형 (50×30mm · 장비용)" },
  MEDIUM: { widthMm: 30, heightMm: 20, qrMm: 16, perRow: 6, perCol: 10, fontSize: 6, label: "중형 (30×20mm · 소모품용)" },
  SMALL:  { widthMm: 20, heightMm: 12, qrMm: 10, perRow: 8, perCol: 14, fontSize: 5, label: "소형 (20×12mm · 부품용)" },
};

// QR 코드를 data URL 로 생성 (PNG). 클라이언트/서버 양쪽 사용 가능.
export async function encodeQr(payload: QrPayload): Promise<string> {
  const json = JSON.stringify(payload);
  return await QRCode.toDataURL(json, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });
}

export async function encodeQrBatch(payloads: QrPayload[]): Promise<string[]> {
  return await Promise.all(payloads.map(encodeQr));
}
