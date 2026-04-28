import Link from "next/link";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { ItemForm } from "../item-form";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const session = await getSession();
  const L = session.language;
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
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.items.new", L)}</h1>
        </div>
        <Card>
          <ItemForm
            mode="create"
            lang={L}
            initial={{ itemType: "", name: "", unit: "", category: "", expectedYield: "", yieldCoverageBase: "5" }}
          />
        </Card>
      </div>
    </main>
  );
}
