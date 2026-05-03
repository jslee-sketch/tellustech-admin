// VAS (Vietnam Accounting Standards) — 표준 계정과목표 (간략 버전).
// Layer 3 ChartOfAccounts 시드 + AccountMapping 기본값 생성에 사용.
// 실제 VAS 는 100+ 계정이 있지만 ERP 자동분개에 필요한 핵심 계정만 포함.

export type VasAccount = {
  code: string;
  nameVi: string;
  nameEn: string;
  nameKo: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  parentCode?: string;
  level: number;
  isLeaf: boolean;
};

export const VAS_ACCOUNTS: VasAccount[] = [
  // 1xx 자산 (ASSET)
  { code: "1", nameVi: "Tài sản", nameEn: "Assets", nameKo: "자산", type: "ASSET", level: 1, isLeaf: false },
  { code: "111", nameVi: "Tiền mặt", nameEn: "Cash on hand", nameKo: "현금", type: "ASSET", parentCode: "1", level: 2, isLeaf: true },
  { code: "112", nameVi: "Tiền gửi ngân hàng", nameEn: "Bank deposits", nameKo: "예금", type: "ASSET", parentCode: "1", level: 2, isLeaf: true },
  { code: "131", nameVi: "Phải thu khách hàng", nameEn: "Trade receivables", nameKo: "외상매출금", type: "ASSET", parentCode: "1", level: 2, isLeaf: true },
  { code: "133", nameVi: "Thuế GTGT được khấu trừ", nameEn: "Deductible VAT input", nameKo: "매입세액", type: "ASSET", parentCode: "1", level: 2, isLeaf: true },
  { code: "138", nameVi: "Phải thu khác", nameEn: "Other receivables", nameKo: "기타미수금", type: "ASSET", parentCode: "1", level: 2, isLeaf: true },
  { code: "141", nameVi: "Tạm ứng", nameEn: "Advances to employees", nameKo: "가지급금", type: "ASSET", parentCode: "1", level: 2, isLeaf: true },
  { code: "152", nameVi: "Nguyên vật liệu", nameEn: "Raw materials", nameKo: "원재료", type: "ASSET", parentCode: "1", level: 2, isLeaf: true },
  { code: "153", nameVi: "Công cụ dụng cụ", nameEn: "Tools & supplies", nameKo: "공구비품", type: "ASSET", parentCode: "1", level: 2, isLeaf: true },
  { code: "156", nameVi: "Hàng hóa", nameEn: "Merchandise inventory", nameKo: "상품", type: "ASSET", parentCode: "1", level: 2, isLeaf: true },
  { code: "211", nameVi: "Tài sản cố định hữu hình", nameEn: "Tangible fixed assets", nameKo: "유형자산", type: "ASSET", parentCode: "1", level: 2, isLeaf: true },
  { code: "214", nameVi: "Hao mòn TSCĐ", nameEn: "Accumulated depreciation", nameKo: "감가상각누계액", type: "ASSET", parentCode: "1", level: 2, isLeaf: true },

  // 3xx 부채 (LIABILITY)
  { code: "3", nameVi: "Nợ phải trả", nameEn: "Liabilities", nameKo: "부채", type: "LIABILITY", level: 1, isLeaf: false },
  { code: "331", nameVi: "Phải trả người bán", nameEn: "Trade payables", nameKo: "외상매입금", type: "LIABILITY", parentCode: "3", level: 2, isLeaf: true },
  { code: "333", nameVi: "Thuế và các khoản phải nộp", nameEn: "Taxes payable", nameKo: "미지급세금", type: "LIABILITY", parentCode: "3", level: 2, isLeaf: true },
  { code: "3331", nameVi: "Thuế GTGT phải nộp", nameEn: "VAT output payable", nameKo: "부가세예수금", type: "LIABILITY", parentCode: "333", level: 3, isLeaf: true },
  { code: "334", nameVi: "Phải trả người lao động", nameEn: "Payable to employees", nameKo: "미지급급여", type: "LIABILITY", parentCode: "3", level: 2, isLeaf: true },
  { code: "338", nameVi: "Phải trả phải nộp khác", nameEn: "Other payables", nameKo: "기타미지급금", type: "LIABILITY", parentCode: "3", level: 2, isLeaf: true },

  // 4xx 자본 (EQUITY)
  { code: "4", nameVi: "Vốn chủ sở hữu", nameEn: "Owner's equity", nameKo: "자본", type: "EQUITY", level: 1, isLeaf: false },
  { code: "411", nameVi: "Vốn đầu tư của chủ sở hữu", nameEn: "Paid-in capital", nameKo: "자본금", type: "EQUITY", parentCode: "4", level: 2, isLeaf: true },
  { code: "421", nameVi: "Lợi nhuận chưa phân phối", nameEn: "Retained earnings", nameKo: "이익잉여금", type: "EQUITY", parentCode: "4", level: 2, isLeaf: true },

  // 5xx 수익 (REVENUE)
  { code: "5", nameVi: "Doanh thu", nameEn: "Revenue", nameKo: "수익", type: "REVENUE", level: 1, isLeaf: false },
  { code: "511", nameVi: "Doanh thu bán hàng", nameEn: "Sales revenue", nameKo: "매출액", type: "REVENUE", parentCode: "5", level: 2, isLeaf: true },
  { code: "5111", nameVi: "Doanh thu bán hàng hóa", nameEn: "Merchandise sales", nameKo: "상품매출", type: "REVENUE", parentCode: "511", level: 3, isLeaf: true },
  { code: "5113", nameVi: "Doanh thu cung cấp dịch vụ", nameEn: "Service revenue", nameKo: "서비스매출", type: "REVENUE", parentCode: "511", level: 3, isLeaf: true },
  { code: "5117", nameVi: "Doanh thu cho thuê", nameEn: "Rental revenue", nameKo: "임대수익", type: "REVENUE", parentCode: "511", level: 3, isLeaf: true },
  { code: "515", nameVi: "Doanh thu hoạt động tài chính", nameEn: "Financial revenue", nameKo: "금융수익", type: "REVENUE", parentCode: "5", level: 2, isLeaf: true },
  { code: "711", nameVi: "Thu nhập khác", nameEn: "Other income", nameKo: "기타수익", type: "REVENUE", parentCode: "5", level: 2, isLeaf: true },

  // 6xx 비용 (EXPENSE)
  { code: "6", nameVi: "Chi phí", nameEn: "Expenses", nameKo: "비용", type: "EXPENSE", level: 1, isLeaf: false },
  { code: "632", nameVi: "Giá vốn hàng bán", nameEn: "Cost of goods sold", nameKo: "매출원가", type: "EXPENSE", parentCode: "6", level: 2, isLeaf: true },
  { code: "635", nameVi: "Chi phí tài chính", nameEn: "Financial expenses", nameKo: "금융비용", type: "EXPENSE", parentCode: "6", level: 2, isLeaf: true },
  { code: "641", nameVi: "Chi phí bán hàng", nameEn: "Selling expenses", nameKo: "판매비", type: "EXPENSE", parentCode: "6", level: 2, isLeaf: true },
  { code: "642", nameVi: "Chi phí quản lý doanh nghiệp", nameEn: "G&A expenses", nameKo: "관리비", type: "EXPENSE", parentCode: "6", level: 2, isLeaf: true },
  { code: "6421", nameVi: "Chi phí nhân viên QLDN", nameEn: "Admin payroll", nameKo: "급여(관리)", type: "EXPENSE", parentCode: "642", level: 3, isLeaf: true },
  { code: "6422", nameVi: "Chi phí vật liệu QLDN", nameEn: "Admin materials", nameKo: "관리자재비", type: "EXPENSE", parentCode: "642", level: 3, isLeaf: true },
  { code: "6423", nameVi: "Chi phí đồ dùng văn phòng", nameEn: "Office supplies", nameKo: "사무용품비", type: "EXPENSE", parentCode: "642", level: 3, isLeaf: true },
  { code: "6427", nameVi: "Chi phí dịch vụ mua ngoài", nameEn: "Outsourced services", nameKo: "외주용역비", type: "EXPENSE", parentCode: "642", level: 3, isLeaf: true },
  { code: "6428", nameVi: "Chi phí khác bằng tiền", nameEn: "Other cash expenses", nameKo: "기타현금비용", type: "EXPENSE", parentCode: "642", level: 3, isLeaf: true },
  { code: "811", nameVi: "Chi phí khác", nameEn: "Other expenses", nameKo: "기타비용", type: "EXPENSE", parentCode: "6", level: 2, isLeaf: true },
];

// 자동 분개 트리거별 기본 매핑 (VAS).
// 운영자가 마스터 화면에서 변경 가능.
export const DEFAULT_MAPPINGS: { trigger: string; accountCode: string; description: string }[] = [
  { trigger: "SALES_REVENUE", accountCode: "5111", description: "매출 인식 (상품매출)" },
  { trigger: "SALES_RECEIVABLE", accountCode: "131", description: "매출 미수금" },
  { trigger: "SALES_VAT_OUT", accountCode: "3331", description: "매출 부가세 예수금" },
  { trigger: "PURCHASE_INVENTORY", accountCode: "156", description: "매입 — 재고자산 (상품)" },
  { trigger: "PURCHASE_PAYABLE", accountCode: "331", description: "매입 미지급금" },
  { trigger: "PURCHASE_VAT_IN", accountCode: "133", description: "매입 부가세 (공제)" },
  { trigger: "CASH_IN", accountCode: "112", description: "입금 — 예금 증가" },
  { trigger: "CASH_OUT", accountCode: "112", description: "출금 — 예금 감소" },
  { trigger: "CASH_TRANSFER", accountCode: "112", description: "계좌 이체" },
  { trigger: "EXPENSE_OPEX", accountCode: "6428", description: "일반 운영비" },
  { trigger: "EXPENSE_CASH", accountCode: "111", description: "비용 즉시 출금 — 현금" },
  { trigger: "PAYROLL_SALARY", accountCode: "6421", description: "급여 비용" },
  { trigger: "PAYROLL_PAYABLE", accountCode: "334", description: "급여 미지급금" },
  { trigger: "RENTAL_REVENUE", accountCode: "5117", description: "임대 수익" },
];
