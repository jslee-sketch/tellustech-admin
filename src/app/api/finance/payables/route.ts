import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import type { Prisma, PayableReceivableKind, PayableReceivableStatus } from "@/generated/prisma/client";

// 미수금/미지급금 리스트 조회. 쿼리 파라미터로 필터:
//   ?kind=RECEIVABLE|PAYABLE
//   ?status=OPEN|PARTIAL|PAID|WRITTEN_OFF|OVERDUE       ← OVERDUE 는 dueDate < today AND status != PAID 로 합성
//   ?code=문자열                                         ← salesNumber / purchaseNumber / expenseCode 부분일치
//   ?clientId=...                                        ← 매출의 client 또는 매입의 supplier
//   ?createdFrom=YYYY-MM-DD&createdTo=YYYY-MM-DD         ← createdAt 범위
//   ?dueFrom=YYYY-MM-DD&dueTo=YYYY-MM-DD                 ← dueDate 범위

const VALID_KINDS: PayableReceivableKind[] = ["RECEIVABLE", "PAYABLE"];
const VALID_STATUSES: PayableReceivableStatus[] = ["OPEN", "PARTIAL", "PAID", "WRITTEN_OFF"];

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  return withSessionContext(async () => {
    try {
      const url = new URL(req.url);
      const sp = url.searchParams;

      const kind = sp.get("kind");
      const status = sp.get("status");
      const code = (sp.get("code") || "").trim();
      const clientId = sp.get("clientId");
      const createdFrom = parseDate(sp.get("createdFrom"));
      const createdTo = parseDate(sp.get("createdTo"));
      const dueFrom = parseDate(sp.get("dueFrom"));
      const dueTo = parseDate(sp.get("dueTo"));

      const where: Prisma.PayableReceivableWhereInput = {};
      if (kind && VALID_KINDS.includes(kind as PayableReceivableKind)) {
        where.kind = kind as PayableReceivableKind;
      } else if (kind && kind !== "ALL") {
        return badRequest("invalid_kind");
      }

      if (status === "OVERDUE") {
        // OVERDUE = dueDate < today AND status in (OPEN, PARTIAL)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        where.dueDate = { lt: today };
        where.status = { in: ["OPEN", "PARTIAL"] };
      } else if (status && VALID_STATUSES.includes(status as PayableReceivableStatus)) {
        where.status = status as PayableReceivableStatus;
      } else if (status && status !== "ALL") {
        return badRequest("invalid_status");
      }

      if (code) {
        where.OR = [
          { sales: { is: { salesNumber: { contains: code, mode: "insensitive" } } } },
          { purchase: { is: { purchaseNumber: { contains: code, mode: "insensitive" } } } },
          { expense: { is: { expenseCode: { contains: code, mode: "insensitive" } } } },
        ];
      }

      if (clientId) {
        const orForClient: Prisma.PayableReceivableWhereInput[] = [
          { sales: { is: { clientId } } },
          { purchase: { is: { supplierId: clientId } } },
        ];
        // code 와 clientId 가 동시에 있으면 AND 로 묶기 위해 AND 합성
        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: orForClient }];
          delete where.OR;
        } else {
          where.OR = orForClient;
        }
      }

      const createdAtRange: Prisma.DateTimeFilter = {};
      if (createdFrom) createdAtRange.gte = createdFrom;
      if (createdTo) {
        const end = new Date(createdTo);
        end.setHours(23, 59, 59, 999);
        createdAtRange.lte = end;
      }
      if (Object.keys(createdAtRange).length > 0) where.createdAt = createdAtRange;

      const dueRange: Prisma.DateTimeFilter = {};
      if (dueFrom) dueRange.gte = dueFrom;
      if (dueTo) {
        const end = new Date(dueTo);
        end.setHours(23, 59, 59, 999);
        dueRange.lte = end;
      }
      if (Object.keys(dueRange).length > 0) {
        // OVERDUE 분기에서 이미 dueDate.lt 가 셋팅된 경우 충돌 방지: AND 로 합성
        if (where.dueDate) {
          const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
          where.AND = [...existingAnd, { dueDate: dueRange }];
        } else {
          where.dueDate = dueRange;
        }
      }

      const rows = await prisma.payableReceivable.findMany({
        where,
        orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }],
        take: 500,
        select: {
          id: true,
          kind: true,
          status: true,
          amount: true,
          paidAmount: true,
          dueDate: true,
          revisedDueDate: true,
          createdAt: true,
          sales: { select: { salesNumber: true, client: { select: { id: true, clientCode: true, companyNameVi: true, receivableStatus: true } } } },
          purchase: { select: { purchaseNumber: true, supplier: { select: { id: true, clientCode: true, companyNameVi: true, receivableStatus: true } } } },
          expense: { select: { expenseCode: true } },
        },
      });

      const data = rows.map((r) => {
        const partner = r.sales?.client ?? r.purchase?.supplier ?? null;
        const revised = r.revisedDueDate ?? r.dueDate;
        return {
          id: r.id,
          kind: r.kind,
          status: r.status,
          clientId: partner?.id ?? null,
          clientLabel: partner ? `${partner.clientCode} · ${partner.companyNameVi}` : "—",
          clientBlocked: partner?.receivableStatus === "BLOCKED",
          ref: r.sales?.salesNumber ?? r.purchase?.purchaseNumber ?? r.expense?.expenseCode ?? "—",
          amount: r.amount.toString(),
          paidAmount: r.paidAmount.toString(),
          outstanding: (Number(r.amount) - Number(r.paidAmount)).toFixed(2),
          dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
          revisedDueDate: revised ? revised.toISOString().slice(0, 10) : null,
          createdAt: r.createdAt.toISOString().slice(0, 10),
        };
      });

      return ok({ rows: data });
    } catch (e) {
      return serverError(e);
    }
  });
}
