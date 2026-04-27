import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, trimNonEmpty } from "@/lib/api-utils";

// GET /api/portal/cal-certs?sn=&cert=&item=&from=&to=
//   본인 거래처의 교정성적서 (CALIBRATION 프로젝트 매출 + certNumber/certFileId 보유) 검색
export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "CLIENT") return badRequest("client_only");
    const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { clientAccount: true } });
    if (!user?.clientAccount) return badRequest("not_linked");

    const u = new URL(request.url);
    const sn   = trimNonEmpty(u.searchParams.get("sn"));
    const cert = trimNonEmpty(u.searchParams.get("cert"));
    const item = trimNonEmpty(u.searchParams.get("item"));
    const fromStr = trimNonEmpty(u.searchParams.get("from"));
    const toStr   = trimNonEmpty(u.searchParams.get("to"));

    const fromDate = fromStr ? new Date(fromStr) : null;
    const toDate   = toStr ? new Date(toStr + "T23:59:59") : null;

    const rows = await prisma.salesItem.findMany({
      where: {
        sales: { clientId: user.clientAccount.id, project: { salesType: "CALIBRATION" } },
        OR: [{ certNumber: { not: null } }, { certFileId: { not: null } }],
        ...(sn ? { serialNumber: { contains: sn, mode: "insensitive" as const } } : {}),
        ...(cert ? { certNumber: { contains: cert, mode: "insensitive" as const } } : {}),
        ...(item ? { item: { OR: [
          { itemCode: { contains: item, mode: "insensitive" as const } },
          { name:     { contains: item, mode: "insensitive" as const } },
        ]}} : {}),
        ...(fromDate || toDate ? {
          issuedAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate   ? { lte: toDate } : {}),
          },
        } : {}),
      },
      orderBy: { issuedAt: "desc" },
      take: 200,
      select: {
        id: true, serialNumber: true,
        certNumber: true, certFileId: true,
        issuedAt: true, nextDueAt: true,
        item: { select: { itemCode: true, name: true } },
      },
    });
    return ok({ certs: rows });
  });
}
