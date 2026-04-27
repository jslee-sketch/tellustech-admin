import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden, ok, serverError } from "@/lib/api-utils";

export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const items = await prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        referrerClient: { select: { clientCode: true, companyNameVi: true } },
        assignedTo: { select: { employeeCode: true, nameVi: true } },
      },
    });
    return ok({ items });
  });
}
