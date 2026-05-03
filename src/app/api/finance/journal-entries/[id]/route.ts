// JournalEntry 단건 — 전기/역분개
import { withSessionContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-utils";
import { createJournalEntry } from "@/lib/journal";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withSessionContext(async () => {
    try {
      const { id } = await params;
      const entry = await prisma.journalEntry.findUnique({
        where: { id },
        include: {
          lines: { orderBy: { lineNo: "asc" }, include: { account: true } },
          postedBy: { select: { id: true, username: true } },
          createdBy: { select: { id: true, username: true } },
        },
      });
      if (!entry) return badRequest("not_found");
      return ok({ entry });
    } catch (e) { return serverError(e); }
  });
}

// PATCH — action: "post" | "reverse"
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    try {
      const { id } = await params;
      const body = (await request.json()) as { action?: string };
      const action = body.action;
      const entry = await prisma.journalEntry.findUnique({
        where: { id },
        include: { lines: true },
      });
      if (!entry) return badRequest("not_found");

      if (action === "post") {
        if (entry.status !== "DRAFT") return badRequest("not_draft");
        const updated = await prisma.journalEntry.update({
          where: { id },
          data: { status: "POSTED", postedAt: new Date(), postedById: session.sub },
        });
        return ok({ entry: updated });
      }
      if (action === "reverse") {
        if (entry.status !== "POSTED") return badRequest("not_posted");
        // 역분개 — 차/대 swap 한 새 entry
        const reversal = await createJournalEntry({
          entryDate: new Date(),
          description: `[역분개] ${entry.entryNo} — ${entry.description}`,
          source: "ADJUSTMENT",
          sourceModuleId: entry.id,
          companyCode: session.companyCode as "TV" | "VR",
          createdById: session.sub,
          autoPost: true,
          lines: entry.lines.map((l) => ({
            accountCode: l.accountCode,
            debit: Number(l.creditAmount),
            credit: Number(l.debitAmount),
            description: `역분개: ${l.description ?? ""}`,
            costCenterId: l.costCenterId ?? undefined,
            clientId: l.clientId ?? undefined,
          })),
        });
        await prisma.journalEntry.update({
          where: { id },
          data: { status: "REVERSED", reversedById: reversal.id },
        });
        return ok({ entry: { id, status: "REVERSED" }, reversal });
      }
      return badRequest("invalid_action");
    } catch (e) { return serverError(e); }
  });
}
