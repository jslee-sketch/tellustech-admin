import "server-only";
import * as XLSX from "xlsx";
import { prisma } from "./prisma";

// MISA 엑셀 내보내기 — 베트남 공인회계 시스템으로 월별 매출/매입/비용을 보내는 스텁.
// 실제 MISA 의 "Phân hệ Mua hàng/Bán hàng" 임포트 양식에 맞춰 추후 컬럼 매핑 확정.
// 여기서는 기본 구조만 — 실제 포맷은 첫 테스트 사이클 이후 보정.

type MonthArg = { year: number; month: number }; // 1-12

function firstOfMonth({ year, month }: MonthArg): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}
function nextMonth({ year, month }: MonthArg): Date {
  return new Date(Date.UTC(year, month, 1));
}

export async function buildMisaExport(args: MonthArg): Promise<Buffer> {
  const from = firstOfMonth(args);
  const to = nextMonth(args);

  const [sales, purchases, expenses] = await Promise.all([
    prisma.sales.findMany({
      where: { createdAt: { gte: from, lt: to } },
      include: {
        client: { select: { clientCode: true, companyNameVi: true, taxCode: true } },
        items: { include: { item: { select: { name: true } } } },
      },
    }),
    prisma.purchase.findMany({
      where: { createdAt: { gte: from, lt: to } },
      include: {
        supplier: { select: { clientCode: true, companyNameVi: true, taxCode: true } },
        items: { include: { item: { select: { name: true } } } },
      },
    }),
    prisma.expense.findMany({
      where: { incurredAt: { gte: from, lt: to } },
    }),
  ]);

  const wb = XLSX.utils.book_new();

  // MISA 는 VND 본위 회계. 외화 거래는 fxRate 적용 후 VND 로 기록.
  const salesRows = sales.flatMap((s) => {
    const rate = Number(s.fxRate);
    return s.items.map((it) => ({
      "Số CT": s.salesNumber,
      "Ngày CT": s.createdAt.toISOString().slice(0, 10),
      "Khách hàng": s.client.companyNameVi,
      "Mã KH": s.client.clientCode,
      "MST": s.client.taxCode ?? "",
      "Diễn giải": it.item.name,
      "S/N": it.serialNumber ?? "",
      "SL": Number(it.quantity),
      "Đơn giá (VND)": Number(it.unitPrice) * rate,
      "Thành tiền (VND)": Number(it.amount) * rate,
      "Tiền tệ gốc": s.currency,
      "Tỷ giá": rate,
    }));
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesRows), "매출");

  const purchaseRows = purchases.flatMap((p) => {
    const rate = Number(p.fxRate);
    return p.items.map((it) => ({
      "Số CT": p.purchaseNumber,
      "Ngày CT": p.createdAt.toISOString().slice(0, 10),
      "Nhà cung cấp": p.supplier.companyNameVi,
      "Mã NCC": p.supplier.clientCode,
      "MST": p.supplier.taxCode ?? "",
      "Diễn giải": it.item.name,
      "S/N": it.serialNumber ?? "",
      "SL": Number(it.quantity),
      "Đơn giá (VND)": Number(it.unitPrice) * rate,
      "Thành tiền (VND)": Number(it.amount) * rate,
      "Tiền tệ gốc": p.currency,
      "Tỷ giá": rate,
    }));
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseRows), "매입");

  const expenseRows = expenses.map((e) => ({
    "Số CT": e.expenseCode,
    "Ngày": e.incurredAt.toISOString().slice(0, 10),
    "Loại": e.expenseType,
    "Số tiền (VND)": Number(e.amount) * Number(e.fxRate),
    "Tiền tệ gốc": e.currency,
    "Tỷ giá": Number(e.fxRate),
    "Diễn giải": e.note ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), "비용");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return buf;
}
