import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { ServiceStatusView } from "../../service-status-view";

export const dynamic = "force-dynamic";

export default async function TMMaintenancePage() {
  const s = await getSession();
  return <ServiceStatusView type="maintenance" lang={s.language} title={`🛠️ ${t("portal.sidebar.maintenanceStatus", s.language)}`} emptyMsg={t("portal.empty.maintenance", s.language)} emptyCtaQuote={t("portal.cta.maintenance", s.language)} />;
}
