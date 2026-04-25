import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  forbidden,
  handleFieldError,
  ok,
  optionalEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { Prisma } from "@/generated/prisma/client";

// 마케팅 캠페인(MarketingCampaign) 기본 CRUD — Phase 4 베이스.
// type: SURVEY / EMAIL.

const TYPES = ["SURVEY", "EMAIL"] as const;

function parseDateOrNull(v: unknown): Date | null {
  const s = trimNonEmpty(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  return withSessionContext(async (session) => {
    const rows = await prisma.marketingCampaign.findMany({
      where: { OR: [{ companyCode: session.companyCode }, { companyCode: null }] },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { client: { select: { clientCode: true, companyNameVi: true } } },
    });
    return ok({ campaigns: rows });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (!["ADMIN", "MANAGER"].includes(session.role)) return forbidden();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const name = requireString(p.name, "name");
      const type = optionalEnum(p.type, TYPES);
      if (!type) return badRequest("invalid_input", { field: "type" });
      const clientId = trimNonEmpty(p.clientId);
      if (clientId) {
        const c = await prisma.client.findUnique({ where: { id: clientId } });
        if (!c) return badRequest("invalid_client");
      }
      const created = await prisma.marketingCampaign.create({
        data: {
          companyCode: session.companyCode,
          name,
          type,
          clientId: clientId ?? null,
          startDate: parseDateOrNull(p.startDate),
          endDate: parseDateOrNull(p.endDate),
          contentJson: p.contentJson ? (p.contentJson as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
      return ok({ campaign: created }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      return serverError(err);
    }
  });
}
