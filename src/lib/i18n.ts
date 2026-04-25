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

  // ── 공통 액션 / 라벨 ──
  "action.back":          { vi: "← Quay lại",        en: "← Back",            ko: "← 뒤로" },
  "action.list":          { vi: "Danh sách",         en: "List",              ko: "목록" },
  "action.new":           { vi: "+ Tạo mới",         en: "+ New",             ko: "+ 등록" },
  "action.create":        { vi: "Tạo",               en: "Create",            ko: "생성" },
  "action.edit":          { vi: "Sửa",               en: "Edit",              ko: "수정" },
  "action.save":          { vi: "Lưu",               en: "Save",              ko: "저장" },
  "action.delete":        { vi: "Xoá",               en: "Delete",            ko: "삭제" },
  "action.cancel":        { vi: "Huỷ",               en: "Cancel",            ko: "취소" },
  "action.detail":        { vi: "Chi tiết",          en: "Detail",            ko: "상세" },
  "action.export":        { vi: "Xuất Excel",        en: "Export Excel",      ko: "엑셀 다운로드" },
  "action.import":        { vi: "Nhập Excel",        en: "Import Excel",      ko: "엑셀 일괄 업로드" },

  // ── 매출 ──
  "page.sales.title":     { vi: "Quản lý doanh thu", en: "Sales",             ko: "매출 관리" },
  "page.sales.new":       { vi: "Tạo đơn doanh thu", en: "New Sales",         ko: "매출 등록" },
  "page.sales.detail":    { vi: "Chi tiết doanh thu", en: "Sales Detail",     ko: "매출 상세" },
  "page.sales.back":      { vi: "← Danh sách doanh thu", en: "← Back to Sales", ko: "← 매출 목록" },
  "page.sales.import":    { vi: "📥 Nhập dòng (Excel)", en: "📥 Import Lines (Excel)", ko: "📥 라인 엑셀 일괄 업로드" },

  // ── 매입 ──
  "page.purchases.title": { vi: "Quản lý mua hàng",  en: "Purchases",         ko: "매입 관리" },
  "page.purchases.new":   { vi: "Tạo phiếu mua",     en: "New Purchase",      ko: "매입 등록" },
  "page.purchases.detail":{ vi: "Chi tiết mua hàng", en: "Purchase Detail",   ko: "매입 상세" },
  "page.purchases.back":  { vi: "← Danh sách mua hàng", en: "← Back to Purchases", ko: "← 매입 목록" },
  "page.purchases.import":{ vi: "📥 Nhập dòng (Excel)", en: "📥 Import Lines (Excel)", ko: "📥 라인 엑셀 일괄 업로드" },

  // ── 마스터 · 거래처 ──
  "page.clients.title":   { vi: "Dữ liệu gốc · Khách hàng", en: "Master · Clients", ko: "기초등록 · 거래처" },
  "page.clients.new":     { vi: "Tạo khách hàng",    en: "New Client",        ko: "거래처 등록" },
  "page.clients.detail":  { vi: "Chi tiết khách hàng", en: "Client Detail",   ko: "거래처 상세" },
  "page.clients.back":    { vi: "← Danh sách khách hàng", en: "← Back to Clients", ko: "← 거래처 목록" },

  // ── 마스터 · 품목 ──
  "page.items.title":     { vi: "Dữ liệu gốc · Mặt hàng", en: "Master · Items", ko: "기초등록 · 품목" },
  "page.items.new":       { vi: "Tạo mặt hàng",      en: "New Item",          ko: "품목 등록" },
  "page.items.detail":    { vi: "Sửa mặt hàng",      en: "Edit Item",         ko: "품목 수정" },
  "page.items.back":      { vi: "← Danh sách mặt hàng", en: "← Back to Items", ko: "← 품목 목록" },

  // ── 마스터 · 직원 ──
  "page.employees.title": { vi: "Dữ liệu gốc · Nhân viên", en: "Master · Employees", ko: "기초등록 · 직원" },
  "page.employees.new":   { vi: "Tạo nhân viên",     en: "New Employee",      ko: "직원 등록" },
  "page.employees.detail":{ vi: "Sửa nhân viên",     en: "Edit Employee",     ko: "직원 수정" },
  "page.employees.back":  { vi: "← Danh sách nhân viên", en: "← Back to Employees", ko: "← 직원 목록" },

  // ── 마스터 · 부서 ──
  "page.departments.title":  { vi: "Dữ liệu gốc · Phòng ban", en: "Master · Departments", ko: "기초등록 · 부서" },
  "page.departments.new":    { vi: "Tạo phòng ban",  en: "New Department",    ko: "부서 등록" },
  "page.departments.detail": { vi: "Sửa phòng ban",  en: "Edit Department",   ko: "부서 수정" },
  "page.departments.back":   { vi: "← Danh sách phòng ban", en: "← Back to Departments", ko: "← 부서 목록" },

  // ── 마스터 · 창고 ──
  "page.warehouses.title":   { vi: "Dữ liệu gốc · Kho hàng", en: "Master · Warehouses", ko: "기초등록 · 창고" },
  "page.warehouses.new":     { vi: "Tạo kho",        en: "New Warehouse",     ko: "창고 등록" },
  "page.warehouses.detail":  { vi: "Sửa kho",        en: "Edit Warehouse",    ko: "창고 수정" },
  "page.warehouses.back":    { vi: "← Danh sách kho", en: "← Back to Warehouses", ko: "← 창고 목록" },

  // ── 마스터 · 프로젝트 ──
  "page.projects.title":     { vi: "Dữ liệu gốc · Dự án", en: "Master · Projects", ko: "기초등록 · 프로젝트" },
  "page.projects.new":       { vi: "Tạo dự án",      en: "New Project",       ko: "프로젝트 등록" },
  "page.projects.detail":    { vi: "Sửa dự án",      en: "Edit Project",      ko: "프로젝트 수정" },
  "page.projects.back":      { vi: "← Danh sách dự án", en: "← Back to Projects", ko: "← 프로젝트 목록" },

  // ── 마스터 · 일정/CFM ──
  "page.schedules.title":    { vi: "Quản lý lịch trình · CFM", en: "Schedules · CFM", ko: "일정(마감) 관리 · CFM" },
  "page.schedules.new":      { vi: "Tạo lịch trình", en: "New Schedule",      ko: "일정(마감) 등록" },
  "page.schedules.detail":   { vi: "Chi tiết lịch trình", en: "Schedule Detail", ko: "일정 상세" },
  "page.schedules.back":     { vi: "← Danh sách lịch trình", en: "← Back to Schedules", ko: "← 일정 목록" },

  // ── 마스터 · 라이선스 ──
  "page.licenses.title":     { vi: "Quản lý giấy phép", en: "Licenses",       ko: "라이선스 관리" },
  "page.licenses.new":       { vi: "Tạo giấy phép",  en: "New License",       ko: "라이선스 등록" },
  "page.licenses.detail":    { vi: "Chi tiết giấy phép", en: "License Detail", ko: "라이선스 상세" },
  "page.licenses.back":      { vi: "← Danh sách giấy phép", en: "← Back to Licenses", ko: "← 라이선스 목록" },

  // ── 렌탈 · IT 계약 ──
  "page.itContract.title":   { vi: "Cho thuê · Hợp đồng IT", en: "Rental · IT Contracts", ko: "렌탈 · IT 계약" },
  "page.itContract.new":     { vi: "Tạo hợp đồng IT", en: "New IT Contract",  ko: "IT 계약 등록" },
  "page.itContract.detail":  { vi: "Chi tiết hợp đồng IT", en: "IT Contract Detail", ko: "IT 계약 상세" },
  "page.itContract.back":    { vi: "← Danh sách hợp đồng IT", en: "← Back to IT Contracts", ko: "← IT 계약 목록" },
  "page.itContract.import":  { vi: "📥 Nhập thiết bị (Excel)", en: "📥 Import Equipment (Excel)", ko: "📥 장비 엑셀 일괄 업로드" },

  // ── 렌탈 · TM ──
  "page.tmRental.title":     { vi: "Cho thuê · TM",  en: "Rental · TM",       ko: "렌탈 · TM 렌탈" },
  "page.tmRental.new":       { vi: "Tạo TM Rental",  en: "New TM Rental",     ko: "TM 렌탈 등록" },
  "page.tmRental.detail":    { vi: "Chi tiết TM Rental", en: "TM Rental Detail", ko: "TM 렌탈 상세" },
  "page.tmRental.back":      { vi: "← Danh sách TM Rental", en: "← Back to TM Rental", ko: "← TM 렌탈 목록" },
  "page.tmRental.import":    { vi: "📥 Nhập mặt hàng (Excel)", en: "📥 Import Items (Excel)", ko: "📥 품목 엑셀 일괄 업로드" },

  // ── AS · 접수 ──
  "page.asTickets.title":    { vi: "Quản lý BH · Tiếp nhận", en: "AS · Tickets", ko: "AS 관리 · 접수" },
  "page.asTickets.new":      { vi: "Tiếp nhận AS",   en: "New AS Ticket",     ko: "AS 접수" },
  "page.asTickets.detail":   { vi: "Chi tiết AS",    en: "AS Ticket Detail",  ko: "AS 상세" },
  "page.asTickets.back":     { vi: "← Danh sách AS", en: "← Back to AS",      ko: "← AS 목록" },

  // ── AS · 출동 ──
  "page.dispatches.title":   { vi: "AS · Xuất phái", en: "AS · Dispatches",   ko: "AS · 출동" },
  "page.dispatches.new":     { vi: "Tạo xuất phái",  en: "New Dispatch",      ko: "출동 등록" },
  "page.dispatches.detail":  { vi: "Chi tiết xuất phái", en: "Dispatch Detail", ko: "출동 상세" },
  "page.dispatches.back":    { vi: "← Danh sách xuất phái", en: "← Back to Dispatches", ko: "← 출동 목록" },
  "page.dispatches.backTickets": { vi: "← Phiếu AS", en: "← AS Tickets",      ko: "← AS 전표" },

  // ── 재고 ──
  "page.stock.title":        { vi: "Kho · Tồn kho",  en: "Inventory · Stock", ko: "재고 · 현황" },
  "page.invTxn.title":       { vi: "Kho · Xuất nhập", en: "Inventory · Transactions", ko: "재고 · 입출고 현황" },
  "page.invTxn.new":         { vi: "Tạo phiếu xuất nhập", en: "New Transaction", ko: "입출고 등록" },
  "page.invTxn.back":        { vi: "← Xuất nhập",    en: "← Transactions",    ko: "← 입출고 현황" },
  "page.invTxn.import":      { vi: "📥 Nhập (Excel)", en: "📥 Import (Excel)", ko: "📥 엑셀 일괄 업로드" },
  "page.qrScan.title":       { vi: "📷 Quét QR Xuất nhập", en: "📷 QR Scan I/O", ko: "📷 QR 스캔 입출고" },
  "page.qrLabel.title":      { vi: "In nhãn QR",     en: "QR Label Print",    ko: "QR 라벨 인쇄" },
  "page.depreciation.title": { vi: "Kho · Khấu hao", en: "Inventory · Depreciation", ko: "재고 · 감가상각" },

  // ── HR ──
  "page.onboarding.title":   { vi: "HR · Tiếp nhận NV", en: "HR · Onboarding", ko: "HR · 입사카드" },
  "page.onboarding.new":     { vi: "Tạo phiếu tiếp nhận", en: "New Onboarding", ko: "입사카드 등록" },
  "page.onboarding.detail":  { vi: "Chi tiết tiếp nhận", en: "Onboarding Detail", ko: "입사카드 상세" },
  "page.onboarding.back":    { vi: "← Danh sách tiếp nhận", en: "← Back to Onboarding", ko: "← 입사카드 목록" },

  "page.offboarding.title":  { vi: "HR · Nghỉ việc", en: "HR · Offboarding",  ko: "HR · 퇴사카드" },
  "page.offboarding.new":    { vi: "Tạo phiếu nghỉ việc", en: "New Offboarding", ko: "퇴사카드 등록" },
  "page.offboarding.detail": { vi: "Chi tiết nghỉ việc", en: "Offboarding Detail", ko: "퇴사카드 상세" },
  "page.offboarding.back":   { vi: "← Danh sách nghỉ việc", en: "← Back to Offboarding", ko: "← 퇴사카드 목록" },

  "page.incidents.title":    { vi: "HR · Đánh giá theo sự kiện", en: "HR · Incident Evaluation", ko: "HR · 사건기반 수시평가" },
  "page.incidents.new":      { vi: "Tạo đánh giá sự kiện", en: "New Incident", ko: "사건기반 수시평가 등록" },
  "page.incidents.detail":   { vi: "Chi tiết sự kiện", en: "Incident Detail", ko: "사건평가 상세" },
  "page.incidents.back":     { vi: "← Danh sách sự kiện", en: "← Back to Incidents", ko: "← 사건평가 목록" },

  "page.evaluations.title":  { vi: "HR · Đánh giá định kỳ", en: "HR · Evaluations", ko: "HR · 정기 인사평가" },
  "page.evaluations.new":    { vi: "Tạo đánh giá định kỳ", en: "New Evaluation", ko: "정기 인사평가 등록" },
  "page.evaluations.detail": { vi: "Chi tiết đánh giá", en: "Evaluation Detail", ko: "정기평가 상세" },
  "page.evaluations.back":   { vi: "← Danh sách đánh giá", en: "← Back to Evaluations", ko: "← 정기평가 목록" },
  "page.evaluations.ai":     { vi: "Đánh giá tổng hợp AI", en: "AI Comprehensive Evaluation", ko: "AI 종합 인사평가" },

  "page.leave.title":        { vi: "HR · Nghỉ phép",  en: "HR · Leave",       ko: "HR · 연차/휴가" },
  "page.leave.new":          { vi: "Đăng ký nghỉ phép", en: "New Leave Request", ko: "연차/휴가 신청" },
  "page.leave.detail":       { vi: "Chi tiết nghỉ phép", en: "Leave Detail",  ko: "연차 상세" },
  "page.leave.back":         { vi: "← Danh sách nghỉ phép", en: "← Back to Leave", ko: "← 연차 목록" },

  // ── Finance ──
  "page.payables.title":     { vi: "Tài chính · Phải thu/Phải trả", en: "Finance · AR/AP", ko: "재경 · 미수/미지급" },
  "page.payables.detail":    { vi: "Chi tiết phải thu/trả", en: "AR/AP Detail", ko: "미수/미지급 상세" },
  "page.payables.back":      { vi: "← Phải thu/trả", en: "← AR/AP",           ko: "← 미수/미지급" },
  "page.payables.AR":        { vi: "Phải thu",       en: "Receivable",        ko: "미수금" },
  "page.payables.AP":        { vi: "Phải trả",       en: "Payable",           ko: "미지급금" },

  "page.expenses.title":     { vi: "Tài chính · Chi phí", en: "Finance · Expenses", ko: "재경 · 비용" },
  "page.expenses.new":       { vi: "Tạo chi phí",    en: "New Expense",       ko: "비용 등록" },
  "page.expenses.detail":    { vi: "Chi tiết chi phí", en: "Expense Detail",  ko: "비용 상세" },
  "page.expenses.back":      { vi: "← Danh sách chi phí", en: "← Back to Expenses", ko: "← 비용 목록" },

  // ── Calendar / Weekly ──
  "page.calendar.title":     { vi: "Lịch",           en: "Calendar",          ko: "캘린더" },
  "page.weekly.title":       { vi: "Họp tuần",       en: "Weekly Meeting",    ko: "주간회의자료" },

  // ── Chat ──
  "page.chat.title":         { vi: "💬 Trò chuyện",  en: "💬 Chat",           ko: "💬 채팅" },
  "page.chat.new":           { vi: "Tạo phòng chat", en: "New Chat Room",     ko: "채팅방 생성" },
  "page.chat.back":          { vi: "← Trò chuyện",   en: "← Chat",            ko: "← 채팅" },

  // ── Admin ──
  "page.audit.title":        { vi: "🧾 Nhật ký kiểm toán (Audit Log)", en: "🧾 Audit Log", ko: "🧾 감사 로그 (Audit Log)" },

  // ── Portal ──
  "page.portal.back":        { vi: "← Cổng KH",      en: "← Portal",          ko: "← 포탈" },
  "page.portal.usage":       { vi: "Xác nhận sử dụng theo tháng", en: "Monthly Usage Confirmation", ko: "월별 사용량 컨펌" },
  "page.portal.supplies":    { vi: "📦 Yêu cầu vật tư", en: "📦 Supplies Request", ko: "📦 소모품 요청" },
  "page.portal.asRequest":   { vi: "Yêu cầu BH",     en: "AS Request",        ko: "AS 요청" },
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
