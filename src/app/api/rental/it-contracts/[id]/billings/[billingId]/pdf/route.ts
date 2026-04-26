import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { notFound } from "@/lib/api-utils";
import { PDFDocument } from "pdf-lib";
import { embedCjkFont } from "@/lib/pdf-fonts";

// GET /api/rental/it-contracts/[id]/billings/[billingId]/pdf
//   해당 IT 월별 청구서를 PDF 로 다운로드.
//   발행 시점에 lockedAt 자동 부여 (PDF 발행 = 청구 확정).
//
// 한국어/베트남어 폰트 임베드는 추후 단계 — 현재 ASCII + 영문 라벨.

type RouteContext = { params: Promise<{ id: string; billingId: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id, billingId } = await context.params;
    const bill = await prisma.itMonthlyBilling.findUnique({
      where: { id: billingId },
      include: {
        itContract: { include: { client: { select: { clientCode: true, companyNameVi: true } } } },
      },
    });
    if (!bill || bill.itContractId !== id) return notFound();

    const doc = await PDFDocument.create();
    const font = await embedCjkFont(doc);
    const bold = font;
    const page = doc.addPage([595, 842]);
    let y = 800;
    page.drawText("IT 월별 청구서 / IT Monthly Billing / Hóa đơn tháng", { x: 50, y, font: bold, size: 14 });
    y -= 30;
    const lines: [string, string][] = [
      ["Contract", bill.itContract.contractNumber],
      ["Client", `${bill.itContract.client.clientCode} / ${bill.itContract.client.companyNameVi}`],
      ["Billing Month", bill.billingMonth.toISOString().slice(0, 7)],
      ["Serial Number", bill.serialNumber],
      ["BW Counter", String(bill.counterBw ?? "-")],
      ["Color Counter", String(bill.counterColor ?? "-")],
      ["Billing Method", bill.billingMethod],
      ["Yield Verified", String(bill.yieldVerified)],
      ["Computed Amount", String(bill.computedAmount ?? "-")],
    ];
    for (const [k, v] of lines) {
      page.drawText(k, { x: 50, y, font: bold, size: 11 });
      page.drawText(v, { x: 220, y, font, size: 11 });
      y -= 16;
    }

    // PDF 발행 = 자동 lock
    if (!bill.lockedAt) {
      await prisma.itMonthlyBilling.update({
        where: { id: billingId },
        data: { lockedAt: new Date(), lockReason: "PDF 청구서 발행" },
      }).catch(() => undefined);
    }

    const bytes = await doc.save();
    return new Response(bytes as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${bill.itContract.contractNumber}-${bill.billingMonth.toISOString().slice(0,7)}.pdf`,
      },
    });
  });
}
