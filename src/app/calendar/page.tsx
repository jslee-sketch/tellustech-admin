import Link from "next/link";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { CalendarClient } from "./calendar-client";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await getSession();
  const L = session.language;
  if (session.role === "CLIENT") return <div className="p-8">{t("label.cannotAccessFromPortal", L)}</div>;
  const canManage = ["ADMIN", "MANAGER"].includes(session.role);

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <Link href="/" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">TELLUSTECH ERP</Link>
            <h1 className="mt-1 text-2xl font-extrabold">{t("page.calendar.title", L)}</h1>
          </div>
        </div>
        <Card>
          <CalendarClient lang={L} canManage={canManage} />
        </Card>
      </div>
    </main>
  );
}
