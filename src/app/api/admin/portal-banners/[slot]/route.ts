import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-utils";

export async function PUT(request: Request, ctx: { params: Promise<{ slot: string }> }) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    const { slot } = await ctx.params;
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const data = {
      textKo: String(p.textKo ?? ""),
      textVi: String(p.textVi ?? ""),
      textEn: String(p.textEn ?? ""),
      linkUrl: String(p.linkUrl ?? ""),
      isActive: Boolean(p.isActive ?? true),
    };
    if (!data.textKo || !data.linkUrl) return badRequest("invalid_input");
    try {
      const banner = await prisma.portalBanner.upsert({
        where: { slot },
        update: data,
        create: { slot, ...data },
      });
      return ok({ banner });
    } catch (e) { return serverError(e); }
  });
}
