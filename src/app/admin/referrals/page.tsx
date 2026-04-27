import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ReferralsAdminClient } from "./referrals-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const s = await getSession();
  if (s.role === "CLIENT") redirect("/portal");
  return <ReferralsAdminClient lang={s.language} />;
}
