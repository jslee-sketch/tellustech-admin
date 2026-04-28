import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden, notFound, ok, serverError } from "@/lib/api-utils";

export async function GET(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const { id } = await ctx.params;
    try {
      const uc = await prisma.usageConfirmation.findUnique({
        where: { id },
        include: {
          contract: { select: { contractNumber: true, clientId: true } },
          client: { select: { clientCode: true, companyNameVi: true, companyNameKo: true } },
        },
      });
      if (!uc) return notFound();
      return ok({ usageConfirmation: uc });
    } catch (e) { return serverError(e); }
  });
}
