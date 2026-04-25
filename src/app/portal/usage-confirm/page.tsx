import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card, Note } from "@/components/ui";
import { PortalUsageConfirmForm } from "./portal-usage-confirm-form";

export const dynamic = "force-dynamic";

export default async function PortalUsageConfirmPage() {
  const session = await getSession();
  const L = session.language;
  if (session.role !== "CLIENT") {
    return <div className="p-8">고객 전용 페이지입니다.</div>;
  }
  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
  if (!user?.clientAccount) {
    return <div className="p-8">거래처가 연결되어 있지 않습니다.</div>;
  }
  const client = user.clientAccount;

  // 본 거래처의 ACTIVE IT 계약 + 미서명 빌링 모두 조회
  const billings = await prisma.itMonthlyBilling.findMany({
    where: {
      itContract: { clientId: client.id },
      customerSignature: null,
    },
    orderBy: [{ billingMonth: "desc" }, { serialNumber: "asc" }],
    take: 100,
    include: {
      itContract: {
        select: { id: true, contractNumber: true },
      },
    },
  });

  const grouped = new Map<string, typeof billings>();
  for (const b of billings) {
    const key = b.itContract.contractNumber;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(b);
  }

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/portal" className="text-[11px] font-bold text-[color:var(--tts-accent)]">{t("page.portal.back", L)}</Link>
        <h1 className="mt-1 mb-4 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.portal.usage", L)}</h1>

        {billings.length === 0 ? (
          <Card>
            <Note tone="info">미컨펌 빌링이 없습니다. 모든 월의 사용량 컨펌이 완료되어 있습니다.</Note>
          </Card>
        ) : (
          Array.from(grouped.entries()).map(([contractNumber, items]) => (
            <Card key={contractNumber} title={`계약 ${contractNumber}`} count={items.length}>
              <PortalUsageConfirmForm
                billings={items.map((b) => ({
                  id: b.id,
                  serialNumber: b.serialNumber,
                  billingMonth: b.billingMonth.toISOString().slice(0, 7),
                  counterBw: b.counterBw,
                  counterColor: b.counterColor,
                  computedAmount: b.computedAmount?.toString() ?? null,
                }))}
              />
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
