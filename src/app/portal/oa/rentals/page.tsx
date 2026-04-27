import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { ServiceStatusView } from "../../service-status-view";

export const dynamic = "force-dynamic";

export default async function OARentalsPage() {
  const s = await getSession();
  return <ServiceStatusView type="oa_rental" lang={s.language} title={`📠 OA ${t("portal.sidebar.rentalStatus", s.language)}`} emptyMsg={t("portal.empty.oaRental", s.language)} emptyCtaQuote={t("portal.cta.oaRental", s.language)} />;
}
