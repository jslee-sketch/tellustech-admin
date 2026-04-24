import Link from "next/link";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { WarehouseForm } from "../warehouse-form";

export const dynamic = "force-dynamic";

export default async function NewWarehousePage() {
  await getSession();
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/master/warehouses"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            ← 창고 목록
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">창고 등록</h1>
        </div>
        <Card>
          <WarehouseForm
            mode="create"
            initial={{ code: "", name: "", warehouseType: "", branchType: "", location: "" }}
          />
        </Card>
      </div>
    </main>
  );
}
