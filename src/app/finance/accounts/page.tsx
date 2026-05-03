import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { AccountsClient } from "./accounts-client";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await getSession();
  const L = session.language;
  const accounts = await prisma.bankAccount.findMany({ orderBy: { accountCode: "asc" } });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="mb-6 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("nav.cashAccounts", L)}</h1>
        <Card>
          <AccountsClient accounts={accounts.map((a) => ({
            id: a.id, accountCode: a.accountCode, accountName: a.accountName,
            bankName: a.bankName, accountNumber: a.accountNumber,
            currency: a.currency, accountType: a.accountType,
            currentBalance: a.currentBalance ? Number(a.currentBalance) : 0,
            isActive: a.isActive,
          }))} lang={L} />
        </Card>
      </div>
    </main>
  );
}
