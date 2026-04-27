import Link from "next/link";
import { getSession } from "@/lib/session";
import { CalCertsClient } from "./cal-certs-client";

export const dynamic = "force-dynamic";

export default async function PortalCalCertsPage() {
  const session = await getSession();
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/portal" className="text-[11px] font-bold text-[color:var(--tts-accent)]">← 포탈 / Cổng KH</Link>
        <h1 className="mt-1 mb-3 text-2xl font-extrabold">교정성적서 / Chứng chỉ hiệu chuẩn</h1>
        <CalCertsClient lang={session.language} />
      </div>
    </main>
  );
}
