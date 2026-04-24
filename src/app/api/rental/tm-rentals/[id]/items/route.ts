import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  handleFieldError,
  notFound,
  ok,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { computeTmProfit } from "@/lib/tm-profit";

type RouteContext = { params: Promise<{ id: string }> };

function parseDate(value: unknown): Date | null {
  const s = trimNonEmpty(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
function parseDecimal(value: unknown, min = 0): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < min) return null;
  return n.toFixed(2);
}

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const rental = await prisma.tmRental.findUnique({ where: { id }, select: { id: true } });
    if (!rental) return notFound();

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
      const serialNumber = requireString(p.serialNumber, "serialNumber");
      const { findSerialDuplicates } = await import("@/lib/sn-dupcheck");
      const dups = await findSerialDuplicates(serialNumber);
      const blocking = dups.filter((d) => d.source === "IT" || d.source === "TM");
      if (blocking.length > 0) {
        return badRequest("duplicate_serial", {
          message: `S/N "${serialNumber}" 이 이미 사용 중입니다: ${blocking.map((d) => `${d.source}/${d.ref}`).join(", ")}`,
        });
      }
      const startDate = parseDate(p.startDate);
      const endDate = parseDate(p.endDate);
      if (!startDate) return badRequest("invalid_input", { field: "startDate" });
      if (!endDate) return badRequest("invalid_input", { field: "endDate" });
      const salesPrice = parseDecimal(p.salesPrice);
      if (salesPrice === null) return badRequest("invalid_input", { field: "salesPrice" });
      const purchasePrice = parseDecimal(p.purchasePrice);
      const commission = parseDecimal(p.commission);

      const created = await prisma.tmRentalItem.create({
        data: {
          tmRentalId: id,
          itemId,
          options: trimNonEmpty(p.options),
          serialNumber,
          startDate,
          endDate,
          salesPrice,
          supplierName: trimNonEmpty(p.supplierName),
          purchasePrice,
          commission,
          profit: computeTmProfit(salesPrice, purchasePrice, commission),
        },
      });
      return ok({ item: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      return serverError(err);
    }
  });
}
