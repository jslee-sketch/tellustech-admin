import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  notFound,
  ok,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { recalcSalesTotalsInTx } from "@/lib/sales-recalc";

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

// 매출 품목 라인 중첩 리소스.
// POST 시 라인 추가 + sales.totalAmount 합계 + PayableReceivable.amount 동기화.

type RouteContext = { params: Promise<{ id: string }> };

function parseDecimal(value: unknown, min = 0): string | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) return null;
  return n.toFixed(2);
}

function parseQty(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(3);
}

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const sales = await prisma.sales.findUnique({ where: { id }, select: { id: true } });
    if (!sales) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const itemId = requireString(p.itemId, "itemId");
      const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
      if (!item) return badRequest("invalid_item");
      const quantity = parseQty(p.quantity);
      if (!quantity) return badRequest("invalid_input", { field: "quantity" });
      const unitPrice = parseDecimal(p.unitPrice);
      if (unitPrice === null) return badRequest("invalid_input", { field: "unitPrice" });
      const amount = (Number(quantity) * Number(unitPrice)).toFixed(2);

      // 교정(CALIBRATION) 프로젝트인 경우 라인별 성적서 필드. 모두 옵션 — 추후 발급 가능.
      const certFileId = trimNonEmpty(p.certFileId);
      if (certFileId) {
        const f = await prisma.file.findUnique({ where: { id: certFileId }, select: { id: true } });
        if (!f) return badRequest("invalid_file");
      }
      const issuedAtStr = trimNonEmpty(p.issuedAt);
      const issuedAt = issuedAtStr ? new Date(issuedAtStr) : null;
      if (issuedAtStr && (!issuedAt || Number.isNaN(issuedAt.getTime()))) {
        return badRequest("invalid_input", { field: "issuedAt" });
      }
      const nextDueAt = issuedAt ? addMonths(issuedAt, 11) : null;

      // 라인별 기간 (MAINTENANCE/RENTAL). 비어있으면 null — 서버가 헤더 기본값을 강제하지 않음 (UI 가 담당).
      const startStr = trimNonEmpty(p.startDate);
      const endStr = trimNonEmpty(p.endDate);
      const startDate = startStr ? new Date(startStr) : null;
      const endDate = endStr ? new Date(endStr) : null;
      if (startStr && (!startDate || Number.isNaN(startDate.getTime()))) return badRequest("invalid_input", { field: "startDate" });
      if (endStr && (!endDate || Number.isNaN(endDate.getTime()))) return badRequest("invalid_input", { field: "endDate" });

      const result = await prisma.$transaction(async (tx) => {
        const created = await tx.salesItem.create({
          data: {
            salesId: id,
            itemId,
            serialNumber: trimNonEmpty(p.serialNumber),
            quantity,
            unitPrice,
            amount,
            startDate,
            endDate,
            certNumber: trimNonEmpty(p.certNumber),
            certFileId: certFileId ?? null,
            issuedAt,
            nextDueAt,
          },
        });
        await recalcSalesTotalsInTx(tx, id);
        return created;
      });
      return ok({ item: result }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_cert_number", { message: "동일한 성적서 번호가 이미 존재합니다." });
      return serverError(err);
    }
  });
}
