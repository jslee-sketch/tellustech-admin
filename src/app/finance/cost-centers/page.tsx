import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { CostCentersClient } from "./cost-centers-client";

export const dynamic = "force-dynamic";

export default async function CostCentersPage() {
  const session = await getSession();
  const L = session.language;
  const [centers, budgets] = await Promise.all([
    prisma.costCenter.findMany({ orderBy: { code: "asc" }, where: { isActive: true } }),
    prisma.budget.findMany({ orderBy: [{ yearMonth: "desc" }, { costCenterId: "asc" }], take: 200 }),
  ]);
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="mb-6 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("nav.costCenters", L)}</h1>
        <Card>
          <CostCentersClient
            centers={centers.map((c) => ({ id: c.id, code: c.code, name: c.name, centerType: c.centerType, projectType: c.projectType, isActive: c.isActive }))}
            budgets={budgets.map((b) => ({ id: b.id, costCenterId: b.costCenterId, yearMonth: b.yearMonth, budgetAmount: Number(b.budgetAmount), actualAmount: b.actualAmount ? Number(b.actualAmount) : null }))}
            lang={L}
          />
        </Card>
      </div>
    </main>
  );
}
