import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-utils";
import { calculateUsageForContract } from "@/lib/usage-calc";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";

// GET /api/usage-confirmations — 목록 (관리자/영업)
//   필터: ?contractId= &clientId= &billingMonth= &status=
export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const url = new URL(request.url);
    const where: any = {};
    const cid = url.searchParams.get("contractId"); if (cid) where.contractId = cid;
    const clid = url.searchParams.get("clientId"); if (clid) where.clientId = clid;
    const bm = url.searchParams.get("billingMonth"); if (bm) where.billingMonth = bm;
    const st = url.searchParams.get("status"); if (st) where.status = st;
    try {
      const items = await prisma.usageConfirmation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          contract: { select: { contractNumber: true } },
          client: { select: { clientCode: true, companyNameVi: true } },
        },
      });
      return ok({ items });
    } catch (e) { return serverError(e); }
  });
}

// POST /api/usage-confirmations — 신규 생성 (자동 계산)
// body: { contractId, billingMonth }
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    let body: any;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const contractId = String(body?.contractId ?? "").trim();
    const billingMonth = String(body?.billingMonth ?? "").trim();
    if (!contractId || !/^\d{4}-\d{2}$/.test(billingMonth)) return badRequest("invalid_input");

    const contract = await prisma.itContract.findUnique({ where: { id: contractId } });
    if (!contract) return badRequest("contract_not_found");

    // 중복 방지 — 같은 (contractId, billingMonth) 가 이미 있으면 거절
    const existing = await prisma.usageConfirmation.findFirst({ where: { contractId, billingMonth } });
    if (existing) return badRequest("already_exists", { id: existing.id });

    try {
      const usage = await calculateUsageForContract(contractId, billingMonth);
      const totalAmount = usage.reduce((s, e) => s + e.subtotal, 0);

      const created = await withUniqueRetry(
        () => generateDatedCode({
          prefix: "UC", digits: 3,
          lookupLast: async (full) => {
            const last = await prisma.usageConfirmation.findFirst({ where: { confirmCode: { startsWith: full } }, orderBy: { confirmCode: "desc" }, select: { confirmCode: true } });
            return last?.confirmCode ?? null;
          },
        }).then((confirmCode) => prisma.usageConfirmation.create({
          data: {
            confirmCode,
            contractId,
            clientId: contract.clientId,
            billingMonth,
            periodStart: new Date(`${billingMonth}-01T00:00:00`),
            periodEnd: new Date(new Date(`${billingMonth}-01T00:00:00`).getFullYear(), Number(billingMonth.split("-")[1]), 0, 23, 59, 59, 999),
            equipmentUsage: usage as any,
            totalAmount: totalAmount.toFixed(2),
            status: "COLLECTED",
            companyCode: "TV",
          },
        })),
        { isConflict: () => true },
      );
      return ok({ usageConfirmation: created }, { status: 201 });
    } catch (e) { return serverError(e); }
  });
}
