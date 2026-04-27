import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { ServiceStatusView } from "../../service-status-view";

export const dynamic = "force-dynamic";

export default async function TMRepairsPage() {
  const s = await getSession();
  return <ServiceStatusView type="repair" lang={s.language} title={`🔧 ${t("portal.sidebar.repairStatus", s.language)}`} emptyMsg={t("portal.empty.repair", s.language)} emptyCtaQuote={t("portal.cta.repair", s.language)} />;
}
