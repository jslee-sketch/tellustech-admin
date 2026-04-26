import { getSession } from "@/lib/session";
import { StatsClient } from "./stats-client";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const session = await getSession();
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-4 text-2xl font-extrabold">통계</h1>
        <StatsClient lang={session.language} />
      </div>
    </main>
  );
}
