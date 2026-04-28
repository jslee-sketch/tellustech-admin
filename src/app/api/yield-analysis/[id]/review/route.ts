import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError, trimNonEmpty } from "@/lib/api-utils";

// PATCH /api/yield-analysis/[id]/review
// Body: { fraudNote }
// 관리자만 — 부정 의심 건 조사 결과 기록.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN") return forbidden("admin_only");
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const fraudNote = trimNonEmpty(p.fraudNote);
    if (!fraudNote) return badRequest("invalid_input", { field: "fraudNote", reason: "required" });

    try {
      const existing = await prisma.yieldAnalysis.findUnique({ where: { id } });
      if (!existing) return notFound();
      const updated = await prisma.yieldAnalysis.update({
        where: { id },
        data: {
          fraudNote,
          fraudReviewedById: session.sub,
          fraudReviewedAt: new Date(),
        },
      });
      return ok({ analysis: updated });
    } catch (err) {
      return serverError(err);
    }
  });
}
