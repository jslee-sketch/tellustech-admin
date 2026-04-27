import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ItemCompatClient } from "./item-compat-client";

export const dynamic = "force-dynamic";

export default async function ItemCompatPage() {
  const s = await getSession();
  if (s.role !== "ADMIN" && s.role !== "MANAGER") redirect("/");
  const items = await prisma.item.findMany({
    orderBy: { itemCode: "asc" },
    select: { id: true, itemCode: true, name: true, itemType: true, category: true },
    take: 1000,
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-3 text-2xl font-extrabold">호환 매핑 / Tương thích vật tư</h1>
        <p className="mb-4 text-[12px] text-[color:var(--tts-sub)]">
          본체 장비(PRODUCT) ↔ 호환 소모품/부품(CONSUMABLE/PART) 매핑.
          포탈에서 고객은 자신의 장비에 호환되는 소모품만 요청 가능.
        </p>
        <ItemCompatClient items={items} />
      </div>
    </main>
  );
}
