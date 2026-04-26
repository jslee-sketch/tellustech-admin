import "server-only";
import { prisma } from "../prisma";
import { canDelete, canEdit, getDependents, type RecordWithLock } from "../record-policy";

/**
 * Phase 2.A — common CRUD helpers.
 *
 * - softDeleteOne: stamp `deletedAt` instead of hard delete
 * - bulkSoftDelete: same for an array of ids
 * - lockOne / unlockOne: stamp `lockedAt` + `lockReason`
 * - dependentsPreview: dispatch to record-policy.getDependents
 *
 * All wrappers go through `prisma` (audit-extended) so audit_log captures the change.
 */

type Delegate = {
  findUnique: (args: { where: { id: string } }) => Promise<RecordWithLock | null>;
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<RecordWithLock>;
  updateMany: (args: { where: { id: { in: string[] } }; data: Record<string, unknown> }) => Promise<{ count: number }>;
};

function delegateFor(model: string): Delegate {
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  const d = (prisma as unknown as Record<string, Delegate>)[key];
  if (!d || typeof d.findUnique !== "function") {
    throw new Error(`unknown_model:${model}`);
  }
  return d;
}

export async function softDeleteOne(model: string, id: string): Promise<{ ok: true } | { ok: false; reason: string; dependents?: Record<string, number> }> {
  const d = delegateFor(model);
  const cur = await d.findUnique({ where: { id } });
  const verdict = canDelete(cur);
  if (!verdict.allowed) {
    return { ok: false, reason: verdict.reason };
  }
  await d.update({ where: { id }, data: { deletedAt: new Date() } });
  return { ok: true };
}

export async function bulkSoftDelete(model: string, ids: string[]): Promise<{ ok: true; count: number } | { ok: false; reason: string }> {
  if (ids.length === 0) return { ok: true, count: 0 };
  const d = delegateFor(model);
  // Verify none are locked — fetch all and check
  const checks = await Promise.all(ids.map((id) => d.findUnique({ where: { id } })));
  for (const cur of checks) {
    const v = canDelete(cur);
    if (!v.allowed) return { ok: false, reason: v.reason };
  }
  const res = await d.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
  return { ok: true, count: res.count };
}

export async function lockOne(model: string, id: string, reason: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const d = delegateFor(model);
  const cur = await d.findUnique({ where: { id } });
  if (!cur) return { ok: false, reason: "not_found" };
  if (cur.deletedAt) return { ok: false, reason: "deleted" };
  if (cur.lockedAt) return { ok: false, reason: "already_locked" };
  await d.update({ where: { id }, data: { lockedAt: new Date(), lockReason: reason } });
  return { ok: true };
}

export async function unlockOne(model: string, id: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const d = delegateFor(model);
  const cur = await d.findUnique({ where: { id } });
  if (!cur) return { ok: false, reason: "not_found" };
  if (cur.deletedAt) return { ok: false, reason: "deleted" };
  if (!cur.lockedAt) return { ok: true };
  await d.update({ where: { id }, data: { lockedAt: null, lockReason: null } });
  return { ok: true };
}

export async function requireUnlocked(model: string, id: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const d = delegateFor(model);
  const cur = await d.findUnique({ where: { id } });
  const v = canEdit(cur);
  if (!v.allowed) return { ok: false, reason: v.reason };
  return { ok: true };
}

export async function dependentsPreview(model: string, id: string): Promise<Record<string, number>> {
  return getDependents(model, id);
}
