import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PortalPointsAdminClient } from "./portal-points-client";

export const dynamic = "force-dynamic";

export default async function AdminPortalPointsPage() {
  const s = await getSession();
  if (s.role !== "ADMIN" && s.role !== "MANAGER") redirect("/");
  return <PortalPointsAdminClient lang={s.language} canEditConfig={s.role === "ADMIN"} />;
}
