// 회계 — 모듈→VAS 코드 자동분개 매핑 (AccountMapping)
import { withSessionContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-utils";

export async function GET() {
  return withSessionContext(async () => {
    try {
      const mappings = await prisma.accountMapping.findMany({
        orderBy: { trigger: "asc" },
        include: { account: { select: { code: true, nameVi: true, nameEn: true, nameKo: true, type: true } } },
      });
      return ok({ mappings });
    } catch (e) { return serverError(e); }
  });
}

export async function PUT(request: Request) {
  return withSessionContext(async (session) => {
    try {
      const body = (await request.json()) as { trigger?: string; accountCode?: string; isActive?: boolean };
      if (!body.trigger || !body.accountCode) return badRequest("invalid_input");

      // 자동 매핑 lookup 으로만 사용 — 실제 분개에서 활성 계정 검증.
      const acc = await prisma.chartOfAccount.findUnique({
        where: { companyCode_code: { companyCode: session.companyCode as never, code: body.accountCode } },
        select: { isLeaf: true, isActive: true },
      });
      if (!acc) return badRequest("invalid_account");
      if (!acc.isLeaf) return badRequest("not_leaf_account");

      const updated = await prisma.accountMapping.upsert({
        where: { companyCode_trigger: { companyCode: session.companyCode as never, trigger: body.trigger as never } },
        update: {
          accountCode: body.accountCode,
          isActive: body.isActive ?? true,
        },
        create: {
          trigger: body.trigger as never,
          accountCode: body.accountCode,
          isActive: body.isActive ?? true,
        },
      });
      return ok({ mapping: updated });
    } catch (e) { return serverError(e); }
  });
}
