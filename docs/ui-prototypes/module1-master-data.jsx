import { useState, useEffect } from "react";

// ─── Design System ───
const T = {
  bg: "#F4F3F0", card: "#FFFFFF", primary: "#1A3A4A", primaryLight: "#E4ECF0",
  accent: "#C8702A", accentLight: "#FFF4EA", success: "#1B7A4E", successLight: "#E6F5ED",
  danger: "#B92D2D", dangerLight: "#FDECEC", info: "#2563EB", infoLight: "#EFF6FF",
  warn: "#92680A", warnLight: "#FFFBEB", text: "#1A1A1A", sub: "#6E6E6E",
  border: "#DDD9D3", borderFocus: "#1A3A4A", inputBg: "#FAFAF8",
};

const FONT = `'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif`;

// ─── Sample Data from actual Excel files ───
const DEPTS = [
  { dept_code: "TVBN", dept_name: "Tellus Tech Vina Bac Ninh", is_active: true },
  { dept_code: "TVHN", dept_name: "Tellus Tech Vina Hanoi", is_active: true },
  { dept_code: "TVHCM", dept_name: "Tellus Tech Vina Ho Chi Minh", is_active: true },
  { dept_code: "TVNT", dept_name: "Tellus Tech Vina Nha Trang", is_active: true },
  { dept_code: "TVDN", dept_name: "Tellus Tech Vina Da Nang", is_active: true },
  { dept_code: "VRBN", dept_name: "Vietrental Bac Ninh", is_active: true },
  { dept_code: "VRHN", dept_name: "Vietrental Hanoi", is_active: true },
  { dept_code: "VRHCM", dept_name: "Vietrental Ho Chi Minh", is_active: true },
  { dept_code: "VRNT", dept_name: "Vietrental Nha Trang", is_active: true },
  { dept_code: "VRDN", dept_name: "Vietrental Da Nang", is_active: true },
];

const EMPLOYEES = [
  { emp_code: "TNV00003", emp_name: "Nguyễn Văn Hùng", dept_code: "TVBN", position: "Quản Lý", hire_date: "2012-11-10", role: "manager", is_active: true, base_salary: 59593500, phone: "" },
  { emp_code: "TNV00006", emp_name: "HN / Phạm Đức Khang", dept_code: "TVHN", position: "Kỹ Thuật Máy in", hire_date: "2014-11-24", role: "tech", is_active: true, base_salary: 13837500, phone: "" },
  { emp_code: "TNV00007", emp_name: "BN / Trần Huy Lộc", dept_code: "TVBN", position: "Kỹ Thuật máy sóng", hire_date: "2014-12-01", role: "tech", is_active: true, base_salary: 13325000, phone: "" },
  { emp_code: "TNV00012", emp_name: "BN / Nguyễn Thị Lý", dept_code: "TVBN", position: "Phiên Dịch", hire_date: "2015-06-07", role: "admin", is_active: true, base_salary: 24480000, phone: "" },
  { emp_code: "TNV00037", emp_name: "HCM / Huỳnh Nguyễn Nhật Tân", dept_code: "TVHCM", position: "Kỹ Thuật Máy in", hire_date: "2018-04-18", role: "tech", is_active: true, base_salary: 8712500, phone: "" },
  { emp_code: "VNV00033", emp_name: "HN / Nguyễn Thị Thu Hương", dept_code: "VRHN", position: "NV Kinh Doanh", hire_date: "2024-05-02", role: "sales", is_active: true, base_salary: 0, phone: "" },
  { emp_code: "VNV00054", emp_name: "HCM / Dương Minh Thuận", dept_code: "VRHCM", position: "Kỹ Thuật Máy in", hire_date: "2021-01-28", role: "tech", is_active: true, base_salary: 7000000, phone: "" },
  { emp_code: "VNV00070", emp_name: "BN / Nguyễn Văn Linh", dept_code: "VRBN", position: "Kỹ Thuật Máy in", hire_date: "2022-10-03", role: "tech", is_active: true, base_salary: 0, phone: "" },
  { emp_code: "VNV00078", emp_name: "HCM / Đoàn Đức Hiền", dept_code: "VRHCM", position: "Kỹ Thuật Máy in", hire_date: "2022-05-11", role: "tech", is_active: true, base_salary: 8200000, phone: "" },
  { emp_code: "VNV00091", emp_name: "BN / Trương Viết Thiết", dept_code: "VRBN", position: "Kỹ Thuật Máy in", hire_date: "2023-05-04", role: "tech", is_active: true, base_salary: 0, phone: "" },
  { emp_code: "VTVN10014", emp_name: "HN / Lee Su Mok", dept_code: "TVHN", position: "Quản Lý", hire_date: "2024-04-08", role: "manager", is_active: true, base_salary: 0, phone: "" },
  { emp_code: "TNV00089", emp_name: "BN / Nguyễn Thị Phượng", dept_code: "TVBN", position: "Quản lý kế toán", hire_date: "2024-11-26", role: "accounting", is_active: true, base_salary: 0, phone: "" },
];

const CLIENTS = [
  { client_code: "55586", client_name: "AEMOREPACIFIC", representative: "", phone: "", payment_terms: 30, client_grade: "B", ar_status: "normal", acquisition_channel: "existing", email_consent: true },
  { client_code: "56719", client_name: "ABCO ELECTRONICS VINA", representative: "", phone: "", payment_terms: 30, client_grade: "B", ar_status: "normal", acquisition_channel: "visit", email_consent: true },
  { client_code: "00051", client_name: "ABLE ENGINEERING", representative: "", phone: "", payment_terms: 30, client_grade: "C", ar_status: "normal", acquisition_channel: "referral", email_consent: false },
  { client_code: "00210", client_name: "ACE ANTENNA", representative: "", phone: "0963323426", payment_terms: 60, client_grade: "A", ar_status: "normal", acquisition_channel: "existing", email_consent: true },
  { client_code: "56471", client_name: "ALMUS VINA", representative: "Mr HA TAE WOOK", phone: "02103950999", payment_terms: 30, client_grade: "B", ar_status: "warning", acquisition_channel: "visit", email_consent: true },
  { client_code: "55588", client_name: "AMOREPACIFIC", representative: "", phone: "", payment_terms: 30, client_grade: "A", ar_status: "normal", acquisition_channel: "existing", email_consent: true },
  { client_code: "00360", client_name: "ACE ACADEMY / 홍사웅", representative: "홍사웅", phone: "0911651066", payment_terms: 30, client_grade: "B", ar_status: "blocked", acquisition_channel: "referral", email_consent: false },
];

const ITEMS = [
  { item_code: "D320T24KK-V", item_name: "Mực đen D330/D331 (토너K)", manufacturer: "SINDOH", category: "consumable", device_line: "D330", min_stock: 10, is_asset: false },
  { item_code: "D320T24KC-V", item_name: "Mực Xanh D330/D331 (토너C)", manufacturer: "SINDOH", category: "consumable", device_line: "D330", min_stock: 10, is_asset: false },
  { item_code: "D320T24KM-V", item_name: "Mực đỏ D330/D331 (토너M)", manufacturer: "SINDOH", category: "consumable", device_line: "D330", min_stock: 10, is_asset: false },
  { item_code: "D320T24KY-V", item_name: "Mực vàng D330/D331 (토너Y)", manufacturer: "SINDOH", category: "consumable", device_line: "D330", min_stock: 10, is_asset: false },
  { item_code: "CLT-K806S", item_name: "Toner Black X7500 (토너K)", manufacturer: "SAMSUNG", category: "consumable", device_line: "X7500", min_stock: 5, is_asset: false },
  { item_code: "D320R105KK-V", item_name: "Catridge trống D330 Black (드럼K)", manufacturer: "SINDOH", category: "part", device_line: "D330", min_stock: 5, is_asset: false },
  { item_code: "00001", item_name: "E5515C - Wireless Comms Test Set", manufacturer: "Keysight", category: "product", device_line: "T&M", min_stock: 0, is_asset: true },
  { item_code: "N9020B", item_name: "N9020B - PXA Signal Analyzer", manufacturer: "Keysight", category: "product", device_line: "T&M", min_stock: 0, is_asset: true },
];

const WAREHOUSES = [
  { wh_code: "ITMAIN", wh_name: "IT MAIN STOCK", wh_type: "internal", is_active: true },
  { wh_code: "BNIT", wh_name: "Tellustech vina BN IT (Mua-Bán)", wh_type: "internal", is_active: true },
  { wh_code: "HNIT", wh_name: "Tellustech vina HN IT (Mua-Bán)", wh_type: "internal", is_active: true },
  { wh_code: "HCMIT", wh_name: "Tellustech vina HCM IT", wh_type: "internal", is_active: true },
  { wh_code: "NTRIT", wh_name: "Tellustech vina NTR IT(Mua-Bán)", wh_type: "internal", is_active: true },
  { wh_code: "TMBN", wh_name: "Tellustechvina TM_service", wh_type: "internal", is_active: true },
  { wh_code: "VRTM", wh_name: "Vietrental TM_Service", wh_type: "internal", is_active: true },
];

const PROJECTS = [
  { project_code: "IT0003", project_name: "IT Rental(R)", is_active: true },
  { project_code: "IT0001", project_name: "IT Buy&sell", is_active: true },
  { project_code: "IT0005", project_name: "IT Repair(F)", is_active: true },
  { project_code: "IT0007", project_name: "IT Maintenance(M)", is_active: true },
  { project_code: "00065", project_name: "회수 (thu hồi)", is_active: true },
  { project_code: "00041", project_name: "Mobile - Repair", is_active: true },
  { project_code: "00059", project_name: "재고조정이동", is_active: true },
];

// ─── UI Components ───
const Badge = ({ text, color, bg }) => (
  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, color, background: bg, letterSpacing: "0.02em" }}>{text}</span>
);

const StatusBadge = ({ status }) => {
  const m = { normal: [T.success, T.successLight, "정상"], warning: [T.warn, T.warnLight, "주의"], blocked: [T.danger, T.dangerLight, "차단"],
    true: [T.success, T.successLight, "활성"], false: [T.sub, "#F0F0F0", "비활성"],
    admin: [T.primary, T.primaryLight, "Admin"], manager: [T.accent, T.accentLight, "Manager"], sales: [T.info, T.infoLight, "Sales"],
    tech: [T.success, T.successLight, "Tech"], calibration: ["#7C3AED", "#F3E8FF", "Cal"], accounting: [T.warn, T.warnLight, "Acct"], hr: ["#DB2777", "#FCE7F3", "HR"],
    product: [T.primary, T.primaryLight, "상품"], consumable: [T.accent, T.accentLight, "소모품"], part: [T.info, T.infoLight, "부품"], asset: [T.danger, T.dangerLight, "자산"],
    A: [T.success, T.successLight, "A"], B: [T.info, T.infoLight, "B"], C: [T.warn, T.warnLight, "C"], D: [T.danger, T.dangerLight, "D"],
    internal: [T.primary, T.primaryLight, "내부"], external: [T.accent, T.accentLight, "외부"], customer: [T.info, T.infoLight, "고객"],
  };
  const s = m[status] || [T.sub, "#F0F0F0", status];
  return <Badge text={s[2]} color={s[0]} bg={s[1]} />;
};

const Btn = ({ children, onClick, v = "primary", sz = "md", disabled }) => {
  const s = { primary: { bg: T.primary, c: "#fff" }, outline: { bg: "transparent", c: T.primary, bd: T.primary }, danger: { bg: T.danger, c: "#fff" }, ghost: { bg: "transparent", c: T.sub, bd: T.border } };
  const st = s[v] || s.primary;
  return <button onClick={onClick} disabled={disabled} style={{ padding: sz === "sm" ? "5px 12px" : "8px 16px", borderRadius: "6px", background: st.bg, color: st.c,
    border: st.bd ? `1.5px solid ${st.bd}` : "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: sz === "sm" ? "12px" : "13px", fontWeight: 600, fontFamily: FONT, opacity: disabled ? 0.5 : 1, transition: "opacity 0.15s" }}>{children}</button>;
};

const Input = ({ label, value, onChange, type = "text", placeholder, required, options, disabled, width }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: width ? `0 0 ${width}` : "1 1 200px", minWidth: "140px" }}>
    <label style={{ fontSize: "12px", fontWeight: 600, color: T.sub }}>{label}{required && <span style={{ color: T.danger }}> *</span>}</label>
    {options ? (
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{ padding: "7px 10px", borderRadius: "6px", border: `1px solid ${T.border}`, fontSize: "13px", fontFamily: FONT, background: T.inputBg, color: T.text }}>
        <option value="">선택</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ padding: "7px 10px", borderRadius: "6px", border: `1px solid ${T.border}`, fontSize: "13px", fontFamily: FONT, background: disabled ? "#F0F0F0" : T.inputBg, color: T.text }} />
    )}
  </div>
);

const DataTable = ({ columns, data, onRowClick }) => (
  <div style={{ overflowX: "auto", borderRadius: "8px", border: `1px solid ${T.border}` }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
      <thead>
        <tr style={{ background: T.primaryLight }}>
          {columns.map((col, i) => (
            <th key={i} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: T.primary, fontSize: "12px", whiteSpace: "nowrap", borderBottom: `2px solid ${T.primary}` }}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan={columns.length} style={{ padding: "40px", textAlign: "center", color: T.sub }}>데이터가 없습니다</td></tr>
        ) : data.map((row, ri) => (
          <tr key={ri} onClick={() => onRowClick && onRowClick(row)} style={{ cursor: onRowClick ? "pointer" : "default", background: ri % 2 === 0 ? "#fff" : "#FAFAF8", transition: "background 0.1s" }}
            onMouseEnter={e => e.currentTarget.style.background = T.primaryLight}
            onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? "#fff" : "#FAFAF8"}>
            {columns.map((col, ci) => (
              <td key={ci} style={{ padding: "9px 12px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Card = ({ title, children, action, count }) => (
  <div style={{ background: T.card, borderRadius: "10px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "16px" }}>
    {(title || action) && (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {title && <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: T.text }}>{title}</h3>}
          {count !== undefined && <Badge text={`${count}건`} color={T.primary} bg={T.primaryLight} />}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: `2px solid ${T.border}`, paddingBottom: "0" }}>
    {tabs.map(t => (
      <button key={t.key} onClick={() => onChange(t.key)} style={{
        padding: "10px 18px", borderRadius: "6px 6px 0 0", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: FONT,
        background: active === t.key ? T.primary : "transparent", color: active === t.key ? "#fff" : T.sub,
        borderBottom: active === t.key ? `2px solid ${T.primary}` : "2px solid transparent", marginBottom: "-2px", transition: "all 0.15s",
      }}>{t.icon && <span style={{ marginRight: "6px" }}>{t.icon}</span>}{t.label}</button>
    ))}
  </div>
);

const SearchBar = ({ value, onChange, placeholder = "검색..." }) => (
  <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ padding: "8px 14px", borderRadius: "6px", border: `1px solid ${T.border}`, fontSize: "13px", fontFamily: FONT, background: T.inputBg, width: "260px", maxWidth: "100%" }} />
);

const fmt = n => n ? new Intl.NumberFormat("ko-KR").format(n) : "-";

// ─── Sub-modules ───

// 1. Department Management
function DeptMgmt() {
  const [search, setSearch] = useState("");
  const filtered = DEPTS.filter(d => d.dept_name.toLowerCase().includes(search.toLowerCase()) || d.dept_code.toLowerCase().includes(search.toLowerCase()));
  return (
    <Card title="부서(지점) 관리" count={DEPTS.length} action={<Btn>+ 부서 추가</Btn>}>
      <SearchBar value={search} onChange={setSearch} placeholder="부서코드 또는 부서명 검색..." />
      <div style={{ marginTop: "12px" }}>
        <DataTable columns={[
          { key: "dept_code", label: "부서코드", render: v => <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "12px", color: T.primary }}>{v}</span> },
          { key: "dept_name", label: "부서명", render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
          { key: "is_active", label: "상태", render: v => <StatusBadge status={v} /> },
        ]} data={filtered} />
      </div>
    </Card>
  );
}

// 2. Employee Management
function EmpMgmt() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const filtered = EMPLOYEES.filter(e => {
    const matchSearch = e.emp_name.toLowerCase().includes(search.toLowerCase()) || e.emp_code.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || e.role === roleFilter;
    return matchSearch && matchRole;
  });
  return (
    <Card title="직원 관리" count={EMPLOYEES.length} action={<Btn>+ 직원 등록</Btn>}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="사원코드 또는 이름 검색..." />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: `1px solid ${T.border}`, fontSize: "13px", fontFamily: FONT, background: T.inputBg }}>
          <option value="all">전체 역할</option>
          <option value="manager">Manager</option><option value="sales">Sales</option>
          <option value="tech">Tech</option><option value="admin">Admin</option>
          <option value="accounting">Accounting</option><option value="calibration">Calibration</option>
        </select>
      </div>
      <DataTable columns={[
        { key: "emp_code", label: "사원코드", render: v => <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "12px", color: T.primary }}>{v}</span> },
        { key: "emp_name", label: "사원명", render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
        { key: "dept_code", label: "부서", render: v => <Badge text={v} color={T.primary} bg={T.primaryLight} /> },
        { key: "position", label: "직책" },
        { key: "hire_date", label: "입사일" },
        { key: "role", label: "권한", render: v => <StatusBadge status={v} /> },
        { key: "base_salary", label: "기본급(VND)", render: v => v > 0 ? fmt(v) : <span style={{ color: T.sub }}>-</span> },
        { key: "is_active", label: "상태", render: v => <StatusBadge status={v} /> },
      ]} data={filtered} />
    </Card>
  );
}

// 3. Client Management (Enhanced CRM)
function ClientMgmt() {
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientTab, setClientTab] = useState("basic");

  const filtered = CLIENTS.filter(c => {
    const matchSearch = c.client_name.toLowerCase().includes(search.toLowerCase()) || c.client_code.includes(search);
    const matchGrade = gradeFilter === "all" || c.client_grade === gradeFilter;
    return matchSearch && matchGrade;
  });

  if (selectedClient) {
    const cl = selectedClient;
    return (
      <Card title={cl.client_name} action={<Btn v="ghost" onClick={() => setSelectedClient(null)}>← 목록으로</Btn>}>
        <TabBar tabs={[
          { key: "basic", label: "기본정보", icon: "📋" },
          { key: "contacts", label: "담당자", icon: "👤" },
          { key: "sales_mgmt", label: "영업관리", icon: "💼" },
          { key: "marketing", label: "마케팅", icon: "📧" },
          { key: "transactions", label: "거래현황", icon: "📊" },
          { key: "ar", label: "미수금", icon: "💰" },
        ]} active={clientTab} onChange={setClientTab} />

        {clientTab === "basic" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <Input label="거래처코드" value={cl.client_code} disabled width="140px" />
            <Input label="거래처명" value={cl.client_name} required />
            <Input label="대표자" value={cl.representative || ""} />
            <Input label="전화번호" value={cl.phone || ""} />
            <Input label="결제조건(일)" value={cl.payment_terms} type="number" width="100px" />
            <Input label="사업자등록번호(MST)" value="" placeholder="MST" />
            <Input label="은행명" value="" placeholder="" />
            <Input label="계좌번호" value="" placeholder="" />
            <Input label="예금주" value="" placeholder="" />
            <Input label="업종" value="" options={[{value:"manufacturing",label:"제조"},{value:"logistics",label:"물류"},{value:"education",label:"교육"},{value:"it",label:"IT"},{value:"other",label:"기타"}]} />
            <Input label="비고" value="" placeholder="메모" />
            <div style={{ width: "100%", display: "flex", gap: "8px", marginTop: "8px" }}>
              <Btn>저장</Btn> <Btn v="outline">취소</Btn>
            </div>
          </div>
        )}

        {clientTab === "contacts" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}><Btn sz="sm">+ 담당자 추가</Btn></div>
            <DataTable columns={[
              { key: "name", label: "담당자명" }, { key: "position", label: "직책" },
              { key: "phone", label: "전화" }, { key: "email", label: "이메일" },
              { key: "primary", label: "주담당", render: v => v ? <Badge text="주" color={T.success} bg={T.successLight} /> : "" },
            ]} data={[{ name: cl.representative || "미등록", position: "-", phone: cl.phone || "-", email: "-", primary: true }]} />
          </div>
        )}

        {clientTab === "sales_mgmt" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <Input label="알게된 경로" value={cl.acquisition_channel} options={[{value:"visit",label:"방문"},{value:"exhibition",label:"전시회"},{value:"referral",label:"소개"},{value:"website",label:"웹사이트"},{value:"existing",label:"기존고객"},{value:"other",label:"기타"}]} />
            <Input label="소개자" value="" placeholder="거래처 또는 직원 검색" />
            <Input label="고객 등급" value={cl.client_grade} options={[{value:"A",label:"A"},{value:"B",label:"B"},{value:"C",label:"C"},{value:"D",label:"D"}]} width="100px" />
            <Input label="영업 담당자" value="" options={EMPLOYEES.filter(e=>e.role==="sales").map(e=>({value:e.emp_code,label:e.emp_name}))} />
            <div style={{ width: "100%", marginTop: "8px" }}><Btn>저장</Btn></div>
          </div>
        )}

        {clientTab === "marketing" && (
          <div>
            <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "16px", padding: "12px", background: T.inputBg, borderRadius: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                <input type="checkbox" checked={cl.email_consent} readOnly /> 이메일 수신 동의
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <Badge text="VIP" color={T.accent} bg={T.accentLight} />
                <Badge text="+ 태그추가" color={T.sub} bg="#F0F0F0" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <Btn sz="sm">설문조사 발송</Btn> <Btn sz="sm" v="outline">정기 이메일 발송</Btn>
            </div>
            <p style={{ color: T.sub, fontSize: "13px" }}>발송 이력이 없습니다.</p>
          </div>
        )}

        {clientTab === "transactions" && (
          <div style={{ textAlign: "center", padding: "30px", color: T.sub }}>
            <p style={{ fontSize: "14px" }}>이 고객의 매출/매입/AS/렌탈/교정 이력이 여기에 자동 집계됩니다.</p>
            <p style={{ fontSize: "12px" }}>(연결된 모듈 개발 후 활성화)</p>
          </div>
        )}

        {clientTab === "ar" && (
          <div>
            <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px", padding: "16px", borderRadius: "8px", background: cl.ar_status === "blocked" ? T.dangerLight : cl.ar_status === "warning" ? T.warnLight : T.successLight, borderLeft: `4px solid ${cl.ar_status === "blocked" ? T.danger : cl.ar_status === "warning" ? T.warn : T.success}` }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: T.sub }}>미수금 상태</div>
                <div style={{ fontSize: "20px", fontWeight: 800, marginTop: "4px" }}><StatusBadge status={cl.ar_status} /></div>
              </div>
              <div style={{ flex: "1 1 200px", padding: "16px", borderRadius: "8px", background: T.inputBg }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: T.sub }}>미수금 누적액</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: T.text, marginTop: "4px" }}>0 VND</div>
              </div>
            </div>
            {cl.ar_status === "blocked" ? (
              <div style={{ padding: "12px", background: T.dangerLight, borderRadius: "8px", marginBottom: "12px" }}>
                <span style={{ fontWeight: 700, color: T.danger }}>⚠ 서비스 차단 중</span>
                <span style={{ color: T.danger, fontSize: "13px", marginLeft: "8px" }}>AS출동 및 소모품 출고 BLOCKING</span>
                <div style={{ marginTop: "8px" }}><Btn v="danger" sz="sm">차단 해제 (관리자 전용)</Btn></div>
              </div>
            ) : (
              <div><Btn v="danger" sz="sm">서비스 차단 설정</Btn></div>
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card title="거래처 관리 (CRM)" count={CLIENTS.length} action={<Btn>+ 거래처 등록</Btn>}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="거래처코드 또는 거래처명 검색..." />
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: `1px solid ${T.border}`, fontSize: "13px", fontFamily: FONT, background: T.inputBg }}>
          <option value="all">전체 등급</option>
          <option value="A">A등급</option><option value="B">B등급</option>
          <option value="C">C등급</option><option value="D">D등급</option>
        </select>
      </div>
      <DataTable columns={[
        { key: "client_code", label: "코드", render: v => <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{v}</span> },
        { key: "client_name", label: "거래처명", render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
        { key: "representative", label: "대표자", render: v => v || <span style={{ color: T.sub }}>-</span> },
        { key: "phone", label: "전화", render: v => v || <span style={{ color: T.sub }}>-</span> },
        { key: "payment_terms", label: "결제(일)", render: v => v + "일" },
        { key: "client_grade", label: "등급", render: v => <StatusBadge status={v} /> },
        { key: "acquisition_channel", label: "유입경로", render: v => {
          const m = { visit: "방문", exhibition: "전시회", referral: "소개", website: "웹", existing: "기존", other: "기타" };
          return m[v] || v;
        }},
        { key: "ar_status", label: "미수금", render: v => <StatusBadge status={v} /> },
      ]} data={filtered} onRowClick={setSelectedClient} />
    </Card>
  );
}

// 4. Item Management
function ItemMgmt() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const filtered = ITEMS.filter(i => {
    const matchSearch = i.item_name.toLowerCase().includes(search.toLowerCase()) || i.item_code.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || i.category === catFilter;
    return matchSearch && matchCat;
  });
  return (
    <Card title="품목(제품) 관리" count={ITEMS.length} action={<Btn>+ 품목 등록</Btn>}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="품목코드 또는 품목명 검색..." />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: `1px solid ${T.border}`, fontSize: "13px", fontFamily: FONT, background: T.inputBg }}>
          <option value="all">전체 구분</option>
          <option value="product">상품</option><option value="consumable">소모품</option>
          <option value="part">부품</option><option value="asset">자산</option>
        </select>
      </div>
      <DataTable columns={[
        { key: "item_code", label: "품목코드", render: v => <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600 }}>{v}</span> },
        { key: "item_name", label: "품목명", render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
        { key: "manufacturer", label: "제조사" },
        { key: "category", label: "구분", render: v => <StatusBadge status={v} /> },
        { key: "device_line", label: "장비계열", render: v => <Badge text={v} color={T.primary} bg={T.primaryLight} /> },
        { key: "min_stock", label: "최소재고", render: v => v > 0 ? v : "-" },
        { key: "is_asset", label: "감가상각", render: v => v ? <Badge text="적용" color={T.danger} bg={T.dangerLight} /> : <span style={{ color: T.sub }}>-</span> },
      ]} data={filtered} />
    </Card>
  );
}

// 5. Warehouse Management
function WhMgmt() {
  return (
    <Card title="창고 관리" count={WAREHOUSES.length} action={<Btn>+ 창고 추가</Btn>}>
      <DataTable columns={[
        { key: "wh_code", label: "창고코드", render: v => <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "12px", color: T.primary }}>{v}</span> },
        { key: "wh_name", label: "창고명", render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
        { key: "wh_type", label: "유형", render: v => <StatusBadge status={v} /> },
        { key: "is_active", label: "상태", render: v => <StatusBadge status={v} /> },
      ]} data={WAREHOUSES} />
    </Card>
  );
}

// 6. Project Code Management
function ProjMgmt() {
  return (
    <Card title="프로젝트(매출유형) 코드" count={PROJECTS.length} action={<Btn>+ 프로젝트 추가</Btn>}>
      <DataTable columns={[
        { key: "project_code", label: "프로젝트코드", render: v => <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "12px", color: T.primary }}>{v}</span> },
        { key: "project_name", label: "프로젝트명", render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
        { key: "is_active", label: "상태", render: v => <StatusBadge status={v} /> },
      ]} data={PROJECTS} />
    </Card>
  );
}

// ─── Main App ───
export default function App() {
  const [activeTab, setActiveTab] = useState("dept");

  const tabs = [
    { key: "dept", label: "부서(지점)", icon: "🏢" },
    { key: "emp", label: "직원", icon: "👥" },
    { key: "client", label: "거래처(CRM)", icon: "🤝" },
    { key: "item", label: "품목(제품)", icon: "📦" },
    { key: "wh", label: "창고", icon: "🏭" },
    { key: "proj", label: "프로젝트코드", icon: "📁" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: FONT, padding: "0" }}>
      <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: T.primary, color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "11px", opacity: 0.6, letterSpacing: "0.1em", fontWeight: 600 }}>TELLUSTECH ERP</div>
          <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em" }}>기초등록</div>
        </div>
        <div style={{ fontSize: "12px", opacity: 0.7 }}>Module 1 of 9</div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px" }}>
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === "dept" && <DeptMgmt />}
        {activeTab === "emp" && <EmpMgmt />}
        {activeTab === "client" && <ClientMgmt />}
        {activeTab === "item" && <ItemMgmt />}
        {activeTab === "wh" && <WhMgmt />}
        {activeTab === "proj" && <ProjMgmt />}
      </div>
    </div>
  );
}
