import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { AsTicketNewForm } from "./as-ticket-new-form";

export const dynamic = "force-dynamic";

export default async function NewAsTicketPage() {
  const session = await getSession();
  const L = session.language;

  const [clients, items, employees] = await Promise.all([
    prisma.client.findMany({
      orderBy: { clientCode: "desc" },
      take: 200,
      select: { id: true, clientCode: true, companyNameVi: true, receivableStatus: true },
    }),
    prisma.item.findMany({
      orderBy: { itemCode: "desc" },
      take: 200,
      select: { id: true, itemCode: true, name: true },
    }),
    prisma.employee.findMany({
      where: { companyCode: session.companyCode, status: "ACTIVE" },
      orderBy: { employeeCode: "asc" },
      select: { id: true, employeeCode: true, nameVi: true, position: true },
    }),
  ]);

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href="/as/tickets"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            {t("page.asTickets.back", L)}
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.asTickets.new", L)}</h1>
        </div>
        <Card>
          <AsTicketNewForm
            lang={L}
            defaultLanguage={session.language}
            clients={clients.map((c) => ({
              id: c.id,
              label: `${c.clientCode} · ${c.companyNameVi}`,
              receivableStatus: c.receivableStatus,
            }))}
            itemOptions={items.map((i) => ({ value: i.id, label: `${i.itemCode} · ${i.name}` }))}
            employeeOptions={employees.map((e) => ({
              value: e.id,
              label: `${e.employeeCode} · ${e.nameVi}${e.position ? ` (${e.position})` : ""}`,
            }))}
          />
        </Card>
      </div>
    </main>
  );
}
