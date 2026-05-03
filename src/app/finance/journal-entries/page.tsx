import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { JournalEntriesClient } from "./journal-client";

export const dynamic = "force-dynamic";

export default async function JournalEntriesPage() {
  const session = await getSession();
  const L = session.language;
  const entries = await prisma.journalEntry.findMany({
    orderBy: [{ entryDate: "desc" }, { entryNo: "desc" }],
    take: 200,
    include: {
      lines: {
        orderBy: { lineNo: "asc" },
        include: { account: { select: { nameVi: true, nameEn: true, nameKo: true, type: true } } },
      },
    },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="mb-6 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("nav.journalEntries", L)}</h1>
        <Card>
          <JournalEntriesClient
            entries={entries.map((e) => ({
              id: e.id,
              entryNo: e.entryNo,
              entryDate: e.entryDate.toISOString().slice(0, 10),
              description: e.description,
              status: e.status as string,
              source: e.source as string,
              sourceModuleId: e.sourceModuleId,
              lines: e.lines.map((l) => ({
                lineNo: l.lineNo,
                accountCode: l.accountCode,
                accountName: L === "VI" ? l.account.nameVi : L === "EN" ? l.account.nameEn : l.account.nameKo,
                debit: Number(l.debitAmount),
                credit: Number(l.creditAmount),
                description: l.description,
              })),
            }))}
            lang={L}
          />
        </Card>
      </div>
    </main>
  );
}
