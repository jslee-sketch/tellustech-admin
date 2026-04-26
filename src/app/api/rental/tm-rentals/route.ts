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
import { computeTmProfit } from "@/lib/tm-profit";
import type { Currency } from "@/generated/prisma/client";

const CURRENCIES: readonly Currency[] = ["VND", "USD", "KRW", "JPY", "CNY"] as const;

// TM 렌탈 — 공유(회사코드 없음). rentalCode = TM-YYMMDD-###
// 저장 시 items[] 배열을 본체와 함께 받아 트랜잭션 생성.
// 매출자동반영은 별도 /reflect-sales 엔드포인트에서 수행.

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

type ItemInput = {
  itemId: string;
  options?: string | null;
  serialNumber: string;
  startDate: string;
  endDate: string;
  salesPrice: string | number;
  supplierName?: string | null;
  purchasePrice?: string | number | null;
  commission?: string | number | null;
};

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const q = trimNonEmpty(url.searchParams.get("q"));
    const clientId = trimNonEmpty(url.searchParams.get("client"));

    const where = {
      ...(clientId ? { clientId } : {}),
      ...(q
        ? {
            OR: [
              { rentalCode: { contains: q, mode: "insensitive" as const } },
              { contractNumber: { contains: q, mode: "insensitive" as const } },
              { address: { contains: q, mode: "insensitive" as const } },
              { client: { companyNameVi: { contains: q, mode: "insensitive" as const } } },
              { client: { clientCode: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const rentals = await prisma.tmRental.findMany({
      where,
      orderBy: { rentalCode: "desc" },
      take: 500,
      include: {
        client: { select: { id: true, clientCode: true, companyNameVi: true } },
        _count: { select: { items: true } },
        items: { select: { salesPrice: true, profit: true } },
      },
    });

    const result = rentals.map((r) => {
      const totalSales = r.items.reduce((sum, it) => sum + Number(it.salesPrice), 0);
      const totalProfit = r.items.reduce((sum, it) => sum + Number(it.profit ?? 0), 0);
      return {
        id: r.id,
        rentalCode: r.rentalCode,
        contractNumber: r.contractNumber,
        client: r.client,
        address: r.address,
        startDate: r.startDate,
        endDate: r.endDate,
        itemCount: r._count.items,
        totalSales: totalSales.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
      };
    });

    return ok({ rentals: result });
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
      const clientId = requireString(p.clientId, "clientId");
      const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
      if (!client) return badRequest("invalid_client");

      const startDate = parseDate(p.startDate);
      const endDate = parseDate(p.endDate);
      if (!startDate) return badRequest("invalid_input", { field: "startDate" });
      if (!endDate) return badRequest("invalid_input", { field: "endDate" });
      if (endDate < startDate) return badRequest("invalid_input", { field: "endDate", reason: "before_start" });

      // 품목 라인 유효성 — itemId 필수
      const rawItems = Array.isArray(p.items) ? (p.items as unknown[]) : [];
      const itemsData: {
        itemId: string;
        options: string | null;
        serialNumber: string;
        startDate: Date;
        endDate: Date;
        salesPrice: string;
        supplierName: string | null;
        purchasePrice: string | null;
        commission: string | null;
        profit: string;
      }[] = [];
      for (let i = 0; i < rawItems.length; i++) {
        const it = rawItems[i] as ItemInput;
        const itemId = trimNonEmpty(it.itemId);
        if (!itemId) return badRequest("invalid_input", { field: `items[${i}].itemId` });
        const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
        if (!item) return badRequest("invalid_item", { field: `items[${i}].itemId` });
        const serialNumber = trimNonEmpty(it.serialNumber);
        if (!serialNumber) return badRequest("invalid_input", { field: `items[${i}].serialNumber` });
        const itStart = parseDate(it.startDate);
        const itEnd = parseDate(it.endDate);
        if (!itStart) return badRequest("invalid_input", { field: `items[${i}].startDate` });
        if (!itEnd) return badRequest("invalid_input", { field: `items[${i}].endDate` });
        const salesPrice = parseDecimal(it.salesPrice);
        if (salesPrice === null) return badRequest("invalid_input", { field: `items[${i}].salesPrice` });
        const purchasePrice = parseDecimal(it.purchasePrice);
        const commission = parseDecimal(it.commission);
        itemsData.push({
          itemId,
          options: trimNonEmpty(it.options),
          serialNumber,
          startDate: itStart,
          endDate: itEnd,
          salesPrice,
          supplierName: trimNonEmpty(it.supplierName),
          purchasePrice,
          commission,
          profit: computeTmProfit(salesPrice, purchasePrice, commission),
        });
      }

      const created = await withUniqueRetry(
        async () => {
          const rentalCode = await generateDatedCode({
            prefix: "TM",
            lookupLast: async (fullPrefix) => {
              const last = await prisma.tmRental.findFirst({
                where: { deletedAt: undefined, rentalCode: { startsWith: fullPrefix } },
                orderBy: { rentalCode: "desc" },
                select: { rentalCode: true },
              });
              return last?.rentalCode ?? null;
            },
          });
          const currency = optionalEnum(p.currency, CURRENCIES) ?? "VND";
          const rawFx = Number(p.fxRate ?? 1);
          const fxRate = Number.isFinite(rawFx) && rawFx > 0 ? rawFx.toFixed(6) : "1";

          return prisma.$transaction(async (tx) => {
            const rental = await tx.tmRental.create({
              data: {
                rentalCode,
                clientId,
                contractNumber: trimNonEmpty(p.contractNumber),
                address: trimNonEmpty(p.address),
                startDate,
                endDate,
                currency,
                fxRate,
                contractMgrName: trimNonEmpty(p.contractMgrName),
                contractMgrPhone: trimNonEmpty(p.contractMgrPhone),
                contractMgrEmail: trimNonEmpty(p.contractMgrEmail),
                technicalMgrName: trimNonEmpty(p.technicalMgrName),
                technicalMgrPhone: trimNonEmpty(p.technicalMgrPhone),
                technicalMgrEmail: trimNonEmpty(p.technicalMgrEmail),
                financeMgrName: trimNonEmpty(p.financeMgrName),
                financeMgrPhone: trimNonEmpty(p.financeMgrPhone),
                financeMgrEmail: trimNonEmpty(p.financeMgrEmail),
              },
            });
            if (itemsData.length > 0) {
              await tx.tmRentalItem.createMany({
                data: itemsData.map((it) => ({ tmRentalId: rental.id, ...it })),
              });
            }
            return rental;
          });
        },
        { attempts: 5, isConflict: isUniqueConstraintError },
      );

      const full = await prisma.tmRental.findUnique({
        where: { id: created.id },
        include: { items: true },
      });
      return ok({ rental: full }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isUniqueConstraintError(err)) return conflict("duplicate_code");
      return serverError(err);
    }
  });
}
