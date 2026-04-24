import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  handleFieldError,
  ok,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";

// 출동 등록 API
// - POST: asTicketId 필수 → 티켓 상태가 RECEIVED/IN_PROGRESS 면 DISPATCHED 로 자동 전환 (트랜잭션)
// - Google 거리 vs 미터기 OCR 거리 자동비교 (tolerance 10%)
// - 미터기 사진·영수증은 /api/files 에 업로드 후 id 혹은 stored URL 을 여기로 전달
// - Google Maps / OCR 실제 연동은 Phase 2+ 후기 (API 키 확보 후)

const DISTANCE_TOLERANCE_RATIO = 0.1; // 10%

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

function computeDistanceMatch(
  googleKm: string | null,
  meterKm: string | null,
): boolean | null {
  if (!googleKm || !meterKm) return null;
  const g = Number(googleKm);
  const m = Number(meterKm);
  if (!Number.isFinite(g) || !Number.isFinite(m) || g <= 0) return null;
  const diff = Math.abs(m - g);
  return diff <= g * DISTANCE_TOLERANCE_RATIO;
}

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const ticketId = trimNonEmpty(url.searchParams.get("ticket"));
    const employeeId = trimNonEmpty(url.searchParams.get("employee"));

    const where = {
      ...(ticketId ? { asTicketId: ticketId } : {}),
      ...(employeeId ? { dispatchEmployeeId: employeeId } : {}),
      ...(q
        ? {
            OR: [
              { transportMethod: { contains: q, mode: "insensitive" as const } },
              { destinationAddress: { contains: q, mode: "insensitive" as const } },
              { note: { contains: q, mode: "insensitive" as const } },
              { asTicket: { ticketNumber: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const dispatches = await prisma.asDispatch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        asTicket: {
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            client: { select: { clientCode: true, companyNameVi: true } },
          },
        },
        dispatchEmployee: { select: { employeeCode: true, nameVi: true } },
      },
    });
    return ok({ dispatches });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const asTicketId = requireString(p.asTicketId, "asTicketId");
      const ticket = await prisma.asTicket.findUnique({
        where: { id: asTicketId },
        select: { id: true, status: true },
      });
      if (!ticket) return badRequest("invalid_ticket");
      if (ticket.status === "COMPLETED" || ticket.status === "CANCELED") {
        return badRequest("ticket_not_dispatchable", undefined);
      }

      const dispatchEmployeeId = trimNonEmpty(p.dispatchEmployeeId);
      if (dispatchEmployeeId) {
        const e = await prisma.employee.findUnique({ where: { id: dispatchEmployeeId } });
        if (!e) return badRequest("invalid_dispatch_employee");
      }

      const receiptFileId = trimNonEmpty(p.receiptFileId);
      if (receiptFileId) {
        const f = await prisma.file.findUnique({ where: { id: receiptFileId } });
        if (!f) return badRequest("invalid_receipt");
      }

      const googleDistanceKm = parseDecimal(p.googleDistanceKm);
      const meterOcrKm = parseDecimal(p.meterOcrKm);
      const distanceMatch = computeDistanceMatch(googleDistanceKm, meterOcrKm);

      const created = await prisma.$transaction(async (tx) => {
        const dispatch = await tx.asDispatch.create({
          data: {
            asTicketId,
            dispatchEmployeeId: dispatchEmployeeId ?? null,
            transportMethod: trimNonEmpty(p.transportMethod),
            originAddress: trimNonEmpty(p.originAddress),
            destinationAddress: trimNonEmpty(p.destinationAddress),
            googleDistanceKm,
            meterPhotoUrl: trimNonEmpty(p.meterPhotoUrl),
            meterOcrKm,
            distanceMatch,
            transportCost: parseDecimal(p.transportCost),
            receiptFileId: receiptFileId ?? null,
            departedAt: parseDate(p.departedAt),
            arrivedAt: parseDate(p.arrivedAt),
            completedAt: parseDate(p.completedAt),
            note: trimNonEmpty(p.note),
          },
        });

        // 티켓 상태가 RECEIVED/IN_PROGRESS 면 DISPATCHED 로 전환
        if (ticket.status === "RECEIVED" || ticket.status === "IN_PROGRESS") {
          await tx.asTicket.update({
            where: { id: asTicketId },
            data: { status: "DISPATCHED" },
          });
        }

        return dispatch;
      });

      return ok({ dispatch: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      return serverError(err);
    }
  });
}
