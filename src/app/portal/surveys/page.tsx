import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { ComingSoonView } from "../coming-soon-view";

export const dynamic = "force-dynamic";

export default async function SurveysPage() {
  const s = await getSession();
  return <ComingSoonView lang={s.language} title={`📊 ${t("portal.sidebar.surveys", s.language)}`} />;
}
