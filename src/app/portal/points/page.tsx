import { getSession } from "@/lib/session";
import { PointsClient } from "./points-client";

export const dynamic = "force-dynamic";

export default async function PortalPointsPage() {
  const s = await getSession();
  return <PointsClient lang={s.language} />;
}
