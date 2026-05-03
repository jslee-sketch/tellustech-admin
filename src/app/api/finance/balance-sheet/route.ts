import { withSessionContext } from "@/lib/session";
import { ok, badRequest, serverError } from "@/lib/api-utils";
import { computeBalanceSheet } from "@/lib/financial-statements";

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    try {
      const u = new URL(request.url);
      const asOf = u.searchParams.get("asOf");
      const lang = (u.searchParams.get("lang") ?? session.language) as "VI" | "EN" | "KO";
      if (!asOf || !/^\d{4}-\d{2}(-\d{2})?$/.test(asOf)) return badRequest("invalid_asOf");
      const result = await computeBalanceSheet(asOf, session.companyCode as "TV" | "VR", lang);
      return ok({ result });
    } catch (e) { return serverError(e); }
  });
}
