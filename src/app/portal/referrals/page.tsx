import { getSession } from "@/lib/session";
import { ReferralsClient } from "./referrals-client";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const s = await getSession();
  return <ReferralsClient lang={s.language} />;
}
