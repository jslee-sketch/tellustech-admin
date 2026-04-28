import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { YieldAdminClient } from "./yield-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminYieldAnalysisPage() {
  const s = await getSession();
  if (s.role !== "ADMIN") redirect("/");
  return <YieldAdminClient lang={s.language} />;
}
