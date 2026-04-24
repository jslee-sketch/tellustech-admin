import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  notFound,
  ok,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { checkSerialInStock } from "@/lib/stock-check";
import { deriveCompanyFromContractNumber } from "@/lib/rental-orders";

// IT계약 장비 목록 — STRICT 재고확인 활성.
// 계약 번호 prefix(TLS/VRT) 로 회사 결정 → 재고 테이블에서 S/N 존재 확인.
// 재고에 없으면 400 과 함께 명시적 오류 반환 (IT렌탈은 자사 재고 필수).

type RouteContext = { params: Promise<{ id: string }> };

function parseDateOrNull(value: unknown): Date | null {
  const s = trimNonEmpty(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDecimalOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

function parseIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const contract = await prisma.itContract.findUnique({ where: { id }, select: { id: true } });
    if (!contract) return notFound();
    const equipment = await prisma.itContractEquipment.findMany({
      where: { itContractId: id },
      orderBy: [{ installedAt: "desc" }, { serialNumber: "asc" }],
    });
    return ok({ equipment });
  });
}

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const contract = await prisma.itContract.findUnique({
      where: { id },
      select: { id: true, contractNumber: true },
    });
    if (!contract) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const serialNumber = requireString(p.serialNumber, "serialNumber");
      const itemId = requireString(p.itemId, "itemId");
      const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
      if (!item) return badRequest("invalid_item");

      // S/N 중복 검증 — 다른 활성 계약/렌탈/라인에 이미 있으면 차단
      const { findSerialDuplicates } = await import("@/lib/sn-dupcheck");
      const dups = await findSerialDuplicates(serialNumber);
      const blocking = dups.filter((d) => d.source === "IT" || d.source === "TM");
      if (blocking.length > 0) {
        return badRequest("duplicate_serial", {
          message: `S/N "${serialNumber}" 이 이미 사용 중입니다: ${blocking.map((d) => `${d.source}/${d.ref}`).join(", ")}`,
        });
      }

      // STRICT 재고확인 — IT 렌탈은 자사 재고에 S/N 이 존재해야 함.
      // bypass=true 쿼리플래그 시 건너뛰기 (관리자 override).
      const url = new URL(request.url);
      const bypass = url.searchParams.get("bypass") === "true";
      if (!bypass) {
        const company = deriveCompanyFromContractNumber(contract.contractNumber);
        const stock = await checkSerialInStock(company, serialNumber);
        if (!stock.found) {
          return badRequest("stock_not_found", {
            message: `S/N "${serialNumber}" 이 ${company} 재고에 없습니다. 먼저 입고 등록 후 계약에 추가하세요. (?bypass=true 로 우회 가능)`,
          });
        }
      }

      const created = await prisma.itContractEquipment.create({
        data: {
          itContractId: id,
          itemId,
          serialNumber,
          manufacturer: trimNonEmpty(p.manufacturer),
          installedAt: parseDateOrNull(p.installedAt),
          removedAt: parseDateOrNull(p.removedAt),
          monthlyBaseFee: parseDecimalOrNull(p.monthlyBaseFee),
          bwIncludedPages: parseIntOrNull(p.bwIncludedPages),
          bwOverageRate: parseDecimalOrNull(p.bwOverageRate),
          colorIncludedPages: parseIntOrNull(p.colorIncludedPages),
          colorOverageRate: parseDecimalOrNull(p.colorOverageRate),
          note: trimNonEmpty(p.note),
        },
      });
      return ok({ equipment: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) {
        return conflict("duplicate_sn", { message: "이 계약에 이미 등록된 S/N 입니다." });
      }
      return serverError(err);
    }
  });
}
