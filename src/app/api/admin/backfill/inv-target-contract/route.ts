import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";

// POST /api/admin/backfill/inv-target-contract
// 기존 InventoryTransaction 행 중 targetEquipmentSN 가 있고 targetContractId 가
// 비어있는 것을 일괄 매핑. 활성 IT 계약 장비 매칭 시에만 채움.
// ADMIN/MANAGER 전용. 멱등 — 이미 매핑된 행은 건드리지 않음.

export async function POST() {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") {
      return badRequest("forbidden");
    }
    try {
      const stale = await prisma.inventoryTransaction.findMany({
        where: { targetEquipmentSN: { not: null }, targetContractId: null },
        select: { id: true, targetEquipmentSN: true },
        take: 1000,
      });
      let updated = 0;
      const skipped: string[] = [];
      for (const row of stale) {
        if (!row.targetEquipmentSN) continue;
        const eq = await prisma.itContractEquipment.findFirst({
          where: { serialNumber: row.targetEquipmentSN, removedAt: null },
          select: { itContractId: true },
        });
        if (!eq) {
          skipped.push(row.id);
          continue;
        }
        await prisma.inventoryTransaction.update({
          where: { id: row.id },
          data: { targetContractId: eq.itContractId },
        });
        updated++;
      }
      return ok({ scanned: stale.length, updated, skipped: skipped.length });
    } catch (err) {
      return serverError(err);
    }
  });
}
