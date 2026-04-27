import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { FeedbackAdminClient } from "./feedback-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const s = await getSession();
  if (s.role === "CLIENT") redirect("/portal");
  return <FeedbackAdminClient lang={s.language} />;
}
