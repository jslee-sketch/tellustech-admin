import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  conflict,
  handleFieldError,
  isUniqueConstraintError,
  ok,
  optionalEnum,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";
import { generateDatedCode, withUniqueRetry } from "@/lib/code-generator";
import type { ContractStatus, Currency } from "@/generated/prisma/client";

// IT계약 API — 공유(회사코드 없음, 거래처 기반).
// 계약번호 prefix:  TV 세션 → TLS-YYMMDD-### , VR 세션 → VRT-YYMMDD-###

const STATUSES: readonly ContractStatus[] = ["DRAFT", "ACTIVE", "EXPIRED", "CANCELED"] as const;
const CURRENCIES: readonly Currency[] = ["VND", "USD", "KRW", "JPY", "CNY"] as const;

function contractPrefix(companyCode: "TV" | "VR"): string {
  return companyCode === "TV" ? "TLS" : "VRT";
}

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

// GET 리스트 — ?q, ?status, ?client
export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const status = optionalEnum(url.searchParams.get("status"), STATUSES);
    const clientId = trimNonEmpty(url.searchParams.get("client"));

    const where = {
      ...(status ? { status } : {}),
      ...(clientId ? { clientId } : {}),
      ...(q
        ? {
            OR: [
              { contractNumber: { contains: q, mode: "insensitive" as const } },
              { installationAddress: { contains: q, mode: "insensitive" as const } },
              { client: { companyNameVi: { contains: q, mode: "insensitive" as const } } },
              { client: { companyNameEn: { contains: q, mode: "insensitive" as const } } },
              { client: { clientCode: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const contracts = await prisma.itContract.findMany({
      where,
      orderBy: { contractNumber: "desc" },
      take: 500,
      include: {
        client: { select: { id: true, clientCode: true, companyNameVi: true } },
        _count: { select: { equipment: true } },
      },
    });
    return ok({ contracts });
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
      const clientId = requireString(p.clientId, "clientId");
      const startDate = parseDateOrNull(p.startDate);
      const endDate = parseDateOrNull(p.endDate);
      if (!startDate) return badRequest("invalid_input", { field: "startDate" });
      if (!endDate) return badRequest("invalid_input", { field: "endDate" });
      if (endDate < startDate) return badRequest("invalid_input", { field: "endDate", reason: "before_start" });

      // 거래처 존재 확인
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) return badRequest("invalid_client");

      const status = (optionalEnum(p.status, STATUSES) ?? "DRAFT") as ContractStatus;
      const currency = optionalEnum(p.currency, CURRENCIES) ?? "VND";
      const rawFx = Number(p.fxRate ?? 1);
      const fxRate = Number.isFinite(rawFx) && rawFx > 0 ? rawFx.toFixed(6) : "1";

      const created = await withUniqueRetry(
        async () => {
          const contractNumber = await generateDatedCode({
            prefix: contractPrefix(session.companyCode),
            lookupLast: async (fullPrefix) => {
              const last = await prisma.itContract.findFirst({
                where: { contractNumber: { startsWith: fullPrefix } },
                orderBy: { contractNumber: "desc" },
                select: { contractNumber: true },
              });
              return last?.contractNumber ?? null;
            },
          });
          return prisma.itContract.create({
            data: {
              contractNumber,
              clientId,
              installationAddress: trimNonEmpty(p.installationAddress),
              status,
              startDate,
              endDate,
              deposit: parseDecimalOrNull(p.deposit),
              installationFee: parseDecimalOrNull(p.installationFee),
              deliveryFee: parseDecimalOrNull(p.deliveryFee),
              additionalServiceFee: parseDecimalOrNull(p.additionalServiceFee),
              currency,
              fxRate,
              contractMgrName: trimNonEmpty(p.contractMgrName),
              contractMgrPhone: trimNonEmpty(p.contractMgrPhone),
              contractMgrOffice: trimNonEmpty(p.contractMgrOffice),
              contractMgrEmail: trimNonEmpty(p.contractMgrEmail),
              technicalMgrName: trimNonEmpty(p.technicalMgrName),
              technicalMgrPhone: trimNonEmpty(p.technicalMgrPhone),
              technicalMgrOffice: trimNonEmpty(p.technicalMgrOffice),
              technicalMgrEmail: trimNonEmpty(p.technicalMgrEmail),
              financeMgrName: trimNonEmpty(p.financeMgrName),
              financeMgrPhone: trimNonEmpty(p.financeMgrPhone),
              financeMgrOffice: trimNonEmpty(p.financeMgrOffice),
              financeMgrEmail: trimNonEmpty(p.financeMgrEmail),
            },
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );

      return ok({ contract: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
