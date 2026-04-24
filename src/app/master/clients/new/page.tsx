import Link from "next/link";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { ClientNewForm } from "./client-new-form";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  await getSession();
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/master/clients"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            ← 거래처 목록
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">거래처 등록</h1>
        </div>
        <Card>
          <ClientNewForm />
        </Card>
      </div>
    </main>
  );
}
