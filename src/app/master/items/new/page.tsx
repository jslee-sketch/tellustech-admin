import Link from "next/link";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { ItemForm } from "../item-form";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  await getSession();
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/master/items"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            ← 품목 목록
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">품목 등록</h1>
        </div>
        <Card>
          <ItemForm
            mode="create"
            initial={{ itemType: "", name: "", unit: "", category: "" }}
          />
        </Card>
      </div>
    </main>
  );
}
