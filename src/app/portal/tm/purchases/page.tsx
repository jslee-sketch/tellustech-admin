import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { ServiceStatusView } from "../../service-status-view";

export const dynamic = "force-dynamic";

export default async function TMPurchasesPage() {
  const s = await getSession();
  return <ServiceStatusView type="purchase" lang={s.language} title={`💼 ${t("portal.sidebar.purchaseStatus", s.language)}`} emptyMsg={t("portal.empty.purchase", s.language)} emptyCtaQuote={t("portal.cta.purchase", s.language)} />;
}
