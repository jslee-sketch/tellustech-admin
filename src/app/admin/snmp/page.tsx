import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { SnmpAdminClient } from "./snmp-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminSnmpPage() {
  const s = await getSession();
  if (s.role === "CLIENT") redirect("/portal");
  return <SnmpAdminClient lang={s.language} />;
}
