import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, requireString, serverError, trimNonEmpty, optionalEnum, requireEnum } from "@/lib/api-utils";
import type { BranchType, CostCenterType } from "@/generated/prisma/client";

const TYPES: readonly CostCenterType[] = ["DEPARTMENT", "BRANCH", "PROJECT"] as const;
const BRANCHES: readonly BranchType[] = ["BN", "HN", "HCM", "NT", "DN"] as const;

export async function GET() {
  return withSessionContext(async () => {
    const centers = await prisma.costCenter.findMany({
      orderBy: { code: "asc" },
      include: { _count: { select: { budgets: true, allocations: true } } },
    });
    return ok({ centers });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async () => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const code = requireString(p.code, "code");
      const name = requireString(p.name, "name");
      const centerType = requireEnum(p.centerType, TYPES, "centerType");
      const center = await prisma.costCenter.create({
        data: {
          code, name, centerType,
          departmentId: trimNonEmpty(p.departmentId),
          branchCode: optionalEnum(p.branchCode, BRANCHES),
          projectType: trimNonEmpty(p.projectType),
        },
      });
      return ok({ center }, { status: 201 });
    } catch (err) { return serverError(err); }
  });
}
