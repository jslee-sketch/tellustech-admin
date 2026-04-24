import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { forbidden, ok, trimNonEmpty } from "@/lib/api-utils";

// GET /api/admin/audit-logs
// ADMIN 전용. 모든 업무 테이블의 INSERT/UPDATE/DELETE 기록 조회.
// 쿼리: ?table=Sales&action=UPDATE&recordId=...&limit=200&offset=0
export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN") return forbidden();
    const url = new URL(request.url);
    const table = trimNonEmpty(url.searchParams.get("table"));
    const action = trimNonEmpty(url.searchParams.get("action"));
    const recordId = trimNonEmpty(url.searchParams.get("recordId"));
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 200), 1), 1000);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

    const where = {
      ...(table ? { tableName: table } : {}),
      ...(action ? { action } : {}),
      ...(recordId ? { recordId } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        take: limit,
        skip: offset,
        include: { user: { select: { username: true, role: true } } },
      }),
    ]);

    return ok({ total, limit, offset, logs: rows });
  });
}
