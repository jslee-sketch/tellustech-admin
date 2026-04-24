import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  optionalEnum,
  requireEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import type { BranchType, WarehouseType } from "@/generated/prisma/client";

const WAREHOUSE_TYPES: readonly WarehouseType[] = ["INTERNAL", "EXTERNAL", "CLIENT"] as const;
const BRANCH_TYPES: readonly BranchType[] = ["BN", "HN", "HCM", "NT", "DN"] as const;

// 창고는 공유 마스터 (company_code 없음). 전 세션에서 동일 리스트.

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const type = optionalEnum(url.searchParams.get("type"), WAREHOUSE_TYPES);
    const branch = optionalEnum(url.searchParams.get("branch"), BRANCH_TYPES);

    const where = {
      ...(type ? { warehouseType: type } : {}),
      ...(branch ? { branchType: branch } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const warehouses = await prisma.warehouse.findMany({
      where,
      orderBy: [{ branchType: "asc" }, { code: "asc" }],
    });
    return ok({ warehouses });
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
      const code = requireString(p.code, "code").toUpperCase();
      const name = requireString(p.name, "name");
      const warehouseType = requireEnum(p.warehouseType, WAREHOUSE_TYPES, "warehouseType");
      const branchType = optionalEnum(p.branchType, BRANCH_TYPES);
      const location = trimNonEmpty(p.location);

      const created = await prisma.warehouse.create({
        data: { code, name, warehouseType, branchType, location },
      });
      return ok({ warehouse: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
