import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ItemsClient } from "./items-client";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  await getSession();
  const items = await prisma.item.findMany({
    orderBy: { itemCode: "desc" },
    take: 500,
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
            기초등록 · 품목
            <span className="ml-3 rounded bg-[color:var(--tts-accent-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-accent)]">
              공유 마스터
            </span>
          </h1>
        </div>
        <ItemsClient
          initialData={items.map((i) => ({
            id: i.id,
            itemCode: i.itemCode,
            itemType: i.itemType,
            name: i.name,
            unit: i.unit,
            category: i.category,
          }))}
        />
      </div>
    </main>
  );
}
