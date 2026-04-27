import { getSession } from "@/lib/session";
import { SurveysClient } from "./surveys-client";

export const dynamic = "force-dynamic";

export default async function SurveysPage() {
  const s = await getSession();
  return <SurveysClient lang={s.language} />;
}
