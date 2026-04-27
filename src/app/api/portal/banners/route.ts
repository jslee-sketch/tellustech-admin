import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { ok, serverError } from "@/lib/api-utils";

// GET /api/portal/banners — slot 별 활성 배너 (사용자 언어로)
export async function GET() {
  return withSessionContext(async (session) => {
    try {
      const lang = session.language; // VI|EN|KO
      const banners = await prisma.portalBanner.findMany({ where: { isActive: true } });
      const out = banners.map((b) => ({
        slot: b.slot,
        text: lang === "VI" ? b.textVi : lang === "EN" ? b.textEn : b.textKo,
        linkUrl: b.linkUrl,
      }));
      return ok({ banners: out });
    } catch (e) { return serverError(e); }
  });
}
