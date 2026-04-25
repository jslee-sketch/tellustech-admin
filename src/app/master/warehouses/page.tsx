import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { WarehousesClient } from "./warehouses-client";

export const dynamic = "force-dynamic";

export default async function WarehousesPage() {
  const session = await getSession();
  const L = session.language;
  const warehouses = await prisma.warehouse.findMany({
    orderBy: [{ branchType: "asc" }, { code: "asc" }],
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            TELLUSTECH ERP
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            {t("page.warehouses.title", L)}
            <span className="ml-3 rounded bg-[color:var(--tts-accent-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-accent)]">
              {t("label.sharedMaster2", L)}
            </span>
          </h1>
        </div>
        <WarehousesClient
          lang={L}
          initialData={warehouses.map((w) => ({
            id: w.id,
            code: w.code,
            name: w.name,
            warehouseType: w.warehouseType,
            branchType: w.branchType,
            location: w.location,
          }))}
        />
      </div>
    </main>
  );
}
