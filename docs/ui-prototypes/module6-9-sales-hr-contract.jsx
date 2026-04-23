import { useState } from "react";

const D = {
  bg:"#111113",card:"#1A1A1F",cardHover:"#222228",primary:"#5B9BD5",primaryDim:"#2A3A4A",
  accent:"#E8943A",accentDim:"#3A2A18",success:"#4ADE80",successDim:"#1A2E1A",
  danger:"#F87171",dangerDim:"#2E1A1A",warn:"#FACC15",warnDim:"#2E2A12",
  text:"#E8E6E1",sub:"#8A8A8A",muted:"#555",border:"#2A2A30",input:"#1E1E24",purple:"#A78BFA",purpleDim:"#2A1F3A",
};
const FONT = "'Pretendard',-apple-system,sans-serif";
const fmt = (n) => n ? new Intl.NumberFormat("ko-KR").format(n) : "-";

function Badge({t,c,bg}){
  return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,color:c,background:bg}}>{t}</span>;
}

function Stat({l,v,s,c}){
  return (
    <div style={{flex:"1 1 150px",padding:"14px",borderRadius:"8px",background:D.card,border:"1px solid "+D.border,borderLeft:"3px solid "+(c||D.primary)}}>
      <div style={{fontSize:"11px",color:D.sub,fontWeight:600}}>{l}</div>
      <div style={{fontSize:"20px",fontWeight:800,color:c||D.text,marginTop:"3px"}}>{v}</div>
      {s && <div style={{fontSize:"10px",color:D.muted,marginTop:"2px"}}>{s}</div>}
    </div>
  );
}

function TBL({cols,data,onRow}){
  return (
    <div style={{overflowX:"auto",borderRadius:"8px",border:"1px solid "+D.border}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
        <thead>
          <tr style={{background:D.primaryDim}}>
            {cols.map(function(c,i){
              return <th key={i} style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:D.primary,fontSize:"11px",whiteSpace:"nowrap",borderBottom:"2px solid "+D.primary}}>{c.label}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {data.map(function(r,ri){
            var bgEven = ri%2===0 ? D.bg : D.card;
            return (
              <tr key={ri} onClick={function(){onRow && onRow(r)}}
                style={{cursor:onRow?"pointer":"default",background:bgEven,transition:"background 0.1s"}}
                onMouseEnter={function(e){e.currentTarget.style.background=D.cardHover}}
                onMouseLeave={function(e){e.currentTarget.style.background=bgEven}}>
                {cols.map(function(c,ci){
                  return <td key={ci} style={{padding:"7px 10px",borderBottom:"1px solid "+D.border,color:D.text,whiteSpace:"nowrap"}}>{c.render ? c.render(r[c.key],r) : r[c.key]}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Tabs({tabs,active,onChange}){
  return (
    <div style={{display:"flex",gap:"4px",marginBottom:"16px",borderBottom:"1px solid "+D.border}}>
      {tabs.map(function(t){
        var isActive = active===t.key;
        return (
          <button key={t.key} onClick={function(){onChange(t.key)}} style={{
            padding:"10px 16px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:600,fontFamily:FONT,
            background:isActive?D.primary:"transparent",color:isActive?"#fff":D.sub,
            borderRadius:"6px 6px 0 0",marginBottom:"-1px"
          }}>{t.icon} {t.label}</button>
        );
      })}
    </div>
  );
}

function renderMono(v){ return <span style={{fontFamily:"monospace",fontSize:"11px",color:D.accent}}>{v}</span>; }
function renderBold(v){ return <span style={{fontWeight:600}}>{v}</span>; }
function renderAmountSuccess(v){ if(!v) return <span style={{color:D.muted}}>0</span>; return <span style={{fontWeight:700,color:D.success}}>{fmt(v)}₫</span>; }
function renderAmountAccent(v){ return <span style={{fontWeight:700,color:D.accent}}>{fmt(v)}₫</span>; }
function renderSmall(v){ return <span style={{fontSize:"11px",color:D.sub}}>{v}</span>; }
function renderAcct(v){ return v ? <Badge t="V" c={D.success} bg={D.successDim}/> : <Badge t="-" c={D.muted} bg={D.border}/>; }
function renderPositive(v){ if(!v) return <span style={{color:D.muted}}>-</span>; return <span>{fmt(v)}</span>; }

function renderProject(v){
  var c = D.sub; var bg = D.border;
  if(v.indexOf("Rental") >= 0){ c = D.success; bg = D.successDim; }
  else if(v.indexOf("Calibration") >= 0){ c = D.purple; bg = D.purpleDim; }
  else if(v.indexOf("Repair") >= 0){ c = D.accent; bg = D.accentDim; }
  return <Badge t={v} c={c} bg={bg}/>;
}

function renderEndDate(v){
  var d = new Date(v);
  var now = new Date();
  var days = Math.floor((d - now) / 86400000);
  var clr = D.text; var w = 400; var icon = "";
  if(days < 30){ clr = D.danger; w = 700; icon = " ⚠"; }
  else if(days < 90){ clr = D.warn; }
  return <span style={{color:clr,fontWeight:w}}>{v}{icon}</span>;
}

function renderContractStatus(v){
  if(v === "active") return <Badge t="활성" c={D.success} bg={D.successDim}/>;
  return <Badge t="만료" c={D.danger} bg={D.dangerDim}/>;
}

var SALES = [
  {no:"2026/04/15-10",date:"2026-04-15",client:"IMJ VINA",dept:"TVHN",project:"IT Xuat Kho(소모품출고)",item:"D320IU90KC-V@",total:0,qty:1,acct:false},
  {no:"2026/04/15-4",date:"2026-04-15",client:"AMO VINA",dept:"VRBN",project:"T&M Repair(F)",item:"Agilent 4294A",total:53000000,qty:1,acct:false},
  {no:"2026/04/15-2",date:"2026-04-15",client:"FUSHAN TECHNOLOGY",dept:"TVBN",project:"T&M Calibration(C)",item:"Cal service (66pcs)",total:15150000,qty:66,acct:false},
  {no:"2026/04/14-27",date:"2026-04-14",client:"YEJIN F&G VINA",dept:"VRBN",project:"IT Rental(R)",item:"D310 Rental 외 3건",total:8567964,qty:5187,acct:true},
  {no:"2026/04/14-14",date:"2026-04-14",client:"HPM",dept:"VRBN",project:"T&M Rental(R)",item:"N9020B Rental",total:14111995,qty:1,acct:true},
  {no:"2026/04/14-13",date:"2026-04-14",client:"TƯ VẤN SOLUS",dept:"VRHCM",project:"IT Rental(R)",item:"D310 Rental 외 2건",total:1188000,qty:1,acct:true},
];

var PURCHASES = [
  {no:"04/08-1",date:"2026-04-08",supplier:"SAMSUNGNEO",item:"TN221K 외 29건",wh:"IT MAIN STOCK",qty:584,amount:604517446,acct:true,note:"03월 소모품 매입"},
  {no:"03/31-5",date:"2026-03-31",supplier:"Tellustech KR",item:"N9020B Rental 외 9건",wh:"VR TM_Service",qty:10,amount:212861250,acct:true,note:"TVO20250805-004"},
  {no:"03/31-3",date:"2026-03-31",supplier:"Sengt Equipment",item:"E5071C Rental 외 10건",wh:"VR TM_Service",qty:11,amount:79579500,acct:true,note:"Year2000"},
  {no:"03/19-1",date:"2026-03-19",supplier:"KEYSIGHT",item:"N9020B (5대)",wh:"Tellus BN TM",qty:5,amount:5139333150,acct:true,note:"TVO20260128-01"},
  {no:"03/17-1",date:"2026-03-17",supplier:"KEYSIGHT",item:"E5071C (9대)",wh:"Tellus BN TM",qty:9,amount:7262325000,acct:true,note:"eBiz_VN_TVO20251231-02"},
];

var INCIDENTS = [
  {id:1,writer:"Đoàn Đức Hiền",target:"Phạm Đức Khang",date:"2026-04-10",type:"praise",desc:"고객사 IMJ VINA에서 긴급 잼 발생 시 30분 내 출동하여 즉시 해결. 고객사 매우 만족."},
  {id:2,writer:"Ms. Bình",target:"Trương Viết Thiết",date:"2026-04-08",type:"praise",desc:"WELSTORY 신규 장비 3대 설치 시 주말에도 자발적으로 출근하여 설치 완료."},
  {id:3,writer:"Nguyễn Văn Hùng",target:"Nguyễn Văn Linh",date:"2026-04-05",type:"improvement",desc:"EM-TECH 고객사 AS 건에서 잘못된 부품을 출고하여 재방문 필요. 출고 전 확인 프로세스 준수 필요."},
  {id:4,writer:"Trần Huy Lộc",target:"Lee Su Mok",date:"2026-03-28",type:"praise",desc:"교정 서비스 표준화 매뉴얼 작성을 주도하여 전 직원 교정 품질이 향상됨."},
];

var EVALUATIONS = [
  {emp:"Phạm Đức Khang",role:"Tech",scores:[85,78,92,88,0,75,90,70,95],total:82.4,grade:"B",reason:"AS TAT 우수(평균 2.1h, 팀평균 4.5h). 출동효율 높음. ERP 입력속도 개선 필요."},
  {emp:"Trần Huy Lộc",role:"Tech",scores:[90,85,78,82,0,80,85,75,90],total:82.8,grade:"B",reason:"사건기반 평가 우수(칭찬 4건). 교정 매뉴얼 기여. TAT 약간 느림."},
  {emp:"Nguyễn Văn Linh",role:"Tech",scores:[55,72,68,75,0,65,70,60,85],total:68.2,grade:"D",reason:"부품 오출고 사건(개선필요 1건). AS 처리속도 팀 평균 이하. ERP 숙련도 교육 필요."},
  {emp:"Ms. Bình",role:"Sales",scores:[88,90,0,0,95,88,95,90,100],total:91.3,grade:"A",reason:"매출 목표 달성률 118%. ERP 마감 항상 준수. 사건기반 평가 긍정적."},
];

var METRIC_NAMES = ["사건기반","동료평가","AS TAT","출동효율","매출기여","ERP속도","ERP마감","ERP숙련","근태"];
var METRIC_WEIGHTS = [20,15,15,10,15,5,10,5,5];

var CONTRACTS = [
  {no:"VRT/DD20250101001",client:"ĐỈNH DƯƠNG VN",device:"N511",sn:"357130850527",start:"2025-01-01",end:"2029-01-01",base:1700000,free_bw:5000,free_c:0,over_bw:150,over_c:0,sales:"Ms. Bình",tech:"THIET",km:2,status:"active"},
  {no:"VRT/DD20250101001",client:"ĐỈNH DƯƠNG VN",device:"X7500",sn:"0A2HBJNTB0009Q",start:"2025-01-01",end:"2029-01-01",base:1550000,free_bw:5000,free_c:0,over_bw:150,over_c:0,sales:"Ms. Bình",tech:"THIET",km:2,status:"active"},
  {no:"VRT/VSD20240201001",client:"VSD CHEMICAL",device:"D330",sn:"386520200343",start:"2024-01-01",end:"2026-11-01",base:3900000,free_bw:4000,free_c:2800,over_bw:150,over_c:1500,sales:"Ms. Bình",tech:"Khang",km:57,status:"active"},
  {no:"TLS-20181013001",client:"WELSTORY VN",device:"D310",sn:"356180400181",start:"2024-03-15",end:"2025-03-14",base:3600000,free_bw:146000,free_c:13000,over_bw:200,over_c:2000,sales:"Ms. Bình",tech:"LINH",km:45,status:"active"},
  {no:"TLS20210102002",client:"HÀ NỘI SEOUL",device:"N511",sn:"357160100107",start:"2024-03-15",end:"2025-03-14",base:1400000,free_bw:5000,free_c:0,over_bw:180,over_c:0,sales:"Ms. Duyên",tech:"Khang",km:2,status:"active"},
  {no:"VRT-AZ20240113001",client:"A TO Z",device:"D310",sn:"356180400172",start:"2024-01-13",end:"2025-01-12",base:1000000,free_bw:1000,free_c:100,over_bw:150,over_c:1500,sales:"Ms. Duyên",tech:"-",km:5.9,status:"expired"},
];

function ScoreBar({name,score,weight}){
  var color = D.success;
  if(score === 0) color = D.muted;
  else if(score < 60) color = D.danger;
  else if(score < 80) color = D.warn;
  return (
    <div style={{fontSize:"11px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
        <span style={{color:D.sub}}>{name} ({weight}%)</span>
        <span style={{fontWeight:700,color:color}}>{score || "-"}</span>
      </div>
      <div style={{height:"4px",background:D.border,borderRadius:"2px",overflow:"hidden"}}>
        <div style={{width:(score||0)+"%",height:"100%",background:color,borderRadius:"2px"}}/>
      </div>
    </div>
  );
}

function gradeColor(g){
  if(g==="A") return D.success;
  if(g==="B") return D.primary;
  if(g==="C") return D.warn;
  return D.danger;
}
function gradeBg(g){
  if(g==="A") return D.successDim;
  if(g==="B") return D.primaryDim;
  if(g==="C") return D.warnDim;
  return D.dangerDim;
}

function Mod6(){
  var totalSales = SALES.reduce(function(a,b){return a+b.total},0);
  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"10px",marginBottom:"14px"}}>
        <Stat l="매출건수" v={SALES.length+"건"} c={D.primary}/>
        <Stat l="매출합계" v={fmt(totalSales)+"₫"} c={D.success}/>
        <Stat l="회계반영" v={SALES.filter(function(s){return s.acct}).length+"건"} c={D.success}/>
        <Stat l="미반영" v={SALES.filter(function(s){return !s.acct}).length+"건"} c={D.warn}/>
      </div>
      <div style={{background:D.card,borderRadius:"8px",padding:"14px",border:"1px solid "+D.border}}>
        <TBL cols={[
          {key:"no",label:"전표번호",render:renderMono},
          {key:"date",label:"일자"},
          {key:"client",label:"거래처",render:renderBold},
          {key:"project",label:"매출유형",render:renderProject},
          {key:"item",label:"품목"},
          {key:"qty",label:"수량",render:fmt},
          {key:"total",label:"합계",render:renderAmountSuccess},
          {key:"acct",label:"회계",render:renderAcct},
        ]} data={SALES}/>
      </div>
    </div>
  );
}

function Mod7(){
  var totalPurchase = PURCHASES.reduce(function(a,b){return a+b.amount},0);
  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"10px",marginBottom:"14px"}}>
        <Stat l="매입건수" v={PURCHASES.length+"건"} c={D.primary}/>
        <Stat l="매입합계" v={fmt(totalPurchase)+"₫"} c={D.accent}/>
      </div>
      <div style={{background:D.card,borderRadius:"8px",padding:"14px",border:"1px solid "+D.border}}>
        <TBL cols={[
          {key:"no",label:"전표번호",render:renderMono},
          {key:"date",label:"일자"},
          {key:"supplier",label:"공급사",render:renderBold},
          {key:"item",label:"품목"},
          {key:"wh",label:"창고",render:renderSmall},
          {key:"qty",label:"수량",render:fmt},
          {key:"amount",label:"금액",render:renderAmountAccent},
          {key:"note",label:"비고",render:renderSmall},
        ]} data={PURCHASES}/>
      </div>
    </div>
  );
}

function Mod8(){
  var [sub,setSub] = useState("incidents");
  return (
    <div>
      <Tabs tabs={[
        {key:"incidents",label:"사건기반 수시평가",icon:"📝"},
        {key:"ai",label:"AI 종합평가",icon:"🤖"},
        {key:"payroll",label:"급여/인센티브",icon:"💰"},
      ]} active={sub} onChange={setSub}/>

      {sub==="incidents" && (
        <div>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"12px"}}>
            <button style={{padding:"8px 16px",borderRadius:"6px",background:D.primary,color:"#fff",border:"none",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:FONT}}>+ 사건 기록 작성</button>
          </div>
          {INCIDENTS.map(function(inc){
            var isPraise = inc.type==="praise";
            return (
              <div key={inc.id} style={{background:D.card,borderRadius:"8px",padding:"14px",border:"1px solid "+D.border,marginBottom:"10px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px",flexWrap:"wrap",gap:"6px"}}>
                  <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
                    <Badge t={isPraise?"👏 칭찬":"⚠ 개선필요"} c={isPraise?D.success:D.warn} bg={isPraise?D.successDim:D.warnDim}/>
                    <span style={{fontSize:"12px",color:D.sub}}>작성: <b style={{color:D.text}}>{inc.writer}</b></span>
                    <span style={{fontSize:"12px",color:D.sub}}>→ 대상: <b style={{color:D.accent}}>{inc.target}</b></span>
                  </div>
                  <span style={{fontSize:"11px",color:D.muted}}>{inc.date}</span>
                </div>
                <div style={{fontSize:"13px",color:D.text,lineHeight:"1.5"}}>{inc.desc}</div>
              </div>
            );
          })}
        </div>
      )}

      {sub==="ai" && (
        <div>
          <div style={{marginBottom:"12px",fontSize:"13px",color:D.sub}}>AI가 9개 지표를 분석하여 종합 평가 점수를 산출합니다.</div>
          {EVALUATIONS.map(function(ev,i){
            return (
              <div key={i} style={{background:D.card,borderRadius:"8px",padding:"16px",border:"1px solid "+D.border,marginBottom:"12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
                  <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                    <span style={{fontSize:"15px",fontWeight:700}}>{ev.emp}</span>
                    <Badge t={ev.role} c={D.primary} bg={D.primaryDim}/>
                  </div>
                  <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                    <span style={{fontSize:"24px",fontWeight:800,color:gradeColor(ev.grade)}}>{ev.total}</span>
                    <Badge t={"등급 "+ev.grade} c={gradeColor(ev.grade)} bg={gradeBg(ev.grade)}/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"6px",marginBottom:"12px"}}>
                  {METRIC_NAMES.map(function(name,mi){
                    return <ScoreBar key={name} name={name} score={ev.scores[mi]} weight={METRIC_WEIGHTS[mi]}/>;
                  })}
                </div>
                <div style={{padding:"10px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border,fontSize:"12px",color:D.sub}}>
                  <span style={{fontWeight:700,color:D.primary}}>AI 분석: </span>{ev.reason}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sub==="payroll" && (
        <div style={{background:D.card,borderRadius:"8px",padding:"20px",border:"1px solid "+D.border,textAlign:"center"}}>
          <div style={{fontSize:"14px",fontWeight:700,marginBottom:"8px"}}>💰 급여/인센티브 관리</div>
          <div style={{fontSize:"13px",color:D.sub}}>월별 급여명세 + 인센티브 (T&M/IT 구분)</div>
        </div>
      )}
    </div>
  );
}

function Mod9(){
  var [search,setSearch] = useState("");
  var filtered = CONTRACTS.filter(function(c){
    var s = search.toLowerCase();
    return c.client.toLowerCase().indexOf(s)>=0 || c.sn.indexOf(search)>=0 || c.device.indexOf(search)>=0;
  });
  var active = CONTRACTS.filter(function(c){return c.status==="active"});
  var expiring = active.filter(function(c){
    var diff = (new Date(c.end) - new Date()) / 86400000;
    return diff < 30;
  });
  var totalBase = active.reduce(function(a,b){return a+b.base},0);
  var expiringCount = expiring.length;
  var expiringText = expiring.map(function(c){return c.client+" ("+c.device+" "+c.end+")"}).join(", ");

  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"10px",marginBottom:"14px"}}>
        <Stat l="총 계약" v={CONTRACTS.length+"건"} c={D.primary}/>
        <Stat l="활성 계약" v={active.length+"건"} c={D.success}/>
        <Stat l="30일내 만료" v={expiringCount+"건"} s={expiringCount>0?"갱신 필요":""} c={expiringCount>0?D.danger:D.success}/>
        <Stat l="월 기본료 합계" v={fmt(totalBase)+"₫"} c={D.success}/>
      </div>
      {expiringCount>0 && (
        <div style={{padding:"10px 14px",borderRadius:"8px",background:D.dangerDim,border:"1px solid rgba(248,113,113,0.2)",marginBottom:"12px",fontSize:"12px",color:D.danger}}>
          ⏰ 만료 임박: {expiringText}
        </div>
      )}
      <div style={{background:D.card,borderRadius:"8px",padding:"14px",border:"1px solid "+D.border}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
          <input value={search} onChange={function(e){setSearch(e.target.value)}} placeholder="업체명, S/N, 장비명 검색..."
            style={{padding:"8px 12px",borderRadius:"6px",border:"1px solid "+D.border,background:D.input,color:D.text,fontSize:"13px",fontFamily:FONT,width:"280px"}}/>
          <button style={{padding:"8px 16px",borderRadius:"6px",background:D.primary,color:"#fff",border:"none",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:FONT}}>+ 계약 등록</button>
        </div>
        <TBL cols={[
          {key:"no",label:"계약번호",render:renderMono},
          {key:"client",label:"업체명",render:renderBold},
          {key:"device",label:"장비",render:function(v){return <Badge t={v} c={D.primary} bg={D.primaryDim}/>}},
          {key:"sn",label:"S/N",render:function(v){return <span style={{fontFamily:"monospace",fontSize:"11px"}}>{v}</span>}},
          {key:"base",label:"기본료",render:function(v){return <span style={{color:D.success}}>{fmt(v)}</span>}},
          {key:"free_bw",label:"기본B&W",render:fmt},
          {key:"free_c",label:"기본Color",render:renderPositive},
          {key:"over_bw",label:"초과B&W",render:function(v){return v+"₫"}},
          {key:"over_c",label:"초과Color",render:renderPositive},
          {key:"sales",label:"영업"},
          {key:"tech",label:"기술"},
          {key:"km",label:"KM"},
          {key:"end",label:"종료일",render:renderEndDate},
          {key:"status",label:"상태",render:renderContractStatus},
        ]} data={filtered}/>
      </div>
    </div>
  );
}

function getTitle(mod){
  if(mod===6) return "매출관리";
  if(mod===7) return "매입관리";
  if(mod===8) return "인사관리 + AI평가";
  return "IT계약관리";
}
function getShort(m){
  if(m===6) return "매출";
  if(m===7) return "매입";
  if(m===8) return "인사";
  return "IT계약";
}

export default function App(){
  var [mod,setMod] = useState(6);
  return (
    <div style={{minHeight:"100vh",background:D.bg,fontFamily:FONT,color:D.text}}>
      <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet"/>
      <div style={{background:"#0D0D10",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid "+D.border}}>
        <div>
          <div style={{fontSize:"11px",color:D.muted,letterSpacing:"0.1em",fontWeight:600}}>TELLUSTECH ERP</div>
          <div style={{fontSize:"18px",fontWeight:800}}>{getTitle(mod)}</div>
        </div>
        <div style={{display:"flex",gap:"6px"}}>
          {[6,7,8,9].map(function(m){
            var isActive = mod===m;
            return (
              <button key={m} onClick={function(){setMod(m)}} style={{
                padding:"6px 12px",borderRadius:"6px",
                border:"1px solid "+(isActive?D.primary:D.border),
                background:isActive?D.primaryDim:"transparent",
                color:isActive?D.primary:D.sub,
                fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:FONT
              }}>M{m} {getShort(m)}</button>
            );
          })}
        </div>
      </div>
      <div style={{maxWidth:"1200px",margin:"0 auto",padding:"20px"}}>
        {mod===6 && <Mod6/>}
        {mod===7 && <Mod7/>}
        {mod===8 && <Mod8/>}
        {mod===9 && <Mod9/>}
      </div>
    </div>
  );
}
