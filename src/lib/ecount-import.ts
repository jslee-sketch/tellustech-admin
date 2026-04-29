import "server-only";
import * as XLSX from "xlsx";
import { prisma } from "./prisma";

// ECOUNT 엑셀 → 신규 ERP 마이그레이션 구조.
// 실제 엑셀 파일 16개 (거래처/품목/직원/계약/재고/매출/매입 등) 가 제공되면 파서 확장.
// 여기서는 최소 3개 시트(거래처, 품목, 창고) 의 임포트 스텁.

export type ImportReport = {
  scope: string;
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
};

export async function importClientsFromExcel(buffer: ArrayBuffer): Promise<ImportReport> {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  const report: ImportReport = { scope: "clients", created: 0, skipped: 0, failed: 0, errors: [] };

  for (const r of rows) {
    const clientCode = String(r["거래처코드"] ?? r["client_code"] ?? "").trim();
    const nameVi = String(r["거래처명"] ?? r["client_name"] ?? "").trim();
    if (!clientCode || !nameVi) {
      report.skipped++;
      continue;
    }
    try {
      const existing = await prisma.client.findUnique({ where: { clientCode } });
      if (existing) {
        report.skipped++;
        continue;
      }
      await prisma.client.create({
        data: {
          clientCode,
          companyNameVi: nameVi,
          phone: String(r["전화"] ?? r["phone"] ?? "").trim() || null,
          taxCode: String(r["MST"] ?? r["tax_code"] ?? "").trim() || null,
          representative: String(r["대표자"] ?? r["representative"] ?? "").trim() || null,
          paymentTerms: Number.isFinite(Number(r["결제조건"])) ? Number(r["결제조건"]) : null,
        },
      });
      report.created++;
    } catch (e) {
      report.failed++;
      report.errors.push(`${clientCode}: ${e instanceof Error ? e.message : "fail"}`);
    }
  }
  return report;
}

export async function importItemsFromExcel(buffer: ArrayBuffer): Promise<ImportReport> {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  const report: ImportReport = { scope: "items", created: 0, skipped: 0, failed: 0, errors: [] };
  for (const r of rows) {
    const itemCode = String(r["품목코드"] ?? r["item_code"] ?? "").trim();
    const name = String(r["품목명"] ?? r["item_name"] ?? "").trim();
    if (!itemCode || !name) { report.skipped++; continue; }
    if (!/^[\x20-\x7E]+$/.test(name)) {
      report.skipped++;
      report.errors.push(`${itemCode}: 품목명은 영어(ASCII)로만 입력 가능합니다.`);
      continue;
    }
    try {
      const existing = await prisma.item.findUnique({ where: { itemCode } });
      if (existing) { report.skipped++; continue; }
      const catRaw = String(r["구분"] ?? r["category"] ?? "").toLowerCase();
      const itemType = catRaw.includes("consumable") || catRaw.includes("소모") ? "CONSUMABLE" : catRaw.includes("part") || catRaw.includes("부품") ? "PART" : "PRODUCT";
      await prisma.item.create({
        data: {
          itemCode,
          name,
          itemType,
          description: String(r["카테고리"] ?? r["device_line"] ?? "").trim() || "",
        },
      });
      report.created++;
    } catch (e) {
      report.failed++;
      report.errors.push(`${itemCode}: ${e instanceof Error ? e.message : "fail"}`);
    }
  }
  return report;
}

// 호출 순서 권장: 거래처 → 품목 → 창고 → 직원 → 계약 → 재고 → 매출/매입
// 확장 포인트: importEmployees, importContracts, importInventorySnapshots, importSales, importPurchases
