import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  handleFieldError,
  isRecordNotFoundError,
  notFound,
  ok,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";

const DISTANCE_TOLERANCE_RATIO = 0.1;

type RouteContext = { params: Promise<{ id: string }> };

function parseDateOrUndefined(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  const s = trimNonEmpty(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseDecimalOrUndefined(value: unknown, min = 0): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) return undefined;
  return n.toFixed(2);
}

function computeMatch(googleKm: string | null, meterKm: string | null): boolean | null {
  if (!googleKm || !meterKm) return null;
  const g = Number(googleKm);
  const m = Number(meterKm);
  if (!Number.isFinite(g) || !Number.isFinite(m) || g <= 0) return null;
  return Math.abs(m - g) <= g * DISTANCE_TOLERANCE_RATIO;
}

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const dispatch = await prisma.asDispatch.findUnique({
      where: { id },
      include: {
        asTicket: {
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            client: { select: { clientCode: true, companyNameVi: true, address: true, phone: true } },
          },
        },
        dispatchEmployee: { select: { id: true, employeeCode: true, nameVi: true } },
        receipt: { select: { id: true, originalName: true, sizeBytes: true } },
      },
    });
    if (!dispatch) return notFound();
    return ok({ dispatch });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const existing = await prisma.asDispatch.findUnique({ where: { id } });
    if (!existing) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};

      if (p.transportMethod !== undefined) data.transportMethod = trimNonEmpty(p.transportMethod);
      if (p.originAddress !== undefined) data.originAddress = trimNonEmpty(p.originAddress);
      if (p.destinationAddress !== undefined) data.destinationAddress = trimNonEmpty(p.destinationAddress);
      if (p.meterPhotoUrl !== undefined) data.meterPhotoUrl = trimNonEmpty(p.meterPhotoUrl);
      if (p.note !== undefined) data.note = trimNonEmpty(p.note);

      if (p.googleDistanceKm !== undefined) {
        const v = parseDecimalOrUndefined(p.googleDistanceKm);
        if (v === undefined) return badRequest("invalid_input", { field: "googleDistanceKm" });
        data.googleDistanceKm = v;
      }
      if (p.meterOcrKm !== undefined) {
        const v = parseDecimalOrUndefined(p.meterOcrKm);
        if (v === undefined) return badRequest("invalid_input", { field: "meterOcrKm" });
        data.meterOcrKm = v;
      }
      if (p.transportCost !== undefined) {
        const v = parseDecimalOrUndefined(p.transportCost);
        if (v === undefined) return badRequest("invalid_input", { field: "transportCost" });
        data.transportCost = v;
      }

      // distanceMatch 재계산 (두 값 중 하나라도 이번 PATCH 에서 변했거나, 기존 값 기준)
      const nextGoogle =
        data.googleDistanceKm !== undefined
          ? (data.googleDistanceKm as string | null)
          : existing.googleDistanceKm?.toString() ?? null;
      const nextMeter =
        data.meterOcrKm !== undefined
          ? (data.meterOcrKm as string | null)
          : existing.meterOcrKm?.toString() ?? null;
      if (p.googleDistanceKm !== undefined || p.meterOcrKm !== undefined) {
        data.distanceMatch = computeMatch(nextGoogle, nextMeter);
      }

      if (p.departedAt !== undefined) data.departedAt = parseDateOrUndefined(p.departedAt);
      if (p.arrivedAt !== undefined) data.arrivedAt = parseDateOrUndefined(p.arrivedAt);
      if (p.completedAt !== undefined) data.completedAt = parseDateOrUndefined(p.completedAt);

      if (p.dispatchEmployeeId !== undefined) {
        const eid = trimNonEmpty(p.dispatchEmployeeId);
        if (eid) {
          const e = await prisma.employee.findUnique({ where: { id: eid } });
          if (!e) return badRequest("invalid_dispatch_employee");
          data.dispatchEmployeeId = eid;
        } else {
          data.dispatchEmployeeId = null;
        }
      }
      if (p.receiptFileId !== undefined) {
        const fid = trimNonEmpty(p.receiptFileId);
        if (fid) {
          const f = await prisma.file.findUnique({ where: { id: fid } });
          if (!f) return badRequest("invalid_receipt");
          data.receiptFileId = fid;
        } else {
          data.receiptFileId = null;
        }
      }

      if (Object.keys(data).length === 0) return ok({ dispatch: existing });

      const updated = await prisma.asDispatch.update({ where: { id }, data });
      return ok({ dispatch: updated });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    try {
      await prisma.asDispatch.delete({ where: { id } });
      return ok({ ok: true });
    } catch (err) {
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
