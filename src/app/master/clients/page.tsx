import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { ClientsClient } from "./clients-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await getSession();
  const L = session.language;
  const clients = await prisma.client.findMany({
    orderBy: { clientCode: "desc" },
    take: 500,
    include: { _count: { select: { contacts: true } } },
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            TELLUSTECH ERP
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            {t("page.clients.title", L)}
            <span className="ml-3 rounded bg-[color:var(--tts-accent-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-accent)]">
              {t("label.sharedMaster", L)}
            </span>
          </h1>
        </div>
        <ClientsClient
          lang={L}
          initialData={clients.map((c) => ({
            id: c.id,
            clientCode: c.clientCode,
            companyNameVi: c.companyNameVi,
            companyNameEn: c.companyNameEn,
            taxCode: c.taxCode,
            phone: c.phone,
            grade: c.grade,
            receivableStatus: c.receivableStatus,
            contactCount: c._count.contacts,
          }))}
        />
      </div>
    </main>
  );
}
