import "server-only";
import { prisma } from "./prisma";

/**
 * Phase 2.A — record edit/delete/lock policy.
 *
 * Single source of truth for "이 레코드를 지금 수정/삭제/잠금 해제할 수 있나?".
 * Module-specific rules live HERE, not scattered across route handlers.
 *
 * Convention:
 *   - `lockedAt != null`  → record is locked. Edit/Delete denied unless explicit unlock.
 *   - `deletedAt != null` → record is soft-deleted. Treated as not-found by default queries.
 */

export type PolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

export type RecordWithLock = {
  deletedAt?: Date | null;
  lockedAt?: Date | null;
  lockReason?: string | null;
};

export function canEdit(record: RecordWithLock | null): PolicyDecision {
  if (!record) return { allowed: false, reason: "not_found" };
  if (record.deletedAt) return { allowed: false, reason: "deleted" };
  if (record.lockedAt) return { allowed: false, reason: record.lockReason ?? "locked" };
  return { allowed: true };
}

export function canDelete(record: RecordWithLock | null): PolicyDecision {
  if (!record) return { allowed: false, reason: "not_found" };
  if (record.deletedAt) return { allowed: false, reason: "already_deleted" };
  if (record.lockedAt) return { allowed: false, reason: record.lockReason ?? "locked" };
  return { allowed: true };
}

/**
 * Dependents preview — returns counts of related rows that would be orphaned/affected
 * by deleting this record. Used by UI to show "정말 삭제? 매출 12건 등 영향" prompts.
 *
 * Add new model handlers here as Phase 2.B rolls out per-module deletion UI.
 */
export type DependentCounts = Record<string, number>;

export async function getDependents(model: string, id: string): Promise<DependentCounts> {
  const counts: DependentCounts = {};
  switch (model) {
    case "Client": {
      const [sales, purchases, itc, tm, ast] = await Promise.all([
        prisma.sales.count({ where: { clientId: id, deletedAt: null } }),
        prisma.purchase.count({ where: { supplierId: id, deletedAt: null } }),
        prisma.itContract.count({ where: { clientId: id, deletedAt: null } }),
        prisma.tmRental.count({ where: { clientId: id, deletedAt: null } }),
        prisma.asTicket.count({ where: { clientId: id, deletedAt: null } }),
      ]);
      counts.sales = sales;
      counts.purchases = purchases;
      counts.itContracts = itc;
      counts.tmRentals = tm;
      counts.asTickets = ast;
      break;
    }
    case "Item": {
      const [stocks, salesItems, purchaseItems] = await Promise.all([
        prisma.inventoryItem.count({ where: { itemId: id, deletedAt: null } }),
        prisma.salesItem.count({ where: { itemId: id } }),
        prisma.purchaseItem.count({ where: { itemId: id } }),
      ]);
      counts.inventoryItems = stocks;
      counts.salesItems = salesItems;
      counts.purchaseItems = purchaseItems;
      break;
    }
    case "Warehouse": {
      const [items, fromTxns, toTxns] = await Promise.all([
        prisma.inventoryItem.count({ where: { warehouseId: id, deletedAt: null } }),
        prisma.inventoryTransaction.count({ where: { fromWarehouseId: id } }),
        prisma.inventoryTransaction.count({ where: { toWarehouseId: id } }),
      ]);
      counts.inventoryItems = items;
      counts.outgoingTxns = fromTxns;
      counts.incomingTxns = toTxns;
      break;
    }
    case "Employee": {
      const [asAssigned, dispatches, leaves, incidents] = await Promise.all([
        prisma.asTicket.count({ where: { assignedToId: id } }),
        prisma.asDispatch.count({ where: { dispatchedById: id } }),
        prisma.leaveRecord.count({ where: { employeeId: id } }),
        prisma.incident.count({ where: { OR: [{ subjectId: id }, { authorId: id }] } }),
      ]);
      counts.asTicketsAssigned = asAssigned;
      counts.dispatches = dispatches;
      counts.leaves = leaves;
      counts.incidents = incidents;
      break;
    }
    default:
      break;
  }
  return counts;
}
