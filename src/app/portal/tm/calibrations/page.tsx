import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { ServiceStatusView } from "../../service-status-view";

export const dynamic = "force-dynamic";

export default async function TMCalibrationsPage() {
  const s = await getSession();
  return <ServiceStatusView type="calibration" lang={s.language} title={`📐 ${t("portal.sidebar.calibrationStatus", s.language)}`} emptyMsg={t("portal.empty.calibration", s.language)} emptyCtaQuote={t("portal.cta.calibration", s.language)} />;
}
