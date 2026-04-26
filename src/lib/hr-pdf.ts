import "server-only";
import { PDFDocument, rgb } from "pdf-lib";
import { embedCjkFont } from "./pdf-fonts";

// HR 카드 PDF 자동생성 — 입사·퇴사 카드 두 종.
// 한글·베트남어 텍스트는 표준 폰트로는 한계가 있어 ASCII 라벨 + 데이터는 다른 줄에 영문 보강.
// 본격 한국어/베트남어 폰트 임베드는 fontkit 의존성 추가가 필요하므로 추후 단계.
// 현재는 인적정보 JSON 을 키-값 표 형식으로 출력 + 서명/사진은 metadata 텍스트로 표기.

const PAGE_W = 595; // A4 portrait
const PAGE_H = 842;
const MARGIN = 50;
const LINE_GAP = 16;

type Kv = [string, string];

function flattenKv(prefix: string, obj: unknown, out: Kv[]) {
  if (obj === null || obj === undefined) return;
  if (typeof obj !== "object") {
    out.push([prefix, String(obj)]);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flattenKv(`${prefix}[${i}]`, v, out));
    return;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${k}` : k;
    flattenKv(next, v, out);
  }
}

async function buildKvPdf(title: string, header: Kv[], sections: { title: string; items: Kv[] }[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await embedCjkFont(doc);
  const bold = font;
  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  function newPage() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }
  function ensure(h: number) {
    if (y - h < MARGIN) newPage();
  }
  function text(s: string, opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) {
    const f = opts.bold ? bold : font;
    const size = opts.size ?? 10;
    ensure(size + 4);
    const c = opts.color ?? [0, 0, 0];
    page.drawText(s.replace(/[^\x20-\x7E]/g, "?"), { x: MARGIN, y, size, font: f, color: rgb(c[0], c[1], c[2]) });
    y -= size + 4;
  }

  text(title, { bold: true, size: 18 });
  y -= 4;
  for (const [k, v] of header) {
    text(`${k}: ${v}`, { size: 11 });
  }
  y -= 8;

  for (const sec of sections) {
    ensure(LINE_GAP * 2);
    text(sec.title, { bold: true, size: 13, color: [0.1, 0.2, 0.5] });
    y -= 2;
    if (sec.items.length === 0) {
      text("(no data)", { size: 10, color: [0.5, 0.5, 0.5] });
    } else {
      for (const [k, v] of sec.items) {
        text(`  ${k}: ${v}`, { size: 9 });
      }
    }
    y -= 6;
  }

  return await doc.save();
}

// 입사카드 PDF
export async function generateOnboardingPdf(card: {
  onboardingCode: string;
  companyCode: "TV" | "VR";
  status: string;
  personalInfo: unknown;
  education: unknown;
  consentSignature: string | null;
  employee: { employeeCode: string; nameVi: string; nameEn: string | null; nameKo: string | null };
}): Promise<Uint8Array> {
  const personal: Kv[] = [];
  flattenKv("", card.personalInfo, personal);
  const edu: Kv[] = [];
  flattenKv("", card.education, edu);
  const signing: Kv[] = card.consentSignature
    ? [["consent_signature", `present (${card.consentSignature.slice(0, 20)}...)`]]
    : [["consent_signature", "missing"]];

  return buildKvPdf(
    "Onboarding Card / Phieu nhap su",
    [
      ["Code", card.onboardingCode],
      ["Company", card.companyCode],
      ["Status", card.status],
      ["Employee", `${card.employee.employeeCode} / ${card.employee.nameVi}`],
    ],
    [
      { title: "Personal Information", items: personal },
      { title: "Education", items: edu },
      { title: "Signatures", items: signing },
    ],
  );
}

// 퇴사카드 PDF
export async function generateOffboardingPdf(card: {
  offboardingCode: string;
  companyCode: "TV" | "VR";
  status: string;
  returnedItems: unknown;
  paidItems: unknown;
  stoppedItems: unknown;
  issuedItems: unknown;
  hrSignature: string | null;
  accountingSignature: string | null;
  employeeSignature: string | null;
  employee: { employeeCode: string; nameVi: string; nameEn: string | null; nameKo: string | null };
}): Promise<Uint8Array> {
  const ret: Kv[] = []; flattenKv("", card.returnedItems, ret);
  const paid: Kv[] = []; flattenKv("", card.paidItems, paid);
  const stop: Kv[] = []; flattenKv("", card.stoppedItems, stop);
  const iss: Kv[] = []; flattenKv("", card.issuedItems, iss);

  const sig = (v: string | null) => v ? `present (${v.slice(0, 20)}...)` : "missing";

  return buildKvPdf(
    "Offboarding Card / Phieu thoi viec",
    [
      ["Code", card.offboardingCode],
      ["Company", card.companyCode],
      ["Status", card.status],
      ["Employee", `${card.employee.employeeCode} / ${card.employee.nameVi}`],
    ],
    [
      { title: "Returned Items", items: ret },
      { title: "Final Payments", items: paid },
      { title: "Stopped Services", items: stop },
      { title: "Issued Documents", items: iss },
      { title: "Signatures", items: [
        ["hr_signature", sig(card.hrSignature)],
        ["accounting_signature", sig(card.accountingSignature)],
        ["employee_signature", sig(card.employeeSignature)],
      ]},
    ],
  );
}
