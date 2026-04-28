import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-utils";
import type { ClientPointPolicy } from "@/generated/prisma/client";

const VALID: ClientPointPolicy[] = ["NONE", "INVOICE_DEDUCT_ONLY", "GIFT_CARD_ONLY", "BOTH"];

// GET — 모든 거래처 + 현재 포인트 정책 + 잔액
export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    try {
      const clients = await prisma.client.findMany({
        where: { deletedAt: null },
        orderBy: { clientCode: "asc" },
        select: { id: true, clientCode: true, companyNameVi: true, companyNameKo: true, pointPolicy: true, portalUser: { select: { id: true, username: true, isActive: true } } },
      });
      // 거래처별 잔액 (SUM)
      const balances = await prisma.portalPoint.groupBy({ by: ["clientId"], _sum: { amount: true } });
      const balMap = new Map(balances.map((b) => [b.clientId, Number(b._sum.amount ?? 0)]));
      const items = clients.map((c) => ({
        id: c.id,
        clientCode: c.clientCode,
        companyNameVi: c.companyNameVi,
        companyNameKo: c.companyNameKo,
        pointPolicy: c.pointPolicy,
        portalUsername: c.portalUser?.username ?? null,
        portalActive: c.portalUser?.isActive ?? false,
        balance: balMap.get(c.id) ?? 0,
      }));
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}

// PUT — 한 거래처의 정책 변경
export async function PUT(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    const clientId = String(p.clientId ?? "").trim();
    const policy = String(p.pointPolicy ?? "");
    if (!clientId) return badRequest("invalid_input", { field: "clientId" });
    if (!VALID.includes(policy as ClientPointPolicy)) return badRequest("invalid_policy");
    try {
      const updated = await prisma.client.update({ where: { id: clientId }, data: { pointPolicy: policy as ClientPointPolicy } });
      return ok({ client: { id: updated.id, pointPolicy: updated.pointPolicy } });
    } catch (e) { return serverError(e); }
  });
}
