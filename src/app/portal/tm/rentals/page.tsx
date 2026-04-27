import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { ServiceStatusView } from "../../service-status-view";

export const dynamic = "force-dynamic";

export default async function TMRentalsPage() {
  const s = await getSession();
  return <ServiceStatusView type="tm_rental" lang={s.language} title={`🔬 TM ${t("portal.sidebar.rentalStatus", s.language)}`} emptyMsg={t("portal.empty.tmRental", s.language)} emptyCtaQuote={t("portal.cta.tmRental", s.language)} />;
}
