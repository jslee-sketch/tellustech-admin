import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";
import { saveGeneratedFile } from "@/lib/files";
import { generateOffboardingPdf } from "@/lib/hr-pdf";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    if (!["ADMIN", "MANAGER", "HR"].includes(session.role)) return forbidden();
    const { id } = await context.params;

    try {
      const card = await prisma.offboardingCard.findUnique({
        where: { id },
        include: {
          employee: { select: { employeeCode: true, nameVi: true, nameEn: true, nameKo: true } },
        },
      });
      if (!card) return notFound();
      if (card.companyCode !== session.companyCode) return forbidden();
      if (card.status !== "COMPLETED") {
        return badRequest("not_completed", { message: "COMPLETED 상태에서만 PDF 발급 가능합니다." });
      }

      const bytes = await generateOffboardingPdf(card);
      const stored = await saveGeneratedFile({
        bytes,
        fileName: `offboarding-${card.offboardingCode}.pdf`,
      });
      const file = await prisma.file.create({
        data: {
          uploaderId: session.sub,
          category: "PDF",
          originalName: `offboarding-${card.offboardingCode}.pdf`,
          storedPath: stored.storedPath,
          mimeType: "application/pdf",
          sizeBytes: stored.sizeBytes,
          compressed: false,
        },
      });
      const updated = await prisma.offboardingCard.update({
        where: { id },
        data: { generatedPdfId: file.id },
      });
      return ok({ card: updated, file: { id: file.id, sizeBytes: file.sizeBytes } });
    } catch (err) {
      return serverError(err);
    }
  });
}
