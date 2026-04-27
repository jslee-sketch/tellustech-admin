import { getSession } from "@/lib/session";
import { FeedbackClient } from "./feedback-client";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const s = await getSession();
  return <FeedbackClient lang={s.language} />;
}
