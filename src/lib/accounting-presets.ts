// 회계 표준 프리셋 — VAS / K_IFRS / IFRS.
// AccountingConfig 의 표준 변경 시 ChartOfAccount 코드 매핑이 약간 다르지만
// 현재 구현은 VAS 기준 단일 시드. K_IFRS / IFRS 는 향후 별도 시드로 추가.

export type AccountingPreset = {
  standard: "VAS" | "K_IFRS" | "IFRS";
  defaultVatRate: number;
  fiscalYearStart: "JAN" | "APR" | "JUL" | "OCT";
  reportingCurrency: "VND" | "KRW" | "USD";
  defaultReportLang: "VI" | "EN" | "KO";
  enableAccrual: boolean;
  description: { vi: string; en: string; ko: string };
};

export const ACCOUNTING_PRESETS: Record<string, AccountingPreset> = {
  VAS: {
    standard: "VAS",
    defaultVatRate: 0.10,
    fiscalYearStart: "JAN",
    reportingCurrency: "VND",
    defaultReportLang: "VI",
    enableAccrual: true,
    description: {
      vi: "Chuẩn mực kế toán Việt Nam (Thông tư 200/2014/TT-BTC). Hệ thống TK ba số, VAT 10% mặc định.",
      en: "Vietnam Accounting Standards (Circular 200). Three-digit account chart, default 10% VAT.",
      ko: "베트남 회계기준 (Circular 200/2014/TT-BTC). 3자리 계정코드, VAT 10% 기본.",
    },
  },
  K_IFRS: {
    standard: "K_IFRS",
    defaultVatRate: 0.10,
    fiscalYearStart: "JAN",
    reportingCurrency: "KRW",
    defaultReportLang: "KO",
    enableAccrual: true,
    description: {
      vi: "Chuẩn IFRS áp dụng tại Hàn Quốc — IAS·IFRS đầy đủ + bổ sung địa phương.",
      en: "Korean adoption of IFRS — full IAS/IFRS + local supplements.",
      ko: "한국채택국제회계기준 — IAS·IFRS 전체 + 한국 추가기준.",
    },
  },
  IFRS: {
    standard: "IFRS",
    defaultVatRate: 0,
    fiscalYearStart: "JAN",
    reportingCurrency: "USD",
    defaultReportLang: "EN",
    enableAccrual: true,
    description: {
      vi: "Chuẩn mực Báo cáo Tài chính Quốc tế — phiên bản đầy đủ.",
      en: "International Financial Reporting Standards — full version.",
      ko: "국제회계기준 (IASB) — 풀버전.",
    },
  },
};
