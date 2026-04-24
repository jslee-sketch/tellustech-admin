import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { ScanClient } from "./scan-client";

export const dynamic = "force-dynamic";

export default async function InventoryScanPage() {
  await getSession();
  const [items, warehouses, clients] = await Promise.all([
    prisma.item.findMany({ orderBy: { itemCode: "desc" }, take: 500, select: { id: true, itemCode: true, name: true } }),
    prisma.warehouse.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true, warehouseType: true } }),
    prisma.client.findMany({ orderBy: { clientCode: "asc" }, take: 500, select: { id: true, clientCode: true, companyNameVi: true } }),
  ]);
  return (
    <main className="flex-1 p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <Link href="/inventory/transactions" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">
            ← 입출고 현황
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">📷 QR 스캔 입출고</h1>
          <p className="mt-1 text-[12px] text-[color:var(--tts-sub)]">QR(권장) 또는 바코드 스캔 → 품목·S/N 자동 채움 → 유형/사유/창고 선택 → 저장.</p>
        </div>
        <Card>
          <ScanClient
            items={items.map((i) => ({ value: i.id, label: `${i.itemCode} · ${i.name}`, itemCode: i.itemCode, itemName: i.name }))}
            warehouses={warehouses.map((w) => ({ value: w.id, label: `${w.code} · ${w.name}`, warehouseType: w.warehouseType }))}
            clients={clients.map((c) => ({ value: c.id, label: `${c.clientCode} · ${c.companyNameVi}` }))}
          />
        </Card>
      </div>
    </main>
  );
}
