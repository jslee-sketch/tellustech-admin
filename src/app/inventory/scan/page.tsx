import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { ScanClient } from "./scan-client";

export const dynamic = "force-dynamic";

export default async function InventoryScanPage() {
  await getSession();
  const [items, warehouses] = await Promise.all([
    prisma.item.findMany({ orderBy: { itemCode: "desc" }, take: 500, select: { id: true, itemCode: true, name: true } }),
    prisma.warehouse.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
  ]);
  return (
    <main className="flex-1 p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <Link href="/inventory/transactions" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">
            ← 입출고 이력
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">📷 바코드 입출고</h1>
        </div>
        <Card>
          <ScanClient
            items={items.map((i) => ({ value: i.id, label: `${i.itemCode} · ${i.name}` }))}
            warehouses={warehouses.map((w) => ({ value: w.id, label: `${w.code} · ${w.name}` }))}
          />
        </Card>
      </div>
    </main>
  );
}
