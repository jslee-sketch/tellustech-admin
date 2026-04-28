import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { companyScope, ok, trimNonEmpty } from "@/lib/api-utils";
import type { Prisma, YieldBadge } from "@/generated/prisma/client";

const BADGES: readonly YieldBadge[] = ["BLUE", "GREEN", "YELLOW", "ORANGE", "RED"] as const;

// GET /api/yield-analysis?contractId=&equipmentId=&periodStart=&periodEnd=&badge=&fraudOnly=1
export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const contractId = trimNonEmpty(url.searchParams.get("contractId"));
    const equipmentId = trimNonEmpty(url.searchParams.get("equipmentId"));
    const periodStart = trimNonEmpty(url.searchParams.get("periodStart"));
    const periodEnd = trimNonEmpty(url.searchParams.get("periodEnd"));
    const badgeRaw = trimNonEmpty(url.searchParams.get("badge"));
    const fraudOnly = url.searchParams.get("fraudOnly") === "1";
    const badge = badgeRaw && (BADGES as readonly string[]).includes(badgeRaw) ? (badgeRaw as YieldBadge) : null;

    const where: Prisma.YieldAnalysisWhereInput = {
      ...companyScope(session),
      ...(contractId ? { contractId } : {}),
      ...(equipmentId ? { equipmentId } : {}),
      ...(badge ? { badgeBw: badge } : {}),
      ...(fraudOnly ? { isFraudSuspect: true } : {}),
      ...(periodStart || periodEnd
        ? {
            periodStart: periodStart ? { gte: new Date(periodStart) } : undefined,
            periodEnd: periodEnd ? { lte: new Date(periodEnd) } : undefined,
          }
        : {}),
    };

    const items = await prisma.yieldAnalysis.findMany({
      where,
      orderBy: [{ isFraudSuspect: "desc" }, { yieldRateBw: "asc" }],
      take: 500,
      include: {
        equipment: { select: { id: true, serialNumber: true, item: { select: { name: true } } } },
        contract: { select: { id: true, contractNumber: true, client: { select: { id: true, clientCode: true, companyNameKo: true, companyNameVi: true, companyNameEn: true } } } },
      },
    });

    return ok({ items });
  });
}
