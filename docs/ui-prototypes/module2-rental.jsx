import { useState } from "react";

const D = {
  bg: "#111113", card: "#1A1A1F", cardHover: "#222228", primary: "#5B9BD5", primaryDim: "#2A3A4A",
  accent: "#E8943A", accentDim: "#3A2A18", success: "#4ADE80", successDim: "#1A2E1A",
  danger: "#F87171", dangerDim: "#2E1A1A", warn: "#FACC15", warnDim: "#2E2A12",
  text: "#E8E6E1", sub: "#8A8A8A", muted: "#555555", border: "#2A2A30", borderLight: "#333338",
  input: "#1E1E24", purple: "#A78BFA",
};
const FONT = `'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif`;

// IT Rental data from actual Excel
const IT_CONTRACTS = [
  { no: "1", memo: "비엣렌탈 계약서 확인 필요", sales: "Ms. Duyên HN", tech: "-", km: 0, company: "CÔNG TY TNHH CNI", device: "N511", sn: "357160600164", contract_no: "VRT/CNI20240201001", start: "2025-01-15", end: "2026-01-14", base: 2000000, free_bw: 7000, free_color: 0, over_bw: 180, over_color: 0, status: "active" },
  { no: "3", memo: "현재 계약 조건 부록서 필요", sales: "Ms. Duyên HN", tech: "Khang", km: 2, company: "CÔNG TY TNHH HÀ NỘI & SEOUL", device: "N511", sn: "357160100107", contract_no: "TLS20210102002", start: "2024-03-15", end: "2025-03-14", base: 1400000, free_bw: 5000, free_color: 0, over_bw: 180, over_color: 0, status: "active" },
  { no: "4", memo: "삼성 장비 신규 계약", sales: "Ms. Bình", tech: "-", km: 99, company: "CÔNG TY TNHH SAMSE VINA", device: "D310", sn: "387190450335", contract_no: "-", start: "2024-03-15", end: "2025-03-14", base: 3500000, free_bw: 5000, free_color: 2000, over_bw: 150, over_color: 1200, status: "active" },
  { no: "5", memo: "ĐÃ CÓ HĐ (22-3-2025)", sales: "Ms. Bình", tech: "THIET", km: 2, company: "VẬN CHUYỂN ĐỈNH DƯƠNG VN", device: "N511_신규", sn: "357130850527", contract_no: "VRT/DD20250101001", start: "2025-01-01", end: "2029-01-01", base: 1700000, free_bw: 5000, free_color: 0, over_bw: 150, over_color: 0, status: "active" },
  { no: "6", memo: "ĐÃ CÓ HĐ (22-3-2025)", sales: "Ms. Bình", tech: "THIET", km: 2, company: "VẬN CHUYỂN ĐỈNH DƯƠNG VN", device: "X7500", sn: "0A2HBJNTB0009Q", contract_no: "VRT/DD20250101001", start: "2025-01-01", end: "2029-01-01", base: 1550000, free_bw: 5000, free_color: 0, over_bw: 150, over_color: 0, status: "active" },
  { no: "7", memo: "완료", sales: "Ms. Bình", tech: "Khang", km: 57, company: "VSD CHEMICAL", device: "D330", sn: "386520200343", contract_no: "VRT/VSD20240201001", start: "2024-01-01", end: "2026-11-01", base: 3900000, free_bw: 4000, free_color: 2800, over_bw: 150, over_color: 1500, status: "active" },
  { no: "8", memo: "계약서 확인 필요", sales: "Ms. Bình", tech: "LINH", km: 45, company: "WELSTORY VIỆT NAM", device: "D310", sn: "356180400181", contract_no: "TLS-20181013001", start: "2024-03-15", end: "2025-03-14", base: 3600000, free_bw: 146000, free_color: 13000, over_bw: 200, over_color: 2000, status: "active" },
];

// TM Rental data
const TM_RENTALS = [
  { emp: "NVH", supplier: "Tengda", item: "86100D", sn: "MY53150494", opt: "86105C", r_start: "2026-03-01", r_end: "2026-03-31", buy_price: 41737500, customer: "VNPT", sell_price: 48000000, sell_amount: 51840000, profit: 6262500, pay_due: "2026-04-15", status: "active" },
  { emp: "NVH", supplier: "Tellus Vina", item: "E5071C", sn: "MY46900674", opt: "4D5", r_start: "2026-03-01", r_end: "2026-03-31", buy_price: 0, customer: "HPM", sell_price: 20000000, sell_amount: 21600000, profit: 20000000, pay_due: "2026-04-10", status: "active" },
  { emp: "NVH", supplier: "Jooyon", item: "E5071C", sn: "MY46630986", opt: "285", r_start: "2026-03-01", r_end: "2026-03-31", buy_price: 6700000, customer: "THAC BOI DUC", sell_price: 8000000, sell_amount: 8640000, profit: 1300000, pay_due: "2026-04-20", status: "active" },
  { emp: "NVH", supplier: "Sengt", item: "E5071C", sn: "MY47003410", opt: "485", r_start: "2026-03-01", r_end: "2026-03-31", buy_price: 7234500, customer: "HPM", sell_price: 11500000, sell_amount: 12420000, profit: 4265500, pay_due: "2026-04-10", status: "active" },
  { emp: "NVH", supplier: "Tellus KR", item: "N9020B", sn: "MY63490129", opt: "526,B1X", r_start: "2026-03-01", r_end: "2026-03-31", buy_price: 23651250, customer: "HPM", sell_price: 28000000, sell_amount: 30240000, profit: 4348750, pay_due: "2026-04-10", status: "active" },
  { emp: "NVH", supplier: "Tellus KR", item: "N9020B", sn: "MY63490136", opt: "526,B1X", r_start: "2026-03-01", r_end: "2026-03-31", buy_price: 23651250, customer: "-", sell_price: 0, sell_amount: 0, profit: -23651250, pay_due: "-", status: "standby" },
];

// Monthly billing sample
const BILLING = [
  { sn: "357160600164", company: "CNI", device: "N511", month: "2026-03", counter_bw: 45200, prev_bw: 42100, usage_bw: 3100, base: 2000000, free_bw: 7000, over_bw: 180, extra_bw: 0, total: 2000000, confirm: "confirmed" },
  { sn: "386520200343", company: "VSD CHEMICAL", device: "D330", month: "2026-03", counter_bw: 28400, prev_bw: 24200, usage_bw: 4200, base: 3900000, free_bw: 4000, over_bw: 150, extra_bw: 30000, total: 3930000, confirm: "pending" },
  { sn: "356180400181", company: "WELSTORY", device: "D310", month: "2026-03", counter_bw: 312000, prev_bw: 298500, usage_bw: 13500, base: 3600000, free_bw: 146000, over_bw: 200, extra_bw: 0, total: 3600000, confirm: "pending" },
];

const fmt = n => n ? new Intl.NumberFormat("ko-KR").format(n) : "-";

const Badge = ({ text, c, bg }) => <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, color: c, background: bg }}>{text}</span>;
const SBadge = ({ s }) => {
  const m = { active: [D.success, D.successDim], expired: [D.danger, D.dangerDim], standby: [D.warn, D.warnDim], confirmed: [D.success, D.successDim], pending: [D.accent, D.accentDim], disputed: [D.danger, D.dangerDim] };
  const v = m[s] || [D.sub, D.border];
  const labels = { active: "진행중", expired: "만료", standby: "대기", confirmed: "컨펌완료", pending: "컨펌대기", disputed: "이의제기" };
  return <Badge text={labels[s]||s} c={v[0]} bg={v[1]} />;
};

const Stat = ({ label, value, sub, color }) => (
  <div style={{ flex: "1 1 160px", padding: "16px", borderRadius: "10px", background: D.card, border: `1px solid ${D.border}`, borderLeft: `3px solid ${color||D.primary}` }}>
    <div style={{ fontSize: "11px", color: D.sub, fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: "22px", fontWeight: 800, color: color||D.text, marginTop: "4px" }}>{value}</div>
    {sub && <div style={{ fontSize: "11px", color: D.muted, marginTop: "2px" }}>{sub}</div>}
  </div>
);

const TBL = ({ cols, data, onRow }) => (
  <div style={{ overflowX: "auto", borderRadius: "8px", border: `1px solid ${D.border}` }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
      <thead><tr style={{ background: D.primaryDim }}>
        {cols.map((c,i) => <th key={i} style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: D.primary, fontSize: "11px", whiteSpace: "nowrap", borderBottom: `2px solid ${D.primary}` }}>{c.label}</th>)}
      </tr></thead>
      <tbody>{data.map((row,ri) => (
        <tr key={ri} onClick={() => onRow && onRow(row)} style={{ cursor: onRow ? "pointer" : "default", background: ri%2===0 ? D.bg : D.card, transition: "background 0.1s" }}
          onMouseEnter={e => e.currentTarget.style.background = D.cardHover}
          onMouseLeave={e => e.currentTarget.style.background = ri%2===0 ? D.bg : D.card}>
          {cols.map((c,ci) => <td key={ci} style={{ padding: "8px 10px", borderBottom: `1px solid ${D.border}`, color: D.text, whiteSpace: "nowrap" }}>{c.render ? c.render(row[c.key],row) : row[c.key]}</td>)}
        </tr>
      ))}</tbody>
    </table>
  </div>
);

const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: `1px solid ${D.border}` }}>
    {tabs.map(t => <button key={t.key} onClick={() => onChange(t.key)} style={{
      padding: "10px 18px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: FONT,
      background: active === t.key ? D.primary : "transparent", color: active === t.key ? "#fff" : D.sub,
      borderRadius: "6px 6px 0 0", marginBottom: "-1px", transition: "all 0.15s",
    }}>{t.icon} {t.label}</button>)}
  </div>
);

function ITRental() {
  const [search, setSearch] = useState("");
  const filtered = IT_CONTRACTS.filter(c => c.company.toLowerCase().includes(search.toLowerCase()) || c.sn.includes(search) || c.device.includes(search));
  const totalBase = IT_CONTRACTS.reduce((a,b) => a + b.base, 0);

  return (<div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
      <Stat label="관리 장비" value={`${IT_CONTRACTS.length}대`} color={D.primary} />
      <Stat label="월 기본렌탈료 합계" value={fmt(totalBase) + "₫"} color={D.success} />
      <Stat label="컨펌 대기" value={`${BILLING.filter(b=>b.confirm==="pending").length}건`} sub="고객 서명 필요" color={D.accent} />
    </div>
    <div style={{ background: D.card, borderRadius: "10px", padding: "16px", border: `1px solid ${D.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="업체명, S/N, 장비명 검색..."
          style={{ padding: "8px 12px", borderRadius: "6px", border: `1px solid ${D.border}`, background: D.input, color: D.text, fontSize: "13px", fontFamily: FONT, width: "280px" }} />
        <button style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: D.primary, color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>+ 계약 등록</button>
      </div>
      <TBL cols={[
        { key: "company", label: "업체명", render: v => <span style={{ fontWeight: 600, color: D.text }}>{v}</span> },
        { key: "device", label: "장비", render: v => <Badge text={v} c={D.primary} bg={D.primaryDim} /> },
        { key: "sn", label: "S/N", render: v => <span style={{ fontFamily: "monospace", fontSize: "11px", color: D.accent }}>{v}</span> },
        { key: "base", label: "기본료", render: v => <span style={{ color: D.success }}>{fmt(v)}</span> },
        { key: "free_bw", label: "기본(B&W)", render: v => fmt(v) },
        { key: "free_color", label: "기본(Color)", render: v => v > 0 ? fmt(v) : <span style={{ color: D.muted }}>-</span> },
        { key: "over_bw", label: "초과(B&W)", render: v => v + "₫" },
        { key: "over_color", label: "초과(Color)", render: v => v > 0 ? v + "₫" : <span style={{ color: D.muted }}>-</span> },
        { key: "sales", label: "영업", render: v => <span style={{ fontSize: "11px" }}>{v}</span> },
        { key: "tech", label: "기술" },
        { key: "km", label: "KM", render: v => v > 0 ? v : "-" },
        { key: "status", label: "상태", render: v => <SBadge s={v} /> },
      ]} data={filtered} />
    </div>
  </div>);
}

function MonthlyBilling() {
  return (<div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
      <Stat label="이번달 총 청구액" value={fmt(BILLING.reduce((a,b)=>a+b.total,0)) + "₫"} color={D.success} />
      <Stat label="컨펌 완료" value={`${BILLING.filter(b=>b.confirm==="confirmed").length}건`} color={D.success} />
      <Stat label="컨펌 대기" value={`${BILLING.filter(b=>b.confirm==="pending").length}건`} sub="고객 서명 필요" color={D.accent} />
    </div>
    <div style={{ background: D.card, borderRadius: "10px", padding: "16px", border: `1px solid ${D.border}` }}>
      <TBL cols={[
        { key: "company", label: "업체", render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
        { key: "device", label: "장비" },
        { key: "sn", label: "S/N", render: v => <span style={{ fontFamily: "monospace", fontSize: "11px", color: D.accent }}>{v}</span> },
        { key: "month", label: "청구월" },
        { key: "usage_bw", label: "사용량(B&W)", render: v => <span style={{ fontWeight: 700 }}>{fmt(v)}</span> },
        { key: "free_bw", label: "기본매수", render: v => fmt(v) },
        { key: "extra_bw", label: "추가금액", render: (v,r) => v > 0 ? <span style={{ color: D.accent }}>{fmt(v)}₫</span> : <span style={{ color: D.muted }}>0</span> },
        { key: "base", label: "기본료", render: v => fmt(v) },
        { key: "total", label: "총 청구액", render: v => <span style={{ fontWeight: 800, color: D.success }}>{fmt(v)}₫</span> },
        { key: "confirm", label: "컨펌", render: v => <SBadge s={v} /> },
      ]} data={BILLING} />
      <div style={{ marginTop: "12px", padding: "10px", borderRadius: "6px", background: D.primaryDim, fontSize: "12px", color: D.sub }}>
        💡 총 청구액 = 기본료 + (사용량 - 기본매수) × 초과단가. 기본매수 이하이면 추가금액 없음.
      </div>
    </div>
  </div>);
}

function TMRental() {
  const totalProfit = TM_RENTALS.reduce((a,b) => a + b.profit, 0);
  return (<div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
      <Stat label="TM 렌탈 건수" value={`${TM_RENTALS.length}건`} color={D.purple} />
      <Stat label="매출합계" value={fmt(TM_RENTALS.reduce((a,b)=>a+b.sell_amount,0)) + "₫"} color={D.success} />
      <Stat label="총 이익" value={fmt(totalProfit) + "₫"} sub={totalProfit < 0 ? "적자 주의" : ""} color={totalProfit >= 0 ? D.success : D.danger} />
    </div>
    <div style={{ background: D.card, borderRadius: "10px", padding: "16px", border: `1px solid ${D.border}` }}>
      <TBL cols={[
        { key: "supplier", label: "매입처", render: v => <span style={{ color: D.accent }}>{v}</span> },
        { key: "item", label: "품목", render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
        { key: "sn", label: "S/N", render: v => <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{v}</span> },
        { key: "opt", label: "옵션", render: v => <span style={{ fontSize: "11px" }}>{v}</span> },
        { key: "buy_price", label: "매입단가", render: v => v > 0 ? fmt(v) : <span style={{ color: D.muted }}>자사보유</span> },
        { key: "customer", label: "매출처", render: v => v !== "-" ? <span style={{ fontWeight: 600, color: D.success }}>{v}</span> : <span style={{ color: D.danger }}>미배정</span> },
        { key: "sell_amount", label: "매출액", render: v => v > 0 ? <span style={{ color: D.success }}>{fmt(v)}</span> : <span style={{ color: D.muted }}>0</span> },
        { key: "profit", label: "이익", render: v => <span style={{ fontWeight: 700, color: v >= 0 ? D.success : D.danger }}>{fmt(v)}</span> },
        { key: "pay_due", label: "입금예정" },
        { key: "status", label: "상태", render: v => <SBadge s={v} /> },
      ]} data={TM_RENTALS} />
    </div>
  </div>);
}

export default function App() {
  const [tab, setTab] = useState("it");

  return (
    <div style={{ minHeight: "100vh", background: D.bg, fontFamily: FONT, color: D.text }}>
      <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet" />
      <div style={{ background: "#0D0D10", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${D.border}` }}>
        <div>
          <div style={{ fontSize: "11px", color: D.muted, letterSpacing: "0.1em", fontWeight: 600 }}>TELLUSTECH ERP</div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>렌탈관리</div>
        </div>
        <div style={{ fontSize: "12px", color: D.muted }}>Module 2 of 9</div>
      </div>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
        <Tabs tabs={[
          { key: "it", label: "IT 렌탈 (복합기)", icon: "🖨️" },
          { key: "billing", label: "월별 청구", icon: "💰" },
          { key: "tm", label: "TM 렌탈 (계측기)", icon: "📡" },
        ]} active={tab} onChange={setTab} />
        {tab === "it" && <ITRental />}
        {tab === "billing" && <MonthlyBilling />}
        {tab === "tm" && <TMRental />}
      </div>
    </div>
  );
}
