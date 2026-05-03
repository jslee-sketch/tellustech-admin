// 회계 전표 (JournalEntry) — 조회 + 수동 등록
import { withSessionContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-utils";
import { createJournalEntry } from "@/lib/journal";

const SOURCES = ["MANUAL", "SALES", "PURCHASE", "CASH", "EXPENSE", "PAYROLL", "ADJUSTMENT"] as const;

export async function GET(request: Request) {
  return withSessionContext(async () => {
    try {
      const u = new URL(request.url);
      const source = u.searchParams.get("source");
      const status = u.searchParams.get("status");
      const from = u.searchParams.get("from");
      const to = u.searchParams.get("to");
      const limit = Math.min(500, Number(u.searchParams.get("limit") ?? 200));

      const where: Record<string, unknown> = {};
      if (source && (SOURCES as readonly string[]).includes(source)) where.source = source;
      if (status) where.status = status;
      if (from || to) {
        where.entryDate = {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        };
      }

      const entries = await prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            orderBy: { lineNo: "asc" },
            include: { account: { select: { nameVi: true, nameEn: true, nameKo: true, type: true } } },
          },
        },
        orderBy: [{ entryDate: "desc" }, { entryNo: "desc" }],
        take: limit,
      });
      return ok({ entries });
    } catch (e) { return serverError(e); }
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      const entryDate = body.entryDate ? new Date(String(body.entryDate)) : new Date();
      const description = String(body.description ?? "").trim();
      if (!description) return badRequest("invalid_input", { field: "description" });
      const lines = Array.isArray(body.lines) ? body.lines : [];
      if (lines.length < 2) return badRequest("invalid_input", { field: "lines", reason: "at_least_2" });

      const result = await createJournalEntry({
        entryDate,
        description,
        source: "MANUAL",
        companyCode: session.companyCode as "TV" | "VR",
        createdById: session.sub,
        autoPost: body.autoPost === true,
        lines: lines.map((l: Record<string, unknown>) => ({
          accountCode: String(l.accountCode ?? ""),
          debit: Number(l.debit ?? 0),
          credit: Number(l.credit ?? 0),
          description: l.description ? String(l.description) : undefined,
          costCenterId: l.costCenterId ? String(l.costCenterId) : undefined,
          clientId: l.clientId ? String(l.clientId) : undefined,
        })),
      });
      return ok({ entry: result }, { status: 201 });
    } catch (e) {
      const msg = (e as Error)?.message ?? "";
      if (msg.includes("차대 불일치") || msg.includes("최소 2개")) return badRequest("validation_failed", { detail: msg });
      return serverError(e);
    }
  });
}
