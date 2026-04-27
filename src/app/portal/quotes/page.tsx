import { getSession } from "@/lib/session";
import { QuotesClient } from "./quotes-client";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const s = await getSession();
  return <QuotesClient lang={s.language} />;
}
