import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { WarehouseForm } from "../warehouse-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditWarehousePage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const L = session.language;
  const w = await prisma.warehouse.findUnique({ where: { id } });
  if (!w) notFound();

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/master/warehouses"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            {t("page.warehouses.back", L)}
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            {t("page.warehouses.detail", L)}
            <span className="ml-3 font-mono text-[14px] text-[color:var(--tts-primary)]">{w.code}</span>
          </h1>
        </div>
        <Card>
          <WarehouseForm
            mode="edit"
            lang={L}
            initial={{
              id: w.id,
              code: w.code,
              name: w.name,
              warehouseType: w.warehouseType,
              branchType: w.branchType ?? "",
              location: w.location ?? "",
            }}
          />
        </Card>
      </div>
    </main>
  );
}
