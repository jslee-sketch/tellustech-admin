import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ClosingsClient } from "./closings-client";

export const dynamic = "force-dynamic";

export default async function ClosingsPage() {
  const s = await getSession();
  if (s.role !== "ADMIN" && s.role !== "MANAGER") redirect("/");
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-extrabold">회계 마감</h1>
        <ClosingsClient role={s.role} />
      </div>
    </main>
  );
}
