import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { QuotesAdminClient } from "./quotes-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminQuotesPage() {
  const s = await getSession();
  if (s.role === "CLIENT") redirect("/portal");
  return <QuotesAdminClient lang={s.language} />;
}
