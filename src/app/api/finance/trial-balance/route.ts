import { withSessionContext } from "@/lib/session";
import { ok, badRequest, serverError } from "@/lib/api-utils";
import { computeTrialBalance } from "@/lib/financial-statements";

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    try {
      const u = new URL(request.url);
      const period = u.searchParams.get("period");
      if (!period || !/^\d{4}-\d{2}$/.test(period)) return badRequest("invalid_period");
      const rows = await computeTrialBalance(period, session.companyCode as "TV" | "VR");
      return ok({ period, rows });
    } catch (e) { return serverError(e); }
  });
}
