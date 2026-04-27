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
import { canEdit } from "@/lib/record-policy";
import { dependentsPreview, softDeleteOne } from "@/lib/api/crud";
import { fillTranslations } from "@/lib/translate";
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
    const verdict = canEdit(existing);
    if (!verdict.allowed) return conflict(verdict.reason);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};

      // 회사명 — 어느 한 언어가 변경되면 자동으로 나머지 2개 재번역 (3 필드 모두 동기화)
      const nameViChanged = p.companyNameVi !== undefined;
      const nameEnChanged = p.companyNameEn !== undefined;
      const nameKoChanged = p.companyNameKo !== undefined;
      if (nameViChanged || nameEnChanged || nameKoChanged) {
        const inVi = nameViChanged ? trimNonEmpty(p.companyNameVi) : existing.companyNameVi;
        const inEn = nameEnChanged ? trimNonEmpty(p.companyNameEn) : existing.companyNameEn;
        const inKo = nameKoChanged ? trimNonEmpty(p.companyNameKo) : existing.companyNameKo;
        // 사용자가 새로 입력한 것이 source. 그것 기반으로 다른 언어 자동.
        const sourceLang: "VI" | "EN" | "KO" =
          nameViChanged && trimNonEmpty(p.companyNameVi) ? "VI"
          : nameKoChanged && trimNonEmpty(p.companyNameKo) ? "KO"
          : nameEnChanged && trimNonEmpty(p.companyNameEn) ? "EN"
          : (inVi ? "VI" : inKo ? "KO" : "EN");
        const refilled = await fillTranslations({ vi: inVi, en: inEn, ko: inKo, originalLang: sourceLang });
        if (refilled.vi) data.companyNameVi = refilled.vi;
        if (refilled.en !== undefined) data.companyNameEn = refilled.en;
        if (refilled.ko !== undefined) data.companyNameKo = refilled.ko;
      }
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

export async function DELETE(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const url = new URL(request.url);
    // ?preview=1 → 의존성 카운트만 반환, 실제 삭제 안 함 (UX confirm step)
    if (url.searchParams.get("preview") === "1") {
      const counts = await dependentsPreview("Client", id);
      return ok({ preview: true, dependents: counts });
    }
    try {
      const result = await softDeleteOne("Client", id);
      if (!result.ok) {
        if (result.reason === "not_found") return notFound();
        return conflict(result.reason);
      }
      return ok({ ok: true, softDeleted: true });
    } catch (err) {
      if (isForeignKeyError(err)) return conflict("has_dependent_rows");
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
