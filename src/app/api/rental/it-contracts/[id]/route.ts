import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isForeignKeyError,
  isRecordNotFoundError,
  notFound,
  ok,
  optionalEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import type { ContractStatus } from "@/generated/prisma/client";

const STATUSES: readonly ContractStatus[] = ["DRAFT", "ACTIVE", "EXPIRED", "CANCELED"] as const;

type RouteContext = { params: Promise<{ id: string }> };

function parseDateOrUndefined(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  const s = trimNonEmpty(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseDecimalOrUndefined(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n.toFixed(2);
}

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const contract = await prisma.itContract.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, clientCode: true, companyNameVi: true, receivableStatus: true } },
        equipment: { orderBy: [{ installedAt: "desc" }, { serialNumber: "asc" }] },
      },
    });
    if (!contract) return notFound();
    return ok({ contract });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const existing = await prisma.itContract.findUnique({ where: { id } });
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

      if (p.installationAddress !== undefined) data.installationAddress = trimNonEmpty(p.installationAddress);
      if (p.status !== undefined) {
        const s = optionalEnum(p.status, STATUSES);
        if (!s) return badRequest("invalid_input", { field: "status" });
        data.status = s;
      }
      if (p.startDate !== undefined) {
        const d = parseDateOrUndefined(p.startDate);
        if (d === undefined || d === null) return badRequest("invalid_input", { field: "startDate" });
        data.startDate = d;
      }
      if (p.endDate !== undefined) {
        const d = parseDateOrUndefined(p.endDate);
        if (d === undefined || d === null) return badRequest("invalid_input", { field: "endDate" });
        data.endDate = d;
      }

      const decimalFields = ["deposit", "installationFee", "deliveryFee", "additionalServiceFee"] as const;
      for (const k of decimalFields) {
        if (p[k] !== undefined) data[k] = parseDecimalOrUndefined(p[k]);
      }

      const mgrFields = [
        "contractMgrName",
        "contractMgrPhone",
        "contractMgrOffice",
        "contractMgrEmail",
        "technicalMgrName",
        "technicalMgrPhone",
        "technicalMgrOffice",
        "technicalMgrEmail",
        "financeMgrName",
        "financeMgrPhone",
        "financeMgrOffice",
        "financeMgrEmail",
      ] as const;
      for (const k of mgrFields) {
        if (p[k] !== undefined) data[k] = trimNonEmpty(p[k]);
      }

      if (p.clientId !== undefined) {
        const cid = requireString(p.clientId, "clientId");
        const c = await prisma.client.findUnique({ where: { id: cid } });
        if (!c) return badRequest("invalid_client");
        data.clientId = cid;
      }

      if (Object.keys(data).length === 0) return ok({ contract: existing });

      const updated = await prisma.itContract.update({ where: { id }, data });
      return ok({ contract: updated });
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
      await prisma.itContract.delete({ where: { id } });
      return ok({ ok: true });
    } catch (err) {
      if (isForeignKeyError(err)) {
        return conflict("has_dependent_rows", {
          message: "이 계약에 월별 청구·렌탈 오더 이력이 있어 삭제할 수 없습니다. 상태를 '취소' 또는 '만료'로 변경하세요.",
        });
      }
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
