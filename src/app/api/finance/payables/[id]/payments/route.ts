import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, requireString, serverError, trimNonEmpty } from "@/lib/api-utils";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/finance/payables/[id]/payments
export async function GET(_r: Request, context: Ctx) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const pr = await prisma.payableReceivable.findUnique({ where: { id }, select: { id: true, amount: true, paidAmount: true, status: true, completedAt: true } });
    if (!pr) return notFound();
    const payments = await prisma.prPayment.findMany({
      where: { payableReceivableId: id },
      orderBy: { paidAt: "desc" },
      include: { recordedBy: { select: { employeeCode: true, nameVi: true, nameKo: true } } },
    });
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const remaining = Number(pr.amount) - totalPaid;
    return ok({
      pr: { ...pr, paidAmount: totalPaid.toFixed(2), remaining: remaining.toFixed(2) },
      payments,
    });
  });
}

// POST body: { amount, paidAt?, method?, reference?, note? }
//   누적 paidAmount 갱신 + status 자동 (OPEN/PARTIAL/PAID + completedAt)
export async function POST(request: Request, context: Ctx) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const pr = await prisma.payableReceivable.findUnique({ where: { id } });
    if (!pr) return notFound();
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const amountStr = requireString(p.amount, "amount");
      const amountN = Number(amountStr);
      if (!Number.isFinite(amountN) || amountN <= 0) return badRequest("invalid_input", { field: "amount" });

      const paidAt = trimNonEmpty(p.paidAt) ? new Date(String(p.paidAt)) : new Date();
      const recordedById = session.empCode
        ? (await prisma.employee.findUnique({ where: { companyCode_employeeCode: { companyCode: session.companyCode, employeeCode: session.empCode } }, select: { id: true } }))?.id ?? null
        : null;

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.prPayment.create({
          data: {
            payableReceivableId: id,
            amount: amountN.toFixed(2),
            paidAt,
            method: trimNonEmpty(p.method),
            reference: trimNonEmpty(p.reference),
            note: trimNonEmpty(p.note),
            recordedById,
          },
        });
        // 누적 + 상태 자동
        const all = await tx.prPayment.findMany({ where: { payableReceivableId: id }, select: { amount: true } });
        const totalPaid = all.reduce((s, x) => s + Number(x.amount), 0);
        const totalAmount = Number(pr.amount);
        const remaining = totalAmount - totalPaid;
        const newStatus = remaining <= 0 ? "PAID" : (totalPaid > 0 ? "PARTIAL" : "OPEN");
        const updated = await tx.payableReceivable.update({
          where: { id },
          data: {
            paidAmount: totalPaid.toFixed(2),
            status: newStatus,
            completedAt: newStatus === "PAID" ? (pr.completedAt ?? new Date()) : null,
          },
        });
        return { payment, pr: updated, totalPaid: totalPaid.toFixed(2), remaining: Math.max(0, remaining).toFixed(2) };
      });
      return ok(result, { status: 201 });
    } catch (err) { return serverError(err); }
  });
}
