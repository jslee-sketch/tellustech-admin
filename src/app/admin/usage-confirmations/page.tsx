import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { UsageConfirmAdminClient } from "./usage-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminUsageConfirmPage() {
  const s = await getSession();
  if (s.role === "CLIENT") redirect("/portal");
  return <UsageConfirmAdminClient lang={s.language} />;
}
