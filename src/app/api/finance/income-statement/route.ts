import { withSessionContext } from "@/lib/session";
import { ok, badRequest, serverError } from "@/lib/api-utils";
import { computeIncomeStatement } from "@/lib/financial-statements";

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    try {
      const u = new URL(request.url);
      const period = u.searchParams.get("period");
      const lang = (u.searchParams.get("lang") ?? session.language) as "VI" | "EN" | "KO";
      if (!period || !/^\d{4}-\d{2}$/.test(period)) return badRequest("invalid_period");
      const result = await computeIncomeStatement(period, session.companyCode as "TV" | "VR", lang);
      return ok({ result });
    } catch (e) { return serverError(e); }
  });
}
