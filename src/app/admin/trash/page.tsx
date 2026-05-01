import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { TrashClient } from "./trash-client";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const s = await getSession();
  if (s.role !== "ADMIN" && s.role !== "MANAGER") redirect("/");

  // 화이트리스트 모델별 deletedAt != null 행 수집 (각 모델 100개 미만 가정)
  const [clients, items, warehouses, employees, sales, purchases] = await Promise.all([
    prisma.client.findMany({  where: { deletedAt: { not: null } }, take: 100, select: { id: true, clientCode: true, companyNameVi: true, deletedAt: true } }),
    prisma.item.findMany({    where: { deletedAt: { not: null } }, take: 100, select: { id: true, itemCode: true, name: true, deletedAt: true } }),
    prisma.warehouse.findMany({ where: { deletedAt: { not: null } }, take: 100, select: { id: true, code: true, name: true, deletedAt: true } }),
    prisma.employee.findMany({  where: { deletedAt: { not: null } }, take: 100, select: { id: true, employeeCode: true, nameVi: true, deletedAt: true } }),
    prisma.sales.findMany({     where: { deletedAt: { not: null } }, take: 100, select: { id: true, salesNumber: true, totalAmount: true, deletedAt: true } }),
    prisma.purchase.findMany({  where: { deletedAt: { not: null } }, take: 100, select: { id: true, purchaseNumber: true, totalAmount: true, deletedAt: true } }),
  ]);

  const L = s.language;
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-screen-2xl">
        <h1 className="mb-4 text-2xl font-extrabold">{t("page.trash.title", L)}</h1>
        <TrashClient
          lang={L}
          buckets={[
            { model: "Client",    label: t("nav.clients", L),     rows: clients.map(r => ({ id: r.id, label: `${r.clientCode} · ${r.companyNameVi}`, deletedAt: r.deletedAt })) },
            { model: "Item",      label: t("nav.items", L),       rows: items.map(r => ({ id: r.id, label: `${r.itemCode} · ${r.name}`, deletedAt: r.deletedAt })) },
            { model: "Warehouse", label: t("nav.warehouses", L),  rows: warehouses.map(r => ({ id: r.id, label: `${r.code} · ${r.name}`, deletedAt: r.deletedAt })) },
            { model: "Employee",  label: t("nav.employees", L),   rows: employees.map(r => ({ id: r.id, label: `${r.employeeCode} · ${r.nameVi}`, deletedAt: r.deletedAt })) },
            { model: "Sales",     label: t("nav.salesOrder", L),  rows: sales.map(r => ({ id: r.id, label: `${r.salesNumber} · ${r.totalAmount}`, deletedAt: r.deletedAt })) },
            { model: "Purchase",  label: t("nav.purchase", L),    rows: purchases.map(r => ({ id: r.id, label: `${r.purchaseNumber} · ${r.totalAmount}`, deletedAt: r.deletedAt })) },
          ]}
        />
      </div>
    </main>
  );
}
