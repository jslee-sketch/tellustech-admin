import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-utils";
import { grantPoints } from "@/lib/portal-points";

// POST /api/admin/portal-points/grant
// body: { clientId, amount (양수=지급, 음수=차감), reasonDetail }
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const clientId = String(p.clientId ?? "").trim();
    const amount = Number(p.amount ?? 0);
    const reasonDetail = String(p.reasonDetail ?? "").trim() || undefined;
    if (!clientId) return badRequest("invalid_input", { field: "clientId" });
    if (!Number.isFinite(amount) || amount === 0) return badRequest("invalid_input", { field: "amount" });
    try {
      const reason = amount > 0 ? "ADMIN_GRANT" : "ADMIN_DEDUCT";
      const result = await grantPoints({
        clientId,
        reason,
        customAmount: amount,
        issuedById: session.sub,
        reasonDetail,
      });
      return ok({ result });
    } catch (e) { return serverError(e); }
  });
}
