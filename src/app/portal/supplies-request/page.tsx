import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Card, Note } from "@/components/ui";
import { SuppliesRequestForm } from "./supplies-request-form";

export const dynamic = "force-dynamic";

export default async function PortalSuppliesPage() {
  const session = await getSession();
  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
  if (!user?.clientAccount) return <div className="p-8">권한 없음</div>;
  const client = user.clientAccount;
  const consumables = await prisma.item.findMany({
    where: { itemType: "CONSUMABLE" },
    orderBy: { name: "asc" },
    take: 500,
    select: { id: true, itemCode: true, name: true, unit: true },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/portal" className="text-[11px] font-bold text-[color:var(--tts-accent)]">← 포탈</Link>
        <h1 className="mt-1 mb-3 text-2xl font-extrabold">📦 소모품 요청</h1>
        {client.receivableStatus === "BLOCKED" && (
          <Note tone="danger">미수금 차단 — 재경팀 승인 후 요청 가능</Note>
        )}
        <Card>
          <SuppliesRequestForm
            clientId={client.id}
            disabled={client.receivableStatus === "BLOCKED"}
            items={consumables.map((i) => ({
              value: i.id,
              label: `${i.itemCode} · ${i.name}${i.unit ? ` (${i.unit})` : ""}`,
            }))}
          />
        </Card>
      </div>
    </main>
  );
}
