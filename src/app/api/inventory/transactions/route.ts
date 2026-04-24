import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  companyScope,
  handleFieldError,
  ok,
  optionalEnum,
  requireEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import type { InventoryReason, InventoryTxnType } from "@/generated/prisma/client";

const TXN_TYPES: readonly InventoryTxnType[] = ["IN", "OUT"] as const;
const REASONS: readonly InventoryReason[] = [
  "PURCHASE",
  "CALIBRATION",
  "REPAIR",
  "RENTAL",
  "DEMO",
  "RETURN",
  "CONSUMABLE_OUT",
] as const;

function parseIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function GET(request: Request) {
  return withSessionContext(async (session) => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const itemId = trimNonEmpty(url.searchParams.get("item"));
    const warehouseId = trimNonEmpty(url.searchParams.get("warehouse"));
    const txnType = optionalEnum(url.searchParams.get("type"), TXN_TYPES);
    const reason = optionalEnum(url.searchParams.get("reason"), REASONS);

    const where = {
      ...companyScope(session),
      ...(itemId ? { itemId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(txnType ? { txnType } : {}),
      ...(reason ? { reason } : {}),
      ...(q
        ? {
            OR: [
              { serialNumber: { contains: q, mode: "insensitive" as const } },
              { scannedBarcode: { contains: q, mode: "insensitive" as const } },
              { item: { itemCode: { contains: q, mode: "insensitive" as const } } },
              { item: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      orderBy: { performedAt: "desc" },
      take: 500,
      include: {
        item: { select: { id: true, itemCode: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });
    return ok({ transactions });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const itemId = requireString(p.itemId, "itemId");
      const warehouseId = requireString(p.warehouseId, "warehouseId");
      const txnType = requireEnum(p.txnType, TXN_TYPES, "txnType");
      const reason = requireEnum(p.reason, REASONS, "reason");
      const quantity = parseIntOrNull(p.quantity);
      if (!quantity) return badRequest("invalid_input", { field: "quantity" });

      const [item, warehouse] = await Promise.all([
        prisma.item.findUnique({ where: { id: itemId }, select: { id: true } }),
        prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { id: true } }),
      ]);
      if (!item) return badRequest("invalid_item");
      if (!warehouse) return badRequest("invalid_warehouse");

      const created = await prisma.inventoryTransaction.create({
        data: {
          companyCode: session.companyCode,
          itemId,
          warehouseId,
          serialNumber: trimNonEmpty(p.serialNumber),
          txnType,
          reason,
          quantity,
          scannedBarcode: trimNonEmpty(p.scannedBarcode),
          note: trimNonEmpty(p.note),
          performedById: session.empCode ? undefined : undefined, // performedById is a string, not linked to Employee FK — stored as-is
          performedAt: new Date(),
        },
      });
      return ok({ transaction: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      return serverError(err);
    }
  });
}
