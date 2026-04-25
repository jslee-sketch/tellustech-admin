import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { DepreciationClient } from "./depreciation-client";

export const dynamic = "force-dynamic";

export default async function DepreciationPage() {
  const session = await getSession();
  const L = session.language;
  const [rows, items] = await Promise.all([
    prisma.assetDepreciation.findMany({
      where: companyScope(session),
      orderBy: [{ serialNumber: "asc" }, { month: "asc" }],
      take: 2000,
      include: { item: { select: { itemCode: true, name: true } } },
    }),
    prisma.item.findMany({
      orderBy: { itemCode: "desc" },
      take: 500,
      select: { id: true, itemCode: true, name: true },
    }),
  ]);

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">
            TELLUSTECH ERP
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            {t("page.depreciation.title", L)}
            <span className="ml-3 rounded bg-[color:var(--tts-primary-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-primary)]">
              {session.companyCode}
            </span>
          </h1>
        </div>
        <Card>
          <DepreciationClient
            lang={L}
            initialData={rows.map((r) => ({
              id: r.id,
              itemCode: r.item.itemCode,
              itemName: r.item.name,
              serialNumber: r.serialNumber,
              acquisitionDate: r.acquisitionDate.toISOString().slice(0, 10),
              acquisitionCost: r.acquisitionCost.toString(),
              method: r.method,
              usefulLifeMonths: r.usefulLifeMonths,
              month: r.month.toISOString().slice(0, 7),
              depreciationAmount: r.depreciationAmount.toString(),
              bookValue: r.bookValue.toString(),
            }))}
            itemOptions={items.map((i) => ({ value: i.id, label: `${i.itemCode} · ${i.name}` }))}
          />
        </Card>
      </div>
    </main>
  );
}
