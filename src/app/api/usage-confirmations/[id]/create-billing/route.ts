import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";

// POST /api/usage-confirmations/[id]/create-billing
// PDF_GENERATED 상태에서 매출 전표 생성 → 미수금 자동 발생.
// IT계약 = RENTAL 매출 — 라인 1줄 (전체 합계). 추후 장비별 분리 옵션은 Phase 2.
export async function POST(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    const uc = await prisma.usageConfirmation.findUnique({
      where: { id },
      include: { contract: { select: { id: true, contractNumber: true, clientId: true, currency: true, fxRate: true } } },
    });
    if (!uc) return notFound();
    if (uc.status !== "PDF_GENERATED" && uc.status !== "BILLED") return badRequest("invalid_state", { current: uc.status, expected: "PDF_GENERATED" });
    if (uc.salesId) return badRequest("already_billed", { salesId: uc.salesId });
    try {
      // RENTAL 프로젝트 찾기 (없으면 첫 RENTAL 프로젝트)
      const project = await prisma.project.findFirst({ where: { salesType: "RENTAL", deletedAt: null }, orderBy: { createdAt: "asc" } });

      const sales = await withUniqueRetry(
        () => generateDatedCode({
          prefix: "SLS", digits: 3,
          lookupLast: async (full) => {
            const last = await prisma.sales.findFirst({ where: { salesNumber: { startsWith: full } }, orderBy: { salesNumber: "desc" }, select: { salesNumber: true } });
            return last?.salesNumber ?? null;
          },
        }).then(async (salesNumber) => {
          // 1) Sales 헤더 생성
          const created = await prisma.sales.create({
            data: {
              salesNumber,
              clientId: uc.contract.clientId,
              projectId: project?.id ?? null,
              itContractId: uc.contract.id, // OA 분기 표시
              totalAmount: uc.totalAmount,
              currency: uc.contract.currency,
              fxRate: uc.contract.fxRate,
              note: `사용량 확인서 ${uc.confirmCode} 자동 발행 (${uc.billingMonth})`,
              usagePeriodStart: uc.periodStart,
              usagePeriodEnd: uc.periodEnd,
            },
          });
          return created;
        }),
        { isConflict: () => true },
      );

      // 2) UsageConfirmation 갱신
      const updated = await prisma.usageConfirmation.update({
        where: { id },
        data: { salesId: sales.id, status: "BILLED" },
      });

      return ok({ usageConfirmation: updated, sales });
    } catch (e) { return serverError(e); }
  });
}
