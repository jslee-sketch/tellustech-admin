import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { SurveysAdminClient } from "./surveys-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminSurveysPage() {
  const s = await getSession();
  if (s.role === "CLIENT") redirect("/portal");
  return <SurveysAdminClient lang={s.language} />;
}
