import Link from "next/link";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { WarehouseForm } from "../warehouse-form";

export const dynamic = "force-dynamic";

export default async function NewWarehousePage() {
  const session = await getSession();
  const L = session.language;
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
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.warehouses.new", L)}</h1>
        </div>
        <Card>
          <WarehouseForm
            mode="create"
            lang={L}
            initial={{ code: "", name: "", warehouseType: "", branchType: "", location: "" }}
          />
        </Card>
      </div>
    </main>
  );
}
