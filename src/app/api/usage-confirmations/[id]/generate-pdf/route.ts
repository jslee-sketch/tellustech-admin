import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";
import { generateUsageConfirmationPdf } from "@/lib/usage-confirmation-pdf";
import { saveGeneratedFile } from "@/lib/files";

// POST /api/usage-confirmations/[id]/generate-pdf
export async function POST(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    const uc = await prisma.usageConfirmation.findUnique({
      where: { id },
      include: {
        contract: { select: { contractNumber: true } },
        client: { select: { clientCode: true, companyNameVi: true, companyNameKo: true } },
      },
    });
    if (!uc) return notFound();
    if (!["ADMIN_CONFIRMED", "PDF_GENERATED", "BILLED"].includes(uc.status)) return badRequest("invalid_state");
    try {
      const bytes = await generateUsageConfirmationPdf({
        confirmCode: uc.confirmCode,
        contractNumber: uc.contract.contractNumber,
        clientCode: uc.client.clientCode,
        clientName: uc.client.companyNameKo ?? uc.client.companyNameVi,
        billingMonth: uc.billingMonth,
        periodStart: uc.periodStart,
        periodEnd: uc.periodEnd,
        totalAmount: Number(uc.totalAmount),
        equipmentUsage: uc.equipmentUsage as any,
        customerConfirmedAt: uc.customerConfirmedAt,
        customerSignature: uc.customerSignature,
        customerNote: uc.customerNote,
      });
      const stored = await saveGeneratedFile({ bytes, fileName: `usage-${uc.confirmCode}.pdf` });
      const file = await prisma.file.create({
        data: {
          originalName: `usage-${uc.confirmCode}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: stored.sizeBytes,
          storedPath: stored.storedPath,
          category: "PDF",
          uploaderId: session.sub,
        },
      });
      const updated = await prisma.usageConfirmation.update({
        where: { id },
        data: { pdfFileId: file.id, status: uc.status === "BILLED" ? "BILLED" : "PDF_GENERATED" },
      });
      return ok({ usageConfirmation: updated, fileId: file.id });
    } catch (e) { return serverError(e); }
  });
}
