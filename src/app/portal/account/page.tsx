import { getSession } from "@/lib/session";
import { AccountClient } from "./account-client";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const s = await getSession();
  return <AccountClient lang={s.language} />;
}
