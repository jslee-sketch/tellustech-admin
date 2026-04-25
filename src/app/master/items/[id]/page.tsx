import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { ItemForm } from "../item-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditItemPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const L = session.language;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/master/items"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            {t("page.items.back", L)}
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            {t("page.items.detail", L)}
            <span className="ml-3 font-mono text-[13px] text-[color:var(--tts-primary)]">{item.itemCode}</span>
          </h1>
        </div>
        <Card>
          <ItemForm
            mode="edit"
            lang={L}
            initial={{
              id: item.id,
              itemCode: item.itemCode,
              itemType: item.itemType,
              name: item.name,
              unit: item.unit ?? "",
              category: item.category ?? "",
            }}
          />
        </Card>
      </div>
    </main>
  );
}
