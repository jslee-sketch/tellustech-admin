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
import type { ClientGrade, Industry, ReceivableStatus } from "@/generated/prisma/client";

const GRADES: readonly ClientGrade[] = ["A", "B", "C", "D"] as const;
const RECV: readonly ReceivableStatus[] = ["NORMAL", "WARNING", "BLOCKED"] as const;
const INDUSTRIES: readonly Industry[] = [
  "MANUFACTURING",
  "LOGISTICS",
  "EDUCATION",
  "IT",
  "OTHER",
] as const;

function parsePaymentTerms(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 365) return undefined;
  return n;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        referrer: { select: { id: true, clientCode: true, companyNameVi: true } },
        referrerEmployee: { select: { id: true, employeeCode: true, nameVi: true } },
        salesPic: { select: { id: true, employeeCode: true, nameVi: true } },
      },
    });
    if (!client) return notFound();
    return ok({ client });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const existing = await prisma.client.findUnique({ where: { id } });
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

      if (p.companyNameVi !== undefined) data.companyNameVi = requireString(p.companyNameVi, "companyNameVi");
      if (p.companyNameEn !== undefined) data.companyNameEn = trimNonEmpty(p.companyNameEn);
      if (p.companyNameKo !== undefined) data.companyNameKo = trimNonEmpty(p.companyNameKo);
      if (p.representative !== undefined) data.representative = trimNonEmpty(p.representative);
      if (p.taxCode !== undefined) data.taxCode = trimNonEmpty(p.taxCode);
      if (p.businessLicenseNo !== undefined) data.businessLicenseNo = trimNonEmpty(p.businessLicenseNo);
      if (p.industry !== undefined) {
        const ind = p.industry === null || p.industry === "" ? null : optionalEnum(p.industry, INDUSTRIES);
        data.industry = ind;
      }
      if (p.bankAccountNumber !== undefined) data.bankAccountNumber = trimNonEmpty(p.bankAccountNumber);
      if (p.bankName !== undefined) data.bankName = trimNonEmpty(p.bankName);
      if (p.bankHolder !== undefined) data.bankHolder = trimNonEmpty(p.bankHolder);
      if (p.paymentTerms !== undefined) {
        const pt = parsePaymentTerms(p.paymentTerms);
        if (pt === undefined) return badRequest("invalid_input", { field: "paymentTerms" });
        data.paymentTerms = pt;
      }
      if (p.address !== undefined) data.address = trimNonEmpty(p.address);
      if (p.phone !== undefined) data.phone = trimNonEmpty(p.phone);
      if (p.email !== undefined) data.email = trimNonEmpty(p.email);
      if (p.emailConsent !== undefined) data.emailConsent = Boolean(p.emailConsent);
      if (p.notes !== undefined) data.notes = trimNonEmpty(p.notes);

      // 영업관리
      if (p.leadSource !== undefined) data.leadSource = trimNonEmpty(p.leadSource);
      if (p.grade !== undefined) {
        const g = p.grade === null || p.grade === "" ? null : optionalEnum(p.grade, GRADES);
        data.grade = g;
      }
      if (p.referrerId !== undefined) {
        const rid = trimNonEmpty(p.referrerId);
        if (rid) {
          if (rid === id) return badRequest("invalid_input", { field: "referrerId", reason: "self_reference" });
          const referrer = await prisma.client.findUnique({ where: { id: rid } });
          if (!referrer) return badRequest("invalid_referrer");
          data.referrerId = rid;
        } else {
          data.referrerId = null;
        }
      }
      if (p.referrerEmployeeId !== undefined) {
        const eid = trimNonEmpty(p.referrerEmployeeId);
        if (eid) {
          const emp = await prisma.employee.findUnique({ where: { id: eid } });
          if (!emp) return badRequest("invalid_referrer_employee");
          data.referrerEmployeeId = eid;
        } else {
          data.referrerEmployeeId = null;
        }
      }
      if (p.salesPicId !== undefined) {
        const eid = trimNonEmpty(p.salesPicId);
        if (eid) {
          const emp = await prisma.employee.findUnique({ where: { id: eid } });
          if (!emp) return badRequest("invalid_sales_pic");
          data.salesPicId = eid;
        } else {
          data.salesPicId = null;
        }
      }

      // 마케팅
      if (p.marketingTags !== undefined) {
        if (!Array.isArray(p.marketingTags)) {
          return badRequest("invalid_input", { field: "marketingTags" });
        }
        data.marketingTags = (p.marketingTags as unknown[])
          .map((t) => (typeof t === "string" ? t.trim() : ""))
          .filter((t) => t.length > 0)
          .slice(0, 30);
      }

      // 미수금 상태
      if (p.receivableStatus !== undefined) {
        const rs = optionalEnum(p.receivableStatus, RECV);
        if (!rs) return badRequest("invalid_input", { field: "receivableStatus" });
        data.receivableStatus = rs;
      }

      if (Object.keys(data).length === 0) return ok({ client: existing });

      const updated = await prisma.client.update({ where: { id }, data });
      return ok({ client: updated });
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
      await prisma.client.delete({ where: { id } });
      return ok({ ok: true });
    } catch (err) {
      if (isForeignKeyError(err)) {
        return conflict("has_dependent_rows", {
          message: "이 거래처에 연결된 계약·AS·매출·매입 등의 이력이 있어 삭제할 수 없습니다.",
        });
      }
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
