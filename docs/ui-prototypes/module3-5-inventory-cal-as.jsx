import { useState } from "react";

const D = {
  bg: "#111113", card: "#1A1A1F", cardHover: "#222228", primary: "#5B9BD5", primaryDim: "#2A3A4A",
  accent: "#E8943A", accentDim: "#3A2A18", success: "#4ADE80", successDim: "#1A2E1A",
  danger: "#F87171", dangerDim: "#2E1A1A", warn: "#FACC15", warnDim: "#2E2A12",
  text: "#E8E6E1", sub: "#8A8A8A", muted: "#555", border: "#2A2A30", input: "#1E1E24", purple: "#A78BFA", purpleDim: "#2A1F3A",
};
const FONT = `'Pretendard',-apple-system,sans-serif`;
const fmt = n => n ? new Intl.NumberFormat("ko-KR").format(n) : "-";

const Badge = ({t,c,bg}) => <span style={{display:"inline-block",padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,color:c,background:bg}}>{t}</span>;
const SB = ({s}) => {
  const m={enough:[D.success,D.successDim,"충분"],low:[D.danger,D.dangerDim,"부족"],ok:[D.primary,D.primaryDim,"적정"],active:[D.success,D.successDim,"진행중"],done:[D.sub,"#2A2A2A","완료"],wait:[D.accent,D.accentDim,"대기"],접수:[D.primary,D.primaryDim,"접수"],진행:[D.accent,D.accentDim,"진행"],완료:[D.success,D.successDim,"완료"]};
  const v=m[s]||[D.sub,"#2A2A2A",s]; return <Badge t={v[2]} c={v[0]} bg={v[1]}/>;
};
const Stat = ({l,v,s,c}) => (
  <div style={{flex:"1 1 150px",padding:"14px",borderRadius:"8px",background:D.card,border:`1px solid ${D.border}`,borderLeft:`3px solid ${c||D.primary}`}}>
    <div style={{fontSize:"11px",color:D.sub,fontWeight:600}}>{l}</div>
    <div style={{fontSize:"20px",fontWeight:800,color:c||D.text,marginTop:"3px"}}>{v}</div>
    {s&&<div style={{fontSize:"10px",color:D.muted,marginTop:"2px"}}>{s}</div>}
  </div>
);
const TBL = ({cols,data,onRow}) => (
  <div style={{overflowX:"auto",borderRadius:"8px",border:`1px solid ${D.border}`}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
      <thead><tr style={{background:D.primaryDim}}>
        {cols.map((c,i)=><th key={i} style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:D.primary,fontSize:"11px",whiteSpace:"nowrap",borderBottom:`2px solid ${D.primary}`}}>{c.label}</th>)}
      </tr></thead>
      <tbody>{data.map((r,ri)=>(
        <tr key={ri} onClick={()=>onRow&&onRow(r)} style={{cursor:onRow?"pointer":"default",background:ri%2===0?D.bg:D.card,transition:"background 0.1s"}}
          onMouseEnter={e=>e.currentTarget.style.background=D.cardHover} onMouseLeave={e=>e.currentTarget.style.background=ri%2===0?D.bg:D.card}>
          {cols.map((c,ci)=><td key={ci} style={{padding:"7px 10px",borderBottom:`1px solid ${D.border}`,color:D.text,whiteSpace:"nowrap"}}>{c.render?c.render(r[c.key],r):r[c.key]}</td>)}
        </tr>
      ))}</tbody>
    </table>
  </div>
);
const Tabs = ({tabs,active,onChange}) => (
  <div style={{display:"flex",gap:"4px",marginBottom:"16px",borderBottom:`1px solid ${D.border}`}}>
    {tabs.map(t=><button key={t.key} onClick={()=>onChange(t.key)} style={{
      padding:"10px 16px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:600,fontFamily:FONT,
      background:active===t.key?D.primary:"transparent",color:active===t.key?"#fff":D.sub,
      borderRadius:"6px 6px 0 0",marginBottom:"-1px"
    }}>{t.icon} {t.label}</button>)}
  </div>
);

// ═══ INVENTORY DATA ═══
const INV = [
  {code:"D320T24KK-V",name:"Mực đen D330 (토너K)",line:"D330",cat:"TONER K",bn:0,hn:2,hcm:2,ntr:3,total:7,min:10,status:"low"},
  {code:"D320T24KC-V",name:"Mực Xanh D330 (토너C)",line:"D330",cat:"TONER C",bn:0,hn:1,hcm:1,ntr:2,total:4,min:10,status:"low"},
  {code:"D320T24KM-V",name:"Mực đỏ D330 (토너M)",line:"D330",cat:"TONER M",bn:2,hn:3,hcm:2,ntr:0,total:7,min:10,status:"low"},
  {code:"D320T24KY-V",name:"Mực vàng D330 (토너Y)",line:"D330",cat:"TONER Y",bn:1,hn:2,hcm:2,ntr:2,total:7,min:10,status:"low"},
  {code:"D320R105KK-V",name:"Catridge trống D330 Black (드럼K)",line:"D330",cat:"DRUM K",bn:0,hn:1,hcm:0,ntr:0,total:1,min:5,status:"low"},
  {code:"D320IU90KC-V",name:"Cụm IU D330 Cyan (드럼C)",line:"D330",cat:"DRUM C",bn:1,hn:0,hcm:4,ntr:0,total:5,min:5,status:"ok"},
  {code:"D320IU90KY-V",name:"Cụm IU D330 Yellow (드럼Y)",line:"D330",cat:"DRUM Y",bn:3,hn:5,hcm:1,ntr:0,total:9,min:5,status:"enough"},
  {code:"ACM1H020FR",name:"Main điều khiển D330 (메인보드)",line:"D330",cat:"ETC",bn:1,hn:0,hcm:0,ntr:0,total:1,min:2,status:"low"},
];

const ASSETS = [
  {sn:"0A2HBJNTB0009Q",name:"SL-X7500LX",cost:85000000,date:"2024-01-15",life:60,method:"straight",monthly:1416667,accumulated:25500000,book:59500000},
  {sn:"386520200343",name:"D330",cost:45000000,date:"2023-06-01",life:60,method:"straight",monthly:750000,accumulated:25500000,book:19500000},
  {sn:"MY63490129",name:"N9020B PXA",cost:5139333150,date:"2026-03-19",life:120,method:"straight",monthly:42827776,accumulated:42827776,book:5096505374},
];

// ═══ CALIBRATION DATA ═══
const CALS = [
  {id:1,client:"FUSHAN TECHNOLOGY",date:"2026-04-15",device:"HTC-1",sn:"HTC-001~066",qty:66,std_fee:250000,actual:15150000,tech:"Lộc",sales:"Thiện",cert:"CC-2026-0415-001",status:"done"},
  {id:2,client:"ISOCAL",date:"2026-04-15",device:"Calibration service",sn:"Various",qty:2,std_fee:200000,actual:432000,tech:"Nghĩa",sales:"Thiện",cert:"CC-2026-0415-002",status:"done"},
  {id:3,client:"SUNGHO",date:"2026-04-10",device:"3310D",sn:"Various",qty:360,std_fee:350000,actual:112140000,tech:"Lộc",sales:"Thiện",cert:"-",status:"active"},
  {id:4,client:"VALUETRONICS",date:"2026-04-08",device:"66321B",sn:"Various",qty:94,std_fee:700000,actual:60050000,tech:"Lộc",sales:"Thiện",cert:"-",status:"active"},
  {id:5,client:"SEVT",date:"2026-04-05",device:"DS2-50N",sn:"Various",qty:4283,std_fee:250000,actual:993940000,tech:"Nghĩa",sales:"Thiện",cert:"-",status:"wait"},
];

// ═══ AS DATA ═══
const AS_DATA = [
  {no:"26/04/15-11",title:"in lem mực màu xanh",client:"IMJ VINA",handler:"Khang",date:"2026-04-14",model:"",sn:"",done:"2026-04-15",status:"완료"},
  {no:"26/04/08-14",title:"E4980AL - Màn hình bị nhảy loạn",client:"AMO VINA",handler:"Lộc",date:"2026-04-08",model:"E4980AL",sn:"MY54202114",done:"",status:"접수"},
  {no:"26/04/07-16",title:"MT186 - Không sử dụng được (Bảo Hành)",client:"ARCADYAN",handler:"Lộc",date:"2026-04-07",model:"MT186",sn:"186WBYR1031",done:"",status:"접수"},
  {no:"26/04/04-1",title:"kệt giấy, hết mực",client:"EM-TECH VN",handler:"Linh",date:"2026-04-04",model:"D310",sn:"",done:"",status:"접수"},
  {no:"26/04/01-21",title:"TC-3000C - Không sử dụng được",client:"LG HP",handler:"Lộc",date:"2026-04-01",model:"TC-3000C",sn:"3000C000791",done:"",status:"접수"},
  {no:"26/03/23-22",title:"FSV13 - Không sử dụng được",client:"EZ2DO",handler:"Lộc",date:"2026-03-23",model:"FSV13",sn:"101477",done:"",status:"진행"},
];

const DISPATCHES = [
  {ticket:"26/04/04-1",emp:"Linh",depart:"2026-04-04 09:00",ret:"2026-04-04 11:30",vehicle:"motorbike",vno:"29-B1 12345",google_km:12.5,google_round:25.0,odo_dep:15230,odo_ret:15257,actual:27,diff:2.0,cost:0},
  {ticket:"26/04/15-11",emp:"Khang",depart:"2026-04-15 08:30",ret:"2026-04-15 10:00",vehicle:"company_car",vno:"30A-123.45",google_km:8.2,google_round:16.4,odo_dep:45100,odo_ret:45118,actual:18,diff:1.6,cost:0},
  {ticket:"26/03/23-22",emp:"Lộc",depart:"2026-03-23 14:00",ret:"2026-03-23 17:00",vehicle:"grab",vno:"-",google_km:35.0,google_round:70.0,odo_dep:0,odo_ret:0,actual:0,diff:0,cost:185000},
];

// ═══ MODULE 3: INVENTORY ═══
function Mod3() {
  const [sub,setSub] = useState("stock");
  const lowCount = INV.filter(i=>i.status==="low").length;
  return (<div>
    <Tabs tabs={[{key:"stock",label:"재고현황",icon:"📦"},{key:"asset",label:"자산 감가상각",icon:"📉"},{key:"barcode",label:"바코드 입출고",icon:"📱"}]} active={sub} onChange={setSub}/>
    {sub==="stock"&&<div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"10px",marginBottom:"14px"}}>
        <Stat l="총 품목" v={INV.length+"종"} c={D.primary}/>
        <Stat l="부족 품목" v={lowCount+"종"} s="긴급 발주 필요" c={D.danger}/>
        <Stat l="충분" v={INV.filter(i=>i.status==="enough").length+"종"} c={D.success}/>
      </div>
      {lowCount>0&&<div style={{padding:"10px 14px",borderRadius:"8px",background:D.dangerDim,border:`1px solid ${D.danger}33`,marginBottom:"12px",fontSize:"12px",color:D.danger}}>
        🚨 재고 부족: {INV.filter(i=>i.status==="low").map(i=>i.cat).join(", ")}
      </div>}
      <div style={{background:D.card,borderRadius:"8px",padding:"14px",border:`1px solid ${D.border}`}}>
        <TBL cols={[
          {key:"code",label:"품목코드",render:v=><span style={{fontFamily:"monospace",fontSize:"11px"}}>{v}</span>},
          {key:"name",label:"품목명",render:v=><span style={{fontWeight:600}}>{v}</span>},
          {key:"line",label:"계열",render:v=><Badge t={v} c={D.primary} bg={D.primaryDim}/>},
          {key:"bn",label:"BN"},{key:"hn",label:"HN"},{key:"hcm",label:"HCM"},{key:"ntr",label:"NTR"},
          {key:"total",label:"합계",render:(v,r)=><span style={{fontWeight:800,color:r.status==="low"?D.danger:D.text}}>{v}</span>},
          {key:"min",label:"최소",render:v=>v},{key:"status",label:"상태",render:v=><SB s={v}/>},
        ]} data={INV}/>
      </div>
    </div>}
    {sub==="asset"&&<div>
      <div style={{background:D.card,borderRadius:"8px",padding:"14px",border:`1px solid ${D.border}`}}>
        <div style={{marginBottom:"10px",fontSize:"13px",color:D.sub}}>자산 품목(is_asset=TRUE)에 대한 월별 감가상각 자동 계산</div>
        <TBL cols={[
          {key:"sn",label:"S/N",render:v=><span style={{fontFamily:"monospace",fontSize:"11px",color:D.accent}}>{v}</span>},
          {key:"name",label:"장비명",render:v=><span style={{fontWeight:600}}>{v}</span>},
          {key:"cost",label:"취득가액",render:v=><span>{fmt(v)}</span>},
          {key:"method",label:"상각방법",render:v=>v==="straight"?"정액법":"정률법"},
          {key:"life",label:"내용연수",render:v=>Math.floor(v/12)+"년"},
          {key:"monthly",label:"월 상각비",render:v=><span style={{color:D.accent}}>{fmt(v)}</span>},
          {key:"accumulated",label:"누적상각",render:v=>fmt(v)},
          {key:"book",label:"장부가액",render:v=><span style={{fontWeight:700,color:D.success}}>{fmt(v)}</span>},
        ]} data={ASSETS}/>
      </div>
    </div>}
    {sub==="barcode"&&<div>
      <div style={{background:D.card,borderRadius:"8px",padding:"20px",border:`1px solid ${D.border}`,textAlign:"center"}}>
        <div style={{fontSize:"48px",marginBottom:"12px"}}>📱</div>
        <div style={{fontSize:"16px",fontWeight:700,color:D.text,marginBottom:"8px"}}>바코드 스캔 입출고</div>
        <div style={{fontSize:"13px",color:D.sub,marginBottom:"16px"}}>모바일 브라우저에서 카메라로 바코드 스캔 → 입출고 사유 선택 → 자동 반영</div>
        <div style={{display:"flex",gap:"8px",justifyContent:"center",flexWrap:"wrap"}}>
          <button style={{padding:"10px 20px",borderRadius:"8px",background:D.success,color:"#fff",border:"none",fontSize:"14px",fontWeight:700,cursor:"pointer"}}>📥 입고 스캔</button>
          <button style={{padding:"10px 20px",borderRadius:"8px",background:D.accent,color:"#fff",border:"none",fontSize:"14px",fontWeight:700,cursor:"pointer"}}>📤 출고 스캔</button>
        </div>
        <div style={{marginTop:"16px",fontSize:"11px",color:D.muted}}>입출고사유: 매입/교정/수리/렌탈/데모/회수/소모품출고</div>
      </div>
    </div>}
  </div>);
}

// ═══ MODULE 4: CALIBRATION ═══
function Mod4() {
  const [sub,setSub] = useState("list");
  const totalRev = CALS.reduce((a,b)=>a+b.actual,0);
  return (<div>
    <Tabs tabs={[{key:"list",label:"교정이행현황",icon:"🔬"},{key:"cert",label:"성적서관리",icon:"📜"},{key:"alert",label:"연간알림",icon:"🔔"}]} active={sub} onChange={setSub}/>
    {sub==="list"&&<div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"10px",marginBottom:"14px"}}>
        <Stat l="이번달 교정건수" v={CALS.length+"건"} c={D.purple}/>
        <Stat l="교정매출 합계" v={fmt(totalRev)+"₫"} c={D.success}/>
        <Stat l="완료" v={CALS.filter(c=>c.status==="done").length+"건"} c={D.success}/>
        <Stat l="진행/대기" v={CALS.filter(c=>c.status!=="done").length+"건"} c={D.accent}/>
      </div>
      <div style={{background:D.card,borderRadius:"8px",padding:"14px",border:`1px solid ${D.border}`}}>
        <TBL cols={[
          {key:"client",label:"고객사",render:v=><span style={{fontWeight:600}}>{v}</span>},
          {key:"date",label:"시행일"},{key:"device",label:"장비명"},
          {key:"qty",label:"수량",render:v=><span style={{fontWeight:700}}>{fmt(v)}</span>},
          {key:"actual",label:"교정금액",render:v=><span style={{color:D.success}}>{fmt(v)}₫</span>},
          {key:"tech",label:"이행직원"},{key:"sales",label:"영업"},
          {key:"cert",label:"성적서번호",render:v=>v!=="-"?<span style={{fontFamily:"monospace",fontSize:"11px",color:D.accent}}>{v}</span>:<span style={{color:D.muted}}>미발행</span>},
          {key:"status",label:"상태",render:v=><SB s={v}/>},
        ]} data={CALS}/>
      </div>
    </div>}
    {sub==="cert"&&<div style={{background:D.card,borderRadius:"8px",padding:"14px",border:`1px solid ${D.border}`}}>
      <div style={{marginBottom:"10px",fontSize:"13px",color:D.sub}}>교정성적서 PDF 관리 — 고객 포탈에서 교정일/장비명/SN으로 검색 후 다운로드 가능</div>
      <TBL cols={[
        {key:"cert",label:"성적서번호",render:v=><span style={{fontFamily:"monospace",fontWeight:600,color:D.accent}}>{v}</span>},
        {key:"client",label:"고객사"},{key:"device",label:"장비"},{key:"date",label:"교정일"},
        {key:"pdf",label:"PDF",render:()=><Badge t="📄 다운로드" c={D.primary} bg={D.primaryDim}/>},
      ]} data={CALS.filter(c=>c.cert!=="-")}/>
    </div>}
    {sub==="alert"&&<div style={{background:D.card,borderRadius:"8px",padding:"20px",border:`1px solid ${D.border}`}}>
      <div style={{fontSize:"14px",fontWeight:700,color:D.text,marginBottom:"10px"}}>🔔 연간 교정 알림 시스템</div>
      <div style={{fontSize:"13px",color:D.sub}}>마지막 교정일로부터 11개월 경과 시 고객 및 담당자에게 자동 알림 발송</div>
      <div style={{marginTop:"12px",padding:"10px",borderRadius:"6px",background:D.warnDim,fontSize:"12px",color:D.warn}}>
        ⏰ 알림 예정: FUSHAN (2027-03-15), ISOCAL (2027-03-15)
      </div>
    </div>}
  </div>);
}

// ═══ MODULE 5: AS MANAGEMENT ═══
function Mod5() {
  const [sub,setSub] = useState("tickets");
  const [selectedTicket,setSelectedTicket] = useState(null);
  const openCount = AS_DATA.filter(a=>a.status!=="완료").length;

  if(selectedTicket) {
    const t = selectedTicket;
    const disp = DISPATCHES.filter(d=>d.ticket===t.no);
    return (<div>
      <button onClick={()=>setSelectedTicket(null)} style={{padding:"6px 14px",borderRadius:"6px",background:D.card,color:D.sub,border:`1px solid ${D.border}`,cursor:"pointer",fontSize:"12px",marginBottom:"12px"}}>← 목록으로</button>
      <div style={{background:D.card,borderRadius:"8px",padding:"16px",border:`1px solid ${D.border}`,marginBottom:"12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div><span style={{fontFamily:"monospace",color:D.accent,fontWeight:700}}>{t.no}</span> <SB s={t.status}/></div>
          <span style={{fontSize:"12px",color:D.sub}}>{t.date}</span>
        </div>
        <div style={{fontSize:"15px",fontWeight:700,marginBottom:"8px"}}>{t.title}</div>
        <div style={{display:"flex",gap:"16px",fontSize:"12px",color:D.sub,flexWrap:"wrap"}}>
          <span>고객: <b style={{color:D.text}}>{t.client}</b></span>
          <span>담당: <b style={{color:D.text}}>{t.handler}</b></span>
          {t.model&&<span>장비: <b style={{color:D.primary}}>{t.model}</b></span>}
          {t.sn&&<span>S/N: <b style={{color:D.accent}}>{t.sn}</b></span>}
        </div>
      </div>
      {/* Dispatch Records */}
      <div style={{background:D.card,borderRadius:"8px",padding:"16px",border:`1px solid ${D.border}`}}>
        <div style={{fontSize:"14px",fontWeight:700,marginBottom:"12px",color:D.text}}>🚗 출동 기록</div>
        {disp.length===0?<div style={{color:D.muted,fontSize:"13px",padding:"20px",textAlign:"center"}}>출동 기록 없음</div>:
        disp.map((d,i)=>(
          <div key={i} style={{padding:"12px",borderRadius:"8px",background:D.bg,border:`1px solid ${D.border}`,marginBottom:"8px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px",flexWrap:"wrap",gap:"6px"}}>
              <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                <Badge t={d.vehicle==="company_car"?"🚗 회사차량":d.vehicle==="motorbike"?"🏍️ 오토바이":d.vehicle==="grab"?"🚕 Grab":"🚖 택시"} c={D.text} bg={D.primaryDim}/>
                <span style={{fontSize:"12px",color:D.sub}}>{d.vno}</span>
              </div>
              <span style={{fontSize:"11px",color:D.muted}}>{d.emp}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"8px",fontSize:"12px"}}>
              <div><span style={{color:D.sub}}>Google 예상왕복</span><div style={{fontWeight:700,color:D.primary}}>{d.google_round} km</div></div>
              {d.odo_dep>0&&<>
                <div><span style={{color:D.sub}}>출발미터</span><div style={{fontWeight:700}}>{fmt(d.odo_dep)} km</div></div>
                <div><span style={{color:D.sub}}>복귀미터</span><div style={{fontWeight:700}}>{fmt(d.odo_ret)} km</div></div>
                <div><span style={{color:D.sub}}>실제주행</span><div style={{fontWeight:700,color:D.accent}}>{d.actual} km</div></div>
                <div><span style={{color:D.sub}}>차이</span><div style={{fontWeight:700,color:Math.abs(d.diff)>5?D.danger:D.success}}>{d.diff>0?"+":""}{d.diff} km</div></div>
              </>}
              {d.cost>0&&<div><span style={{color:D.sub}}>교통비</span><div style={{fontWeight:700,color:D.warn}}>{fmt(d.cost)}₫</div></div>}
            </div>
            <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
              {d.odo_dep>0&&<><Badge t="📷 출발미터사진" c={D.primary} bg={D.primaryDim}/><Badge t="📷 복귀미터사진" c={D.primary} bg={D.primaryDim}/></>}
              {d.cost>0&&<Badge t="🧾 영수증" c={D.accent} bg={D.accentDim}/>}
            </div>
          </div>
        ))}
        <button style={{marginTop:"8px",padding:"8px 16px",borderRadius:"6px",background:D.primary,color:"#fff",border:"none",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>+ 출동 등록</button>
      </div>
    </div>);
  }

  return (<div>
    <Tabs tabs={[{key:"tickets",label:"AS 접수현황",icon:"🔧"},{key:"dispatch",label:"출동관리",icon:"🚗"}]} active={sub} onChange={setSub}/>
    {sub==="tickets"&&<div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"10px",marginBottom:"14px"}}>
        <Stat l="전체 AS" v={AS_DATA.length+"건"} c={D.primary}/>
        <Stat l="미완료" v={openCount+"건"} s="처리 필요" c={openCount>0?D.danger:D.success}/>
        <Stat l="완료" v={AS_DATA.filter(a=>a.status==="완료").length+"건"} c={D.success}/>
      </div>
      <div style={{background:D.card,borderRadius:"8px",padding:"14px",border:`1px solid ${D.border}`}}>
        <TBL cols={[
          {key:"no",label:"전표번호",render:v=><span style={{fontFamily:"monospace",fontWeight:700,color:D.accent,fontSize:"11px"}}>{v}</span>},
          {key:"date",label:"접수일"},{key:"client",label:"고객사",render:v=><span style={{fontWeight:600}}>{v}</span>},
          {key:"title",label:"제목",render:v=><span style={{maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",display:"inline-block"}}>{v}</span>},
          {key:"handler",label:"담당"},{key:"model",label:"장비"},{key:"sn",label:"S/N",render:v=>v?<span style={{fontFamily:"monospace",fontSize:"11px"}}>{v}</span>:<span style={{color:D.muted}}>-</span>},
          {key:"status",label:"상태",render:v=><SB s={v}/>},
        ]} data={AS_DATA} onRow={setSelectedTicket}/>
      </div>
    </div>}
    {sub==="dispatch"&&<div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"10px",marginBottom:"14px"}}>
        <Stat l="이번달 출동" v={DISPATCHES.length+"건"} c={D.primary}/>
        <Stat l="총 주행거리" v={DISPATCHES.reduce((a,d)=>a+d.actual,0)+"km"} c={D.accent}/>
        <Stat l="교통비 합계" v={fmt(DISPATCHES.reduce((a,d)=>a+d.cost,0))+"₫"} c={D.warn}/>
      </div>
      <div style={{background:D.card,borderRadius:"8px",padding:"14px",border:`1px solid ${D.border}`}}>
        <TBL cols={[
          {key:"ticket",label:"AS전표",render:v=><span style={{fontFamily:"monospace",fontSize:"11px",color:D.accent}}>{v}</span>},
          {key:"emp",label:"출동자"},{key:"vehicle",label:"수단",render:v=>{const m={company_car:"🚗 차량",motorbike:"🏍️ 오토바이",grab:"🚕 Grab",taxi:"🚖 택시"};return m[v]||v;}},
          {key:"google_round",label:"Google(km)",render:v=>v+"km"},
          {key:"actual",label:"실제(km)",render:v=>v>0?v+"km":"-"},
          {key:"diff",label:"차이",render:v=>v!==0?<span style={{color:Math.abs(v)>5?D.danger:D.success}}>{v>0?"+":""}{v}km</span>:"-"},
          {key:"cost",label:"교통비",render:v=>v>0?<span style={{color:D.warn}}>{fmt(v)}₫</span>:"-"},
        ]} data={DISPATCHES}/>
      </div>
    </div>}
  </div>);
}

// ═══ MAIN ═══
export default function App() {
  const [mod,setMod] = useState(3);
  return (
    <div style={{minHeight:"100vh",background:D.bg,fontFamily:FONT,color:D.text}}>
      <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet"/>
      <div style={{background:"#0D0D10",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${D.border}`}}>
        <div>
          <div style={{fontSize:"11px",color:D.muted,letterSpacing:"0.1em",fontWeight:600}}>TELLUSTECH ERP</div>
          <div style={{fontSize:"18px",fontWeight:800}}>{mod===3?"재고관리":mod===4?"교정관리":"AS(CS)관리"}</div>
        </div>
        <div style={{display:"flex",gap:"6px"}}>
          {[3,4,5].map(m=><button key={m} onClick={()=>setMod(m)} style={{
            padding:"6px 14px",borderRadius:"6px",border:`1px solid ${mod===m?D.primary:D.border}`,
            background:mod===m?D.primaryDim:"transparent",color:mod===m?D.primary:D.sub,
            fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:FONT
          }}>M{m} {m===3?"재고":m===4?"교정":"AS"}</button>)}
        </div>
      </div>
      <div style={{maxWidth:"1200px",margin:"0 auto",padding:"20px"}}>
        {mod===3&&<Mod3/>}
        {mod===4&&<Mod4/>}
        {mod===5&&<Mod5/>}
      </div>
    </div>
  );
}
