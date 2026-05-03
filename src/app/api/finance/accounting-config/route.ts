// 회계 설정 — 회사별 1행. GET = 현재 설정 (없으면 default), PUT = 갱신.
import { withSessionContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-utils";
import { ACCOUNTING_PRESETS } from "@/lib/accounting-presets";

export async function GET() {
  return withSessionContext(async (session) => {
    try {
      const cc = session.companyCode as "TV" | "VR";
      let cfg = await prisma.accountingConfig.findUnique({ where: { companyCode: cc as never } });
      if (!cfg) {
        // 처음 호출이면 VAS 프리셋으로 자동 생성
        const p = ACCOUNTING_PRESETS.VAS;
        cfg = await prisma.accountingConfig.create({
          data: {
            standard: p.standard as never,
            fiscalYearStart: p.fiscalYearStart as never,
            reportingCurrency: p.reportingCurrency as never,
            defaultVatRate: p.defaultVatRate,
            defaultReportLang: p.defaultReportLang as never,
            enableAccrual: p.enableAccrual,
            companyCode: cc as never,
          },
        });
      }
      return ok({ config: cfg, presets: ACCOUNTING_PRESETS });
    } catch (e) { return serverError(e); }
  });
}

export async function PUT(request: Request) {
  return withSessionContext(async (session) => {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      const cc = session.companyCode as "TV" | "VR";

      const data: Record<string, unknown> = {};
      if (body.standard) data.standard = body.standard;
      if (body.fiscalYearStart) data.fiscalYearStart = body.fiscalYearStart;
      if (body.reportingCurrency) data.reportingCurrency = body.reportingCurrency;
      if (body.defaultVatRate !== undefined) {
        const r = Number(body.defaultVatRate);
        if (!Number.isFinite(r) || r < 0 || r > 1) return badRequest("invalid_vat_rate");
        data.defaultVatRate = r;
      }
      if (body.defaultReportLang) data.defaultReportLang = body.defaultReportLang;
      if (body.enableAccrual !== undefined) data.enableAccrual = !!body.enableAccrual;
      if (body.enableAutoJournal !== undefined) data.enableAutoJournal = !!body.enableAutoJournal;
      if (body.enforcePeriodClose !== undefined) data.enforcePeriodClose = !!body.enforcePeriodClose;

      const cfg = await prisma.accountingConfig.upsert({
        where: { companyCode: cc as never },
        update: data,
        create: { ...data, companyCode: cc as never },
      });
      return ok({ config: cfg });
    } catch (e) { return serverError(e); }
  });
}

// preset 적용 — POST { preset: "VAS" | "K_IFRS" | "IFRS" }
export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    try {
      const body = (await request.json()) as { preset?: string };
      const presetKey = body.preset;
      if (!presetKey || !ACCOUNTING_PRESETS[presetKey]) return badRequest("invalid_preset");
      const p = ACCOUNTING_PRESETS[presetKey];
      const cc = session.companyCode as "TV" | "VR";
      const cfg = await prisma.accountingConfig.upsert({
        where: { companyCode: cc as never },
        update: {
          standard: p.standard as never,
          fiscalYearStart: p.fiscalYearStart as never,
          reportingCurrency: p.reportingCurrency as never,
          defaultVatRate: p.defaultVatRate,
          defaultReportLang: p.defaultReportLang as never,
          enableAccrual: p.enableAccrual,
        },
        create: {
          standard: p.standard as never,
          fiscalYearStart: p.fiscalYearStart as never,
          reportingCurrency: p.reportingCurrency as never,
          defaultVatRate: p.defaultVatRate,
          defaultReportLang: p.defaultReportLang as never,
          enableAccrual: p.enableAccrual,
          companyCode: cc as never,
        },
      });
      return ok({ config: cfg, applied: presetKey });
    } catch (e) { return serverError(e); }
  });
}
