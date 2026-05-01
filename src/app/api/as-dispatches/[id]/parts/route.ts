import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, handleFieldError, notFound, ok, requireString, serverError, trimNonEmpty } from "@/lib/api-utils";
import { resolveUnitCost } from "@/lib/cost-tracker";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/as-dispatches/[id]/parts
export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const parts = await prisma.asDispatchPart.findMany({
      where: { asDispatchId: id },
      orderBy: { createdAt: "asc" },
      include: {
        item: { select: { itemCode: true, name: true, itemType: true } },
        inventoryTxn: { select: { id: true, fromWarehouseId: true } },
      },
    });
    return ok({ parts });
  });
}

// POST /api/as-dispatches/[id]/parts
//   body: { itemId, serialNumber?, quantity, targetEquipmentSN, fromWarehouseId, note?, unitCost? }
//   처리: 재고확인 → 매입원가 자동조회 → InventoryTransaction(OUT) 자동생성 → AsDispatchPart 저장
export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    const dispatch = await prisma.asDispatch.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!dispatch) return notFound();

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;

    try {
      const itemId = requireString(p.itemId, "itemId");
      const targetEquipmentSN = requireString(p.targetEquipmentSN, "targetEquipmentSN");
      const fromWarehouseId = requireString(p.fromWarehouseId, "fromWarehouseId");
      const serialNumber = trimNonEmpty(p.serialNumber);
      const note = trimNonEmpty(p.note);
      const quantity = Math.max(1, Math.round(Number(p.quantity ?? 1)));
      if (!Number.isFinite(quantity) || quantity < 1) return badRequest("invalid_input", { field: "quantity" });

      // 1) 존재성
      const [item, warehouse] = await Promise.all([
        prisma.item.findUnique({ where: { id: itemId }, select: { id: true } }),
        prisma.warehouse.findUnique({ where: { id: fromWarehouseId }, select: { id: true } }),
      ]);
      if (!item) return badRequest("invalid_item");
      if (!warehouse) return badRequest("invalid_warehouse");

      // 2) 재고 확인 — fromWarehouseId 의 (item, S/N or 전체) 잔량
      // S/N 있으면: 해당 S/N의 마지막 트랜잭션이 toWarehouse=fromWarehouseId 여야 사용 가능
      // S/N 없으면: 해당 창고의 (item) 누적 to - from 이 수량 이상이어야 함
      if (serialNumber) {
        const last = await prisma.inventoryTransaction.findFirst({
          where: { serialNumber },
          orderBy: { performedAt: "desc" },
          select: { txnType: true, toWarehouseId: true, fromWarehouseId: true },
        });
        const inWarehouse = last && last.txnType !== "OUT" && last.toWarehouseId === fromWarehouseId;
        if (!inWarehouse) return badRequest("insufficient_stock", { reason: "serial_not_in_warehouse" });
      } else {
        const [ins, outs] = await Promise.all([
          prisma.inventoryTransaction.aggregate({
            where: { itemId, toWarehouseId: fromWarehouseId },
            _sum: { quantity: true },
          }),
          prisma.inventoryTransaction.aggregate({
            where: { itemId, fromWarehouseId },
            _sum: { quantity: true },
          }),
        ]);
        const onHand = Number(ins._sum.quantity ?? 0) - Number(outs._sum.quantity ?? 0);
        if (onHand < quantity) {
          return badRequest("insufficient_stock", { reason: "qty_short", onHand, requested: quantity });
        }
      }

      // 3) 매입원가 자동조회 (수동값 있으면 우선)
      let unitCost = p.unitCost !== undefined ? Number(p.unitCost) : null;
      if (unitCost === null || !Number.isFinite(unitCost)) {
        unitCost = await resolveUnitCost(itemId, serialNumber);
      }
      const totalCost = unitCost !== null ? unitCost * quantity : null;

      // 4) targetContractId 자동조회 — 활성 IT 계약의 장비 매핑
      const eq = await prisma.itContractEquipment.findFirst({
        where: { serialNumber: targetEquipmentSN },
        select: { itContractId: true },
      });
      const targetContractId = eq?.itContractId ?? null;

      // 5) 트랜잭션: InventoryTransaction(OUT) + AsDispatchPart
      const result = await prisma.$transaction(async (tx) => {
        const inv = await tx.inventoryTransaction.create({
          data: {
            companyCode: session.companyCode,
            itemId,
            fromWarehouseId,
            toWarehouseId: null,
            serialNumber: serialNumber ?? null,
            txnType: "OUT" as const,
            reason: "CONSUMABLE_OUT" as const,
            // Phase 1 4축 분류
            referenceModule: "CONSUMABLE",
            subKind: "CONSUMABLE",
            quantity,
            targetEquipmentSN,
            targetContractId,
            note: `[자동] AS 출동 부품 사용`,
            performedAt: new Date(),
          },
        });
        const part = await tx.asDispatchPart.create({
          data: {
            asDispatchId: id,
            itemId,
            serialNumber: serialNumber ?? null,
            quantity,
            targetEquipmentSN,
            targetContractId,
            unitCost: unitCost !== null ? unitCost.toFixed(2) : null,
            totalCost: totalCost !== null ? totalCost.toFixed(2) : null,
            inventoryTxnId: inv.id,
            note: note ?? null,
          },
          include: { item: { select: { itemCode: true, name: true } } },
        });
        return part;
      });

      return ok({ part: result }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      return serverError(err);
    }
  });
}
