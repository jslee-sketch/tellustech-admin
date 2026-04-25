import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";
import { saveGeneratedFile } from "@/lib/files";
import { generateOnboardingPdf } from "@/lib/hr-pdf";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/hr/onboarding/[id]/pdf
// 입사카드 PDF 자동생성 → File 저장 → OnboardingCard.generatedPdfId 갱신.
// 이미 PDF 가 있으면 재생성으로 교체(이전 File 행은 보존, generatedPdfId 만 갱신).
export async function POST(_req: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    if (!["ADMIN", "MANAGER", "HR"].includes(session.role)) return forbidden();
    const { id } = await context.params;

    try {
      const card = await prisma.onboardingCard.findUnique({
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

      const bytes = await generateOnboardingPdf(card);
      const stored = await saveGeneratedFile({
        bytes,
        fileName: `onboarding-${card.onboardingCode}.pdf`,
      });
      const file = await prisma.file.create({
        data: {
          uploaderId: session.sub,
          category: "PDF",
          originalName: `onboarding-${card.onboardingCode}.pdf`,
          storedPath: stored.storedPath,
          mimeType: "application/pdf",
          sizeBytes: stored.sizeBytes,
          compressed: false,
        },
      });
      const updated = await prisma.onboardingCard.update({
        where: { id },
        data: { generatedPdfId: file.id },
      });
      return ok({ card: updated, file: { id: file.id, sizeBytes: file.sizeBytes } });
    } catch (err) {
      return serverError(err);
    }
  });
}
