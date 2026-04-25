// 클라이언트/서버 공용 — 화면 라벨 다국어화 헬퍼 + 사전.
// 데이터(거래처명/직원명) 는 pickName() 으로 nameVi/nameEn/nameKo 중 선택.

export type Lang = "VI" | "EN" | "KO";

type Dict = Record<string, { vi: string; en: string; ko: string }>;

// UI 라벨 사전 — key 는 점 구분자로 영역 표기.
const DICT: Dict = {
  // ── 사이드바 그룹 ──
  "nav.master":      { vi: "Dữ liệu gốc",  en: "Master",        ko: "마스터" },
  "nav.sales":       { vi: "Bán hàng",     en: "Sales",         ko: "영업" },
  "nav.rental":      { vi: "Thuê",         en: "Rental",        ko: "렌탈" },
  "nav.as":          { vi: "Bảo hành",     en: "Service",       ko: "AS" },
  "nav.inventory":   { vi: "Kho",          en: "Inventory",     ko: "재고" },
  "nav.hr":          { vi: "Nhân sự",      en: "HR",            ko: "인사" },
  "nav.finance":     { vi: "Tài chính",    en: "Finance",       ko: "재경" },
  "nav.meeting":     { vi: "Họp",          en: "Meeting",       ko: "회의" },
  "nav.calendar":    { vi: "Lịch",         en: "Calendar",      ko: "캘린더" },
  "nav.messaging":   { vi: "Tin nhắn",     en: "Messaging",     ko: "메시징" },
  "nav.admin":       { vi: "Quản trị",     en: "Admin",         ko: "관리" },

  // ── 사이드바 항목 ──
  "nav.home":        { vi: "Trang chủ",       en: "Home",            ko: "홈" },
  "nav.clients":     { vi: "Khách hàng",      en: "Clients",         ko: "거래처" },
  "nav.items":       { vi: "Mặt hàng",        en: "Items",           ko: "품목" },
  "nav.employees":   { vi: "Nhân viên",       en: "Employees",       ko: "직원" },
  "nav.departments": { vi: "Phòng ban",       en: "Departments",     ko: "부서" },
  "nav.warehouses":  { vi: "Kho hàng",        en: "Warehouses",      ko: "창고" },
  "nav.projects":    { vi: "Dự án",           en: "Projects",        ko: "프로젝트" },
  "nav.schedules":   { vi: "Lịch trình·CFM",  en: "Schedules·CFM",   ko: "일정·CFM" },
  "nav.licenses":    { vi: "Giấy phép",       en: "Licenses",        ko: "라이선스" },
  "nav.salesOrder":  { vi: "Doanh thu",       en: "Sales Orders",    ko: "매출" },
  "nav.purchase":    { vi: "Mua hàng",        en: "Purchases",       ko: "매입" },
  "nav.itContract":  { vi: "Hợp đồng IT",     en: "IT Contracts",    ko: "IT 계약" },
  "nav.tmRental":    { vi: "Thuê TM",         en: "TM Rental",       ko: "TM 렌탈" },
  "nav.asTickets":   { vi: "Tiếp nhận",       en: "Tickets",         ko: "접수" },
  "nav.dispatches":  { vi: "Xuất phái",       en: "Dispatches",      ko: "출동" },
  "nav.stock":       { vi: "Tồn kho",         en: "Stock",           ko: "재고현황" },
  "nav.invTxn":      { vi: "Xuất nhập",       en: "Transactions",    ko: "입출고 현황" },
  "nav.qrScan":      { vi: "Quét QR",         en: "QR Scan",         ko: "QR 스캔" },
  "nav.qrLabel":     { vi: "Nhãn QR",         en: "QR Label",        ko: "QR 라벨 인쇄" },
  "nav.onboarding":  { vi: "Tiếp nhận NV",    en: "Onboarding",      ko: "입사" },
  "nav.offboarding": { vi: "Nghỉ việc",       en: "Offboarding",     ko: "퇴사" },
  "nav.incidents":   { vi: "Sự kiện",         en: "Incidents",       ko: "사건평가" },
  "nav.evaluations": { vi: "Đánh giá",        en: "Evaluations",     ko: "정기평가" },
  "nav.leave":       { vi: "Nghỉ phép",       en: "Leave",           ko: "연차" },
  "nav.payables":    { vi: "Phải thu/trả",    en: "AR/AP",           ko: "미수/미지급" },
  "nav.expenses":    { vi: "Chi phí",         en: "Expenses",        ko: "경비" },
  "nav.weeklyReport":{ vi: "Backlog/Công việc", en: "Backlog/Tasks", ko: "Backlog/업무진행" },
  "nav.chat":        { vi: "Trò chuyện",      en: "Chat",            ko: "채팅" },
  "nav.audit":       { vi: "Nhật ký kiểm toán", en: "Audit Logs",    ko: "감사로그" },

  // ── 대시보드 ──
  "dash.title":      { vi: "Bảng điều khiển", en: "Dashboard",       ko: "대시보드" },
  "dash.kpi.salesMonth":     { vi: "Doanh thu tháng",      en: "Monthly Sales",       ko: "이번달 매출" },
  "dash.kpi.purchaseMonth":  { vi: "Mua hàng tháng",       en: "Monthly Purchase",    ko: "이번달 매입" },
  "dash.kpi.outstanding":    { vi: "Phải thu còn lại",     en: "Outstanding AR",      ko: "미수금 잔액" },
  "dash.kpi.payable":        { vi: "Phải trả còn lại",     en: "Outstanding AP",      ko: "미지급금 잔액" },
  "dash.kpi.asPending":      { vi: "Bảo hành đang xử lý",  en: "AS In Progress",      ko: "AS 진행중" },
  "dash.kpi.expiring":       { vi: "Hợp đồng/Chứng chỉ",   en: "Expiring",            ko: "계약·성적서 만료" },
  "dash.kpi.cases":          { vi: "đơn",                  en: "items",               ko: "건" },
  "dash.kpi.expiringSub":    { vi: "Trong 30 ngày",        en: "Within 30 days",      ko: "30일 이내" },

  "dash.card.master":      { vi: "Dữ liệu gốc",  en: "Master Data",       ko: "기초등록" },
  "dash.card.contracts":   { vi: "Hợp đồng",     en: "Contracts",         ko: "렌탈 · 계약" },
  "dash.card.salesPurchase": { vi: "Bán/Mua hàng", en: "Sales / Purchase", ko: "영업" },
  "dash.card.service":     { vi: "Dịch vụ",      en: "Service",           ko: "AS · 서비스" },
  "dash.card.inventory":   { vi: "Kho",          en: "Inventory",         ko: "재고" },
  "dash.card.hr":          { vi: "Nhân sự",      en: "Human Resources",   ko: "HR" },
  "dash.card.finance":     { vi: "Tài chính",    en: "Finance",           ko: "재경" },
  "dash.card.collab":      { vi: "Cộng tác",     en: "Collaboration",     ko: "협업" },
  "dash.card.meeting":     { vi: "Họp tuần",     en: "Weekly Meeting",    ko: "회의" },

  // ── 캘린더 히어로 ──
  "hero.calendar":         { vi: "Lịch tích hợp",       en: "Unified Calendar",   ko: "통합 캘린더" },
  "hero.calendarSub":      { vi: "Tất cả lịch trong 1 nơi", en: "12 modules in one view", ko: "12개 모듈 일정 한눈에" },
  "hero.next14":           { vi: "việc trong 14 ngày",  en: "events next 14 days", ko: "건 다음 14일" },
  "hero.empty":            { vi: "Không có lịch sắp tới", en: "No upcoming events", ko: "다가오는 일정이 없습니다." },
  "hero.assignee":         { vi: "Phụ trách",           en: "Assignee",            ko: "담당" },

  // ── 캘린더 이벤트 타입 ──
  "type.SCHEDULE_DEADLINE": { vi: "Hạn lịch trình",     en: "Schedule deadline",   ko: "일정 마감" },
  "type.WEEKLY_REPORT":     { vi: "Hạn họp tuần",       en: "Weekly meeting",      ko: "회의 마감" },
  "type.CONTRACT_EXPIRY":   { vi: "Hết hạn HĐ IT",      en: "Contract expiry",     ko: "IT계약 만료" },
  "type.CERT_EXPIRY":       { vi: "Hết hạn chứng chỉ",  en: "Cert expiry",         ko: "성적서 만료" },
  "type.LICENSE_EXPIRY":    { vi: "Hết hạn giấy phép",  en: "License expiry",      ko: "라이선스 만료" },
  "type.AR_DUE":            { vi: "Đến hạn phải thu",   en: "AR due",              ko: "미수금 납기" },
  "type.LEAVE":             { vi: "Nghỉ phép",          en: "Leave",               ko: "연차/휴가" },
  "type.AS_DISPATCH":       { vi: "Xuất phái BH",       en: "AS dispatch",         ko: "AS 출동" },
  "type.RENTAL_ORDER":      { vi: "Đơn thuê",           en: "Rental order",        ko: "렌탈 오더" },
  "type.BIRTHDAY":          { vi: "Sinh nhật",          en: "Birthday",            ko: "직원 생일" },
  "type.HOLIDAY_VN":        { vi: "🇻🇳 Lễ",              en: "🇻🇳 Holiday",          ko: "🇻🇳 공휴일" },
  "type.HOLIDAY_KR":        { vi: "🇰🇷 Lễ",              en: "🇰🇷 Holiday",          ko: "🇰🇷 공휴일" },
  "type.CUSTOM":            { vi: "Sự kiện",            en: "Event",               ko: "이벤트" },

  "badge.RED":    { vi: "🔴 Quá hạn",   en: "🔴 Overdue", ko: "🔴 초과" },
  "badge.YELLOW": { vi: "🟡 Sắp tới",   en: "🟡 Soon",    ko: "🟡 임박" },
  "badge.GREEN":  { vi: "🟢 Còn thời gian", en: "🟢 OK",  ko: "🟢 여유" },
};

export function t(key: string, lang: Lang): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang.toLowerCase() as "vi" | "en" | "ko"] ?? entry.ko;
}

// 거래처/직원 이름처럼 nameVi/nameEn/nameKo 3컬럼 중 현재 언어 우선 선택.
// suffix 자동 결정: VI→Vi, EN→En, KO→Ko.
export function pickName<T extends Record<string, unknown>>(
  rec: T | null | undefined,
  lang: Lang,
  base: string = "name",
): string {
  if (!rec) return "";
  const order: Lang[] = lang === "VI" ? ["VI", "EN", "KO"] : lang === "EN" ? ["EN", "VI", "KO"] : ["KO", "VI", "EN"];
  for (const l of order) {
    const k = base + l[0] + l[1].toLowerCase();
    const v = rec[k as keyof T];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}
