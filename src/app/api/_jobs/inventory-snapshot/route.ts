import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CompanyCode, BranchType } from "@/generated/prisma/client";

// 월별 재고 스냅샷 cron — 매월 1일 새벽 호출.
// 실행 시점: targetMonth=YYYY-MM 미지정이면 "전월" 의 마감 스냅샷을 만든다.
// 동작:
//  - 회사·창고·품목 조합 별로 InventoryItem(NORMAL) 개수 + S/N 배열 집계
//  - InventoryStock.upsert (unique key: companyCode/itemId/warehouseId/month)
//
// Bearer CRON_SECRET 일치 필수.

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const targetParam = url.searchParams.get("targetMonth"); // "YYYY-MM"
  const month = monthAnchor(targetParam);

  // 모든 (companyCode, itemId, warehouseId, S/N 배열) 집계
  const items = await prisma.inventoryItem.findMany({
    where: { status: "NORMAL" },
    select: { itemId: true, warehouseId: true, serialNumber: true, companyCode: true, warehouse: { select: { branchType: true } } },
  });

  type Key = `${CompanyCode}|${string}|${string}`;
  const map = new Map<Key, { companyCode: CompanyCode; itemId: string; warehouseId: string; branchType: BranchType; serialNumbers: string[] }>();

  for (const it of items) {
    const branchType = (it.warehouse.branchType ?? "MAIN") as BranchType;
    const key: Key = `${it.companyCode}|${it.itemId}|${it.warehouseId}`;
    const entry = map.get(key) ?? {
      companyCode: it.companyCode,
      itemId: it.itemId,
      warehouseId: it.warehouseId,
      branchType,
      serialNumbers: [],
    };
    entry.serialNumbers.push(it.serialNumber);
    map.set(key, entry);
  }

  let upserted = 0;
  for (const e of map.values()) {
    await prisma.inventoryStock.upsert({
      where: {
        companyCode_itemId_warehouseId_month: {
          companyCode: e.companyCode,
          itemId: e.itemId,
          warehouseId: e.warehouseId,
          month,
        },
      },
      create: {
        companyCode: e.companyCode,
        itemId: e.itemId,
        warehouseId: e.warehouseId,
        branchType: e.branchType,
        month,
        quantity: e.serialNumbers.length,
        serialNumbers: e.serialNumbers,
      },
      update: {
        quantity: e.serialNumbers.length,
        serialNumbers: e.serialNumbers,
        branchType: e.branchType,
      },
    });
    upserted++;
  }

  return NextResponse.json({
    ok: true,
    month: month.toISOString().slice(0, 10),
    upserted,
  });
}

function monthAnchor(yyyymm: string | null): Date {
  if (yyyymm && /^\d{4}-\d{2}$/.test(yyyymm)) {
    const [y, m] = yyyymm.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1));
  }
  // 전월 1일
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "_jobs/inventory-snapshot" });
}
