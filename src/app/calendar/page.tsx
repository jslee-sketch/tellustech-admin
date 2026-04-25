import Link from "next/link";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";
import { CalendarClient } from "./calendar-client";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await getSession();
  if (session.role === "CLIENT") return <div className="p-8">고객 포탈에서 접근할 수 없습니다.</div>;
  const canManage = ["ADMIN", "MANAGER"].includes(session.role);

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
            <h1 className="mt-1 text-2xl font-extrabold">캘린더</h1>
          </div>
        </div>
        <Card>
          <CalendarClient canManage={canManage} />
        </Card>
      </div>
    </main>
  );
}
