import { useState } from "react";

const D = {
  bg:"#111113",card:"#1A1A1F",cardHover:"#222228",primary:"#5B9BD5",primaryDim:"#2A3A4A",
  accent:"#E8943A",accentDim:"#3A2A18",success:"#4ADE80",successDim:"#1A2E1A",
  danger:"#F87171",dangerDim:"#2E1A1A",warn:"#FACC15",warnDim:"#2E2A12",
  text:"#E8E6E1",sub:"#8A8A8A",muted:"#555",border:"#2A2A30",borderFocus:"#5B9BD5",
  input:"#1E1E24",purple:"#A78BFA",purpleDim:"#2A1F3A",
};
var FONT="'Pretendard',-apple-system,sans-serif";

function F({l,r,ch,w,h}){return(<div style={{display:"flex",flexDirection:"column",gap:"4px",flex:w||"1 1 220px",minWidth:"130px"}}><label style={{fontSize:"12px",fontWeight:600,color:D.sub}}>{l}{r&&<span style={{color:D.danger}}> *</span>}</label>{ch}{h&&<span style={{fontSize:"10px",color:D.muted}}>{h}</span>}</div>);}
function TI({p,v,on,dis,t}){return <input type={t||"text"} value={v||""} onChange={function(e){on&&on(e.target.value)}} placeholder={p} disabled={dis} style={{padding:"7px 11px",borderRadius:"6px",border:"1px solid "+D.border,background:dis?"#151518":D.input,color:dis?D.muted:D.text,fontSize:"13px",fontFamily:FONT,outline:"none"}} onFocus={function(e){e.target.style.borderColor=D.borderFocus}} onBlur={function(e){e.target.style.borderColor=D.border}}/>;}
function SI({ops,v,on,p}){return(<select value={v||""} onChange={function(e){on&&on(e.target.value)}} style={{padding:"7px 11px",borderRadius:"6px",border:"1px solid "+D.border,background:D.input,color:v?D.text:D.muted,fontSize:"13px",fontFamily:FONT}}><option value="">{p||"선택"}</option>{ops.map(function(o){return <option key={o.v} value={o.v}>{o.l}</option>})}</select>);}
function TA({p,rows,v}){return <textarea value={v||""} placeholder={p} rows={rows||3} style={{padding:"7px 11px",borderRadius:"6px",border:"1px solid "+D.border,background:D.input,color:D.text,fontSize:"13px",fontFamily:FONT,resize:"vertical",outline:"none"}}/>;}
function FU({l,a}){return(<div style={{padding:"12px",borderRadius:"8px",border:"2px dashed "+D.border,background:D.input,textAlign:"center",cursor:"pointer"}} onMouseEnter={function(e){e.currentTarget.style.borderColor=D.primary}} onMouseLeave={function(e){e.currentTarget.style.borderColor=D.border}}><div style={{fontSize:"18px"}}>📎</div><div style={{fontSize:"11px",color:D.sub}}>{l||"파일 선택"}</div><div style={{fontSize:"10px",color:D.muted}}>{a||"PDF, JPG, PNG"}</div></div>);}
function ST({t,i}){return(<div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px",marginTop:"16px",paddingBottom:"6px",borderBottom:"1px solid "+D.border}}>{i&&<span style={{fontSize:"14px"}}>{i}</span>}<span style={{fontSize:"13px",fontWeight:700,color:D.primary}}>{t}</span></div>);}
function Row({ch}){return <div style={{display:"flex",flexWrap:"wrap",gap:"10px",marginBottom:"8px"}}>{ch}</div>;}
function Btns({s}){return(<div style={{display:"flex",gap:"8px",marginTop:"16px",paddingTop:"12px",borderTop:"1px solid "+D.border}}><button style={{padding:"10px 24px",borderRadius:"6px",background:D.primary,color:"#fff",border:"none",fontSize:"14px",fontWeight:700,cursor:"pointer",fontFamily:FONT}}>{s||"저장"}</button><button style={{padding:"10px 24px",borderRadius:"6px",background:"transparent",color:D.sub,border:"1px solid "+D.border,fontSize:"14px",fontWeight:600,cursor:"pointer",fontFamily:FONT}}>취소</button></div>);}
function Badge({t,c,bg}){return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,color:c,background:bg}}>{t}</span>;}
function Note({t,c}){return <div style={{marginTop:"10px",padding:"8px 12px",borderRadius:"6px",background:c==="warn"?D.warnDim:c==="danger"?D.dangerDim:D.primaryDim,fontSize:"11px",color:c==="warn"?D.warn:c==="danger"?D.danger:D.sub}}>{t}</div>;}
function Card({title,sub,ch}){return(<div style={{background:D.card,borderRadius:"10px",padding:"18px",border:"1px solid "+D.border}}><div style={{fontSize:"15px",fontWeight:800,marginBottom:"2px"}}>{title}</div>{sub&&<div style={{fontSize:"11px",color:D.muted,marginBottom:"14px"}}>{sub}</div>}{ch}</div>);}
function SNCheck({strict}){return(<div style={{display:"flex",gap:"6px",alignItems:"flex-end",marginTop:"4px"}}><F l={strict?"S/N 재고확인 (필수)":"S/N 재고확인"} r={strict} ch={<TI p="시리얼번호"/>}/><div style={{paddingBottom:"2px"}}><button style={{padding:"7px 12px",borderRadius:"6px",background:strict?D.danger:D.primary,color:"#fff",border:"none",fontSize:"11px",fontWeight:700,cursor:"pointer",fontFamily:FONT,whiteSpace:"nowrap"}}>{strict?"🔍 필수확인":"🔍 확인"}</button></div><div style={{paddingBottom:"6px"}}><Badge t="미확인" c={D.muted} bg={D.border}/></div></div>);}
function ExcelUpload(){return(<button style={{padding:"5px 12px",borderRadius:"4px",background:D.successDim,color:D.success,border:"1px solid "+D.success,fontSize:"11px",fontWeight:600,cursor:"pointer",fontFamily:FONT}}>📥 엑셀 업로드</button>);}
function AddMore({label}){return(<button style={{padding:"5px 12px",borderRadius:"4px",background:D.accentDim,color:D.accent,border:"1px solid "+D.accent,fontSize:"11px",fontWeight:600,cursor:"pointer",fontFamily:FONT}}>{label || "+ 행 추가 (무제한)"}</button>);}
function SalesReflect(){return(<div style={{marginTop:"8px",display:"flex",gap:"8px",alignItems:"center"}}><button style={{padding:"7px 16px",borderRadius:"6px",background:D.purpleDim,color:D.purple,border:"1px solid "+D.purple,fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:FONT}}>💰 매출 자동반영</button><span style={{fontSize:"11px",color:D.muted}}>클릭 시 매출전표에 맞는 값을 가져와서 매출로 자동 반영</span></div>);}
function ContactBlock({title}){return(<div style={{padding:"10px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border,marginBottom:"6px"}}><div style={{fontSize:"11px",fontWeight:700,color:D.primary,marginBottom:"6px"}}>{title}</div><Row ch={[<F key="a" l="이름" ch={<TI p="담당자명"/>}/>,<F key="b" l="HP" ch={<TI p="010-xxxx-xxxx"/>}/>,<F key="c" l="Office" ch={<TI p="02-xxxx-xxxx"/>}/>,<F key="d" l="이메일" ch={<TI p="email@company.com"/>}/>]}/></div>);}

var depts=[{v:"TVBN",l:"TVBN"},{v:"TVHN",l:"TVHN"},{v:"TVHCM",l:"TVHCM"},{v:"TVNT",l:"TVNT"},{v:"TVDN",l:"TVDN"},{v:"VRBN",l:"VRBN"},{v:"VRHN",l:"VRHN"},{v:"VRHCM",l:"VRHCM"}];
var roles=[{v:"tech",l:"Tech"},{v:"sales",l:"Sales"},{v:"manager",l:"Manager"},{v:"admin",l:"Admin"},{v:"accounting",l:"Accounting"},{v:"hr",l:"HR"},{v:"calibration",l:"Calibration"}];
var techs=[{v:"khang",l:"Khang"},{v:"thiet",l:"Thiết"},{v:"linh",l:"Linh"},{v:"loc",l:"Lộc"}];
var sales=[{v:"binh",l:"Ms. Bình"},{v:"duyen_hn",l:"Ms. Duyên(HN)"},{v:"duyen_hcm",l:"Ms. Duyên(HCM)"}];
var devices=[{v:"D310",l:"Sindoh D310"},{v:"D330",l:"Sindoh D330"},{v:"N511",l:"Sindoh N511"},{v:"X7500",l:"Samsung SL-X7500"}];

// ═══ 0. LOGIN ═══
function P0(){return(<div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"70vh"}}><div style={{background:D.card,borderRadius:"16px",padding:"36px",border:"1px solid "+D.border,width:"380px",maxWidth:"100%"}}><div style={{textAlign:"center",marginBottom:"24px"}}><div style={{fontSize:"11px",color:D.accent,letterSpacing:"0.15em",fontWeight:700}}>TELLUSTECH VINA</div><div style={{fontSize:"22px",fontWeight:800,color:D.text,marginTop:"4px"}}>ERP Login</div></div><div style={{display:"flex",flexDirection:"column",gap:"12px"}}><F l="회사코드" r={true} ch={<SI ops={[{v:"TV",l:"TV — Tellustech Vina"},{v:"VR",l:"VR — Vietrental"}]} p="회사 선택"/>}/><F l="아이디" r={true} ch={<TI p="사원코드 또는 아이디"/>}/><F l="비밀번호" r={true} ch={<TI t="password" p="••••••••"/>}/><F l="언어" ch={<SI ops={[{v:"vi",l:"Tiếng Việt"},{v:"ko",l:"한국어"},{v:"en",l:"English"}]} v="vi"/>}/><button style={{marginTop:"8px",padding:"12px",borderRadius:"8px",background:D.primary,color:"#fff",border:"none",fontSize:"15px",fontWeight:700,cursor:"pointer",fontFamily:FONT,width:"100%"}}>로그인</button></div></div></div>);}

// ═══ 1. CLIENT (거래처코드 자동생성) ═══
function P1(){return(<Card title="거래처 등록" sub="Client Registration" ch={<div>
  <ST t="기본 정보" i="🏢"/>
  <Row ch={[<F key="a" l="거래처코드" r={true} h="자동생성" ch={<TI v="CL-20260421-001" dis={true}/>}/>,<F key="b" l="거래처명" r={true} ch={<TI p="CÔNG TY TNHH ..."/>}/>,<F key="c" l="대표자" ch={<TI p="Mr/Ms ..."/>}/>]}/>
  <Row ch={[<F key="a" l="전화번호" ch={<TI p="021-0395-0999"/>}/>,<F key="b" l="사업자번호(MST)" ch={<TI p="0123456789"/>}/>,<F key="c" l="업종" ch={<SI ops={[{v:"mfg",l:"제조"},{v:"log",l:"물류"},{v:"edu",l:"교육"},{v:"it",l:"IT"},{v:"other",l:"기타"}]}/>}/>]}/>
  <Row ch={[<F key="a" l="주소" ch={<TI p="상세주소"/>}/>]}/>
  <ST t="계좌/결제" i="💰"/>
  <Row ch={[<F key="a" l="은행명" ch={<TI p="Vietcombank"/>}/>,<F key="b" l="계좌번호" ch={<TI/>}/>,<F key="c" l="예금주" ch={<TI/>}/>,<F key="d" l="결제조건(일)" ch={<TI t="number" p="30"/>} w="100px"/>]}/>
  <ST t="영업" i="💼"/>
  <Row ch={[<F key="a" l="알게된경로" ch={<SI ops={[{v:"visit",l:"방문"},{v:"exhibition",l:"전시회"},{v:"referral",l:"소개"},{v:"website",l:"웹"},{v:"existing",l:"기존고객"},{v:"other",l:"기타"}]}/>}/>,<F key="b" l="소개자" ch={<TI p="🔍 검색"/>}/>,<F key="c" l="등급" ch={<SI ops={[{v:"A",l:"A"},{v:"B",l:"B"},{v:"C",l:"C"},{v:"D",l:"D"}]}/>} w="80px"/>,<F key="d" l="영업담당" ch={<SI ops={sales}/>}/>]}/>
  <ST t="마케팅" i="📧"/>
  <Row ch={[<F key="a" l="이메일수신동의" ch={<label style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"13px",color:D.text,marginTop:"4px"}}><input type="checkbox"/> 동의</label>}/>,<F key="b" l="그룹태그" ch={<TI p="VIP, 신규 등"/>}/>]}/>
  <Btns s="거래처 등록"/>
</div>}/>);}

// ═══ 2. ITEM (코드자동, 바코드/자산 제거) ═══
function P2(){return(<Card title="품목 등록" sub="Item Registration" ch={<div>
  <ST t="기본 정보" i="📦"/>
  <Row ch={[<F key="a" l="품목코드" r={true} h="자동생성" ch={<TI v="ITM-20260421-001" dis={true}/>}/>,<F key="b" l="품목명" r={true} ch={<TI p="Mực đen D330 (토너K)"/>}/>,<F key="c" l="제조사" ch={<SI ops={[{v:"SINDOH",l:"SINDOH"},{v:"SAMSUNG",l:"SAMSUNG"},{v:"Keysight",l:"Keysight"},{v:"other",l:"기타"}]}/>}/>]}/>
  <Row ch={[<F key="a" l="구분" r={true} ch={<SI ops={[{v:"product",l:"상품"},{v:"consumable",l:"소모품"},{v:"part",l:"부품"}]}/>}/>,<F key="b" l="장비계열" ch={<TI p="D330, X7500 등"/>}/>,<F key="c" l="규격/사양" ch={<TI p="사양"/>}/>]}/>
  <ST t="재고 설정" i="📊"/>
  <Row ch={[<F key="a" l="최소재고(알림기준)" ch={<TI t="number" p="10"/>}/>]}/>
  <Btns s="품목 등록"/>
</div>}/>);}

// ═══ 3. EMPLOYEE ═══
function P3(){return(<Card title="직원 등록" sub="Employee Registration" ch={<div>
  <ST t="기본 정보" i="👤"/>
  <Row ch={[<F key="a" l="사원코드" r={true} h="자동생성" ch={<TI v="TNV00100" dis={true}/>}/>,<F key="b" l="성명" r={true} ch={<TI p="Nguyễn Văn ..."/>}/>,<F key="c" l="부서(지점)" r={true} ch={<SI ops={depts}/>}/>,<F key="d" l="직책" ch={<TI p="Kỹ Thuật"/>}/>]}/>
  <Row ch={[<F key="a" l="권한" r={true} ch={<SI ops={roles}/>}/>,<F key="b" l="입사일" r={true} ch={<TI t="date"/>}/>,<F key="c" l="전화번호" ch={<TI p="0912-345-6789"/>}/>]}/>
  <ST t="신분증" i="🪪"/>
  <Row ch={[<F key="a" l="CCCD" r={true} ch={<TI p="0123456789012"/>}/>,<F key="b" l="발급일" ch={<TI t="date"/>}/>,<F key="c" l="발급처" ch={<TI/>}/>,<F key="d" l="생년월일" ch={<TI t="date"/>}/>]}/>
  <ST t="급여" i="💰"/>
  <Row ch={[<F key="a" l="기본급(VND)" ch={<TI t="number"/>}/>,<F key="b" l="식비수당" ch={<TI t="number"/>}/>,<F key="c" l="보험등급" ch={<TI t="number"/>}/>,<F key="d" l="세금번호" ch={<TI/>}/>]}/>
  <Row ch={[<F key="a" l="은행명" ch={<TI/>}/>,<F key="b" l="계좌번호" ch={<TI/>}/>]}/>
  <ST t="계약" i="📋"/>
  <Row ch={[<F key="a" l="수습시작" ch={<TI t="date"/>}/>,<F key="b" l="수습종료" ch={<TI t="date"/>}/>,<F key="c" l="계약시작" ch={<TI t="date"/>}/>,<F key="d" l="계약종료" ch={<TI t="date"/>}/>]}/>
  <FU l="증명사진" a="JPG, PNG"/>
  <Btns s="직원 등록"/>
</div>}/>);}

// ═══ 4. IT CONTRACT (대폭 수정) ═══
function P4(){return(<Card title="IT 렌탈 계약 등록" sub="IT Rental Contract" ch={<div>
  <ST t="계약 기본" i="📝"/>
  <Row ch={[<F key="a" l="계약번호" r={true} h="자동생성" ch={<TI v="VRT/CNI20260421001" dis={true}/>}/>,<F key="b" l="거래처" r={true} ch={<TI p="🔍 거래처 검색"/>}/>]}/>
  <Row ch={[<F key="a" l="설치주소" r={true} ch={<TI p="장비 설치 주소"/>}/>,<F key="b" l="사무실~설치지(KM)" h="Google자동" ch={<TI t="number" p="자동"/>}/>]}/>
  <Row ch={[<F key="a" l="계약일" ch={<TI t="date"/>}/>,<F key="b" l="렌탈시작일" r={true} ch={<TI t="date"/>}/>,<F key="c" l="렌탈종료일" r={true} h="만료30일전알림" ch={<TI t="date"/>}/>]}/>
  <Row ch={[<F key="a" l="보증금(VND)" ch={<TI t="number" p="0"/>}/>,<F key="b" l="설치비(VND)" ch={<TI t="number" p="0"/>}/>,<F key="c" l="배송비(VND)" ch={<TI t="number" p="0"/>}/>,<F key="d" l="부가서비스비" ch={<TI t="number" p="0"/>}/>]}/>

  <ST t="담당자 정보" i="👥"/>
  <ContactBlock title="📋 계약담당자"/>
  <ContactBlock title="🔧 기술담당자"/>
  <ContactBlock title="💰 재경담당자"/>

  <ST t="장비 + 과금조건 ① (S/N 복수 등록 가능)" i="🖨️"/>
  <div style={{padding:"12px",borderRadius:"8px",background:D.bg,border:"1px solid "+D.border,marginBottom:"8px"}}>
    <Row ch={[<F key="a" l="장비모델" r={true} ch={<SI ops={devices}/>}/>]}/>
    <Row ch={[<F key="a" l="월기본료(VND)" r={true} ch={<TI t="number" p="3,500,000"/>}/>,<F key="b" l="흑백기본매수" r={true} ch={<TI t="number" p="5,000"/>}/>,<F key="c" l="칼라기본매수" ch={<TI t="number"/>}/>]}/>
    <Row ch={[<F key="a" l="흑백초과단가" r={true} ch={<TI t="number" p="150"/>}/>,<F key="b" l="칼라초과단가" ch={<TI t="number"/>}/>]}/>
    <div style={{marginTop:"8px",padding:"8px",borderRadius:"6px",background:D.card,border:"1px solid "+D.border}}>
      <div style={{fontSize:"11px",fontWeight:700,color:D.accent,marginBottom:"6px"}}>S/N 등록 (복수 — 수백 개 가능)</div>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"6px"}}>
        <SNCheck strict={true}/>
      </div>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"4px"}}>
        {["357160600164","357130850527","0A2HBJNTB0009Q"].map(function(sn){
          return <Badge key={sn} t={sn+" ✓"} c={D.success} bg={D.successDim}/>;
        })}
        <Badge t="..." c={D.muted} bg={D.border}/>
      </div>
      <div style={{display:"flex",gap:"6px"}}><AddMore label="+ S/N 추가"/><ExcelUpload/></div>
    </div>
  </div>

  <div style={{marginBottom:"8px"}}><AddMore label="+ 장비 + 과금조건 세트 추가"/></div>
  <Note t="⚠ IT렌탈 S/N은 실재고 확인 필수." c="warn"/>
  <SalesReflect/>

  <ST t="메모 / 첨부" i="📄"/>
  <Row ch={[<F key="a" l="메모" ch={<TA p="계약관련 메모"/>}/>]}/>
  <FU l="계약서 PDF" a="PDF(자동압축)"/>
  <Note t="💡 저장 시 렌탈기간에 따라 월별 오더 자동생성"/>
  <Btns s="계약 등록"/>
</div>}/>);}

// ═══ 5. TM RENTAL (대폭 수정: 매출먼저, 고객정보, S/N별 매입) ═══
function P5(){return(<Card title="TM 렌탈 등록 (계측기)" sub="T&M Equipment Rental" ch={<div>
  <ST t="고객 정보" i="🏢"/>
  <Row ch={[<F key="a" l="계약번호" r={true} h="자동생성" ch={<TI v="TM-20260421-001" dis={true}/>}/>,<F key="b" l="거래처" r={true} ch={<TI p="🔍 거래처 검색"/>}/>]}/>
  <Row ch={[<F key="a" l="설치주소" ch={<TI p="장비 설치 주소"/>}/>,<F key="b" l="사무실~설치지(KM)" h="Google자동" ch={<TI t="number"/>}/>]}/>
  <ContactBlock title="📋 계약담당자"/>
  <ContactBlock title="🔧 기술담당자"/>
  <ContactBlock title="💰 재경담당자"/>

  <ST t="매출 정보 (품목 세트 — 수백 개 추가 가능)" i="📤"/>
  <div style={{padding:"10px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border,marginBottom:"6px"}}>
    <div style={{fontSize:"11px",fontWeight:700,color:D.accent,marginBottom:"6px"}}>품목 세트 ①</div>
    <Row ch={[<F key="a" l="품목명" r={true} ch={<TI p="E5071C"/>}/>,<F key="b" l="옵션" ch={<TI p="285, 4D5"/>}/>]}/>
    <SNCheck strict={false}/>
    <Row ch={[<F key="a" l="렌탈시작일" ch={<TI t="date"/>}/>,<F key="b" l="렌탈종료일" ch={<TI t="date"/>}/>,<F key="c" l="매출단가(VND)" ch={<TI t="number" p="20,000,000"/>}/>]}/>
    <div style={{padding:"8px",borderRadius:"4px",background:D.card,border:"1px solid "+D.border,marginTop:"6px"}}>
      <div style={{fontSize:"11px",fontWeight:600,color:D.sub,marginBottom:"4px"}}>📥 이 S/N의 매입 정보</div>
      <Row ch={[<F key="a" l="매입처" ch={<TI p="Tellus KR, Jooyon 등"/>}/>,<F key="b" l="매입금액(VND)" ch={<TI t="number"/>}/>,<F key="c" l="커미션(VND)" ch={<TI t="number" p="0"/>}/>]}/>
    </div>
  </div>
  <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}><AddMore label="+ 품목 세트 추가 (무제한)"/><ExcelUpload/></div>

  <ST t="합계" i="💰"/>
  <div style={{padding:"10px",borderRadius:"6px",background:D.primaryDim,fontSize:"12px"}}>
    <div style={{display:"flex",gap:"20px",flexWrap:"wrap"}}>
      <span style={{color:D.sub}}>매출합계: <b style={{color:D.success}}>자동</b></span>
      <span style={{color:D.sub}}>매입합계: <b style={{color:D.accent}}>자동</b></span>
      <span style={{color:D.sub}}>커미션합계: <b style={{color:D.warn}}>자동</b></span>
      <span style={{color:D.sub}}>이익: <b style={{color:D.success}}>매출 - 매입 - 커미션 = 자동</b></span>
    </div>
  </div>
  <Row ch={[<F key="a" l="입금예정일" ch={<TI t="date"/>}/>,<F key="b" l="입금완료일" ch={<TI t="date"/>}/>]}/>
  <Row ch={[<F key="a" l="비고" ch={<TA p="메모"/>}/>]}/>
  <SalesReflect/>
  <Note t="💡 저장 시 렌탈기간에 따라 매월 오더 자동생성"/>
  <Btns s="TM 렌탈 등록"/>
</div>}/>);}

// ═══ 6. IT부문 월별 사용량 컨펌 ═══
function P6(){return(<Card title="IT부문 월별 사용량 컨펌" sub="IT Monthly Usage Confirmation" ch={<div>
  <ST t="청구 정보" i="📊"/>
  <Row ch={[<F key="a" l="계약번호" ch={<TI dis={true} v="VRT/VSD20240201001"/>}/>,<F key="b" l="S/N" ch={<TI dis={true} v="386520200343"/>}/>,<F key="c" l="청구월" ch={<TI v="2026-04" dis={true}/>}/>]}/>
  <ST t="카운터" i="🖨️"/>
  <Row ch={[<F key="a" l="카운터출처" r={true} ch={<SI ops={[{v:"auto",l:"SNMP자동"},{v:"manual",l:"수동입력"},{v:"photo",l:"사진촬영"}]}/>}/>]}/>
  <Row ch={[<F key="a" l="이번달 흑백" r={true} ch={<TI t="number" p="28400"/>}/>,<F key="b" l="전월 흑백" ch={<TI v="24200" dis={true}/>}/>,<F key="c" l="사용량" h="자동" ch={<TI dis={true} v="4,200"/>}/>]}/>
  <Row ch={[<F key="a" l="이번달 칼라" ch={<TI t="number"/>}/>,<F key="b" l="전월 칼라" ch={<TI dis={true}/>}/>,<F key="c" l="칼라 사용량" h="자동" ch={<TI dis={true}/>}/>]}/>
  <ST t="청구" i="💰"/>
  <div style={{padding:"10px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border,fontSize:"12px"}}>
    <span style={{color:D.sub}}>기본료: <b>3,900,000₫</b></span> | <span style={{color:D.accent}}>추가: <b>30,000₫</b></span> | <span style={{color:D.success,fontWeight:800}}>총: 3,930,000₫</span>
  </div>
  <ST t="고객서명" i="✍️"/>
  <div style={{padding:"12px",borderRadius:"8px",border:"2px dashed "+D.primary,background:D.primaryDim,textAlign:"center"}}><div style={{fontSize:"13px",color:D.text}}>✍️ 전자서명 영역</div></div>
  <Note t="💡 실제 목록은 데이터 기반으로 확인 예정"/>
  <Btns s="컨펌 완료"/>
</div>}/>);}

// ═══ 7. CALIBRATION (회사제거, 담당자추가, 복수세트+엑셀, 수량제거, 매출반영) ═══
function P7(){return(<Card title="교정 이행 등록" sub="Calibration Entry" ch={<div>
  <ST t="고객 정보" i="🏢"/>
  <Row ch={[<F key="a" l="고객사" r={true} ch={<TI p="🔍 거래처 검색"/>}/>,<F key="b" l="시행일" r={true} ch={<TI t="date"/>}/>]}/>
  <ContactBlock title="📋 계약담당자"/>
  <ContactBlock title="🔧 기술담당자"/>
  <ContactBlock title="💰 재경담당자"/>
  <ST t="교정 장비 세트 (수백 개 추가 가능)" i="🔬"/>
  <div style={{padding:"10px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border,marginBottom:"6px"}}>
    <Row ch={[<F key="a" l="장비명" r={true} ch={<TI p="HTC-1"/>}/>,<F key="b" l="장비번호" ch={<TI p="장비번호"/>}/>]}/>
    <SNCheck strict={false}/>
    <Row ch={[<F key="a" l="기준금액(VND)" ch={<TI t="number" p="250,000"/>}/>,<F key="b" l="실제금액(VND)" r={true} ch={<TI t="number"/>}/>,<F key="c" l="성적서번호" ch={<TI p="CC-2026-0421-001"/>}/>]}/>
  </div>
  <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}><AddMore label="+ 장비 세트 추가 (무제한)"/><ExcelUpload/></div>
  <ST t="담당" i="👥"/>
  <Row ch={[<F key="a" l="교정직원" r={true} ch={<SI ops={techs}/>}/>,<F key="b" l="영업사원" ch={<SI ops={sales}/>}/>]}/>
  <FU l="교정성적서 PDF (자동압축)" a="PDF"/>
  <SalesReflect/>
  <Note t="💡 다음 교정 예정일 자동 1년후. 11개월후 알림."/>
  <Btns s="교정 등록"/>
</div>}/>);}

// ═══ 8. AS (회사 제거) ═══
function P8(){return(<Card title="AS 접수" sub="A/S Request" ch={<div>
  <ST t="접수" i="🔧"/>
  <Row ch={[<F key="a" l="전표번호" r={true} h="자동생성" ch={<TI v="26/04/21-01" dis={true}/>}/>,<F key="b" l="접수일" r={true} ch={<TI t="date" v="2026-04-21"/>}/>,<F key="c" l="예정일" ch={<TI t="date"/>}/>]}/>
  <Row ch={[<F key="a" l="거래처" r={true} ch={<TI p="🔍 거래처 검색"/>}/>,<F key="b" l="담당자" r={true} ch={<SI ops={techs}/>}/>]}/>
  <ST t="장비/증상" i="🖨️"/>
  <Row ch={[<F key="a" l="장비모델" ch={<TI p="D330, X7500 등"/>}/>]}/>
  <SNCheck strict={false}/>
  <Row ch={[<F key="a" l="증상/내역" r={true} ch={<TA p="아무 언어 입력 → 3개 언어 자동번역" rows={4}/>}/>]}/>
  <FU l="증상 사진" a="JPG, PNG"/>
  <Note t="⚠ 미수금 BLOCKED 시 경고 표시" c="danger"/>
  <Btns s="AS 접수"/>
</div>}/>);}

// ═══ 9. DISPATCH ═══
function P9(){return(<Card title="출동 등록" sub="Dispatch" ch={<div>
  <ST t="출동" i="🚗"/>
  <Row ch={[<F key="a" l="AS전표" r={true} ch={<TI v="26/04/21-01" dis={true}/>}/>,<F key="b" l="출동직원" r={true} ch={<SI ops={techs}/>}/>,<F key="c" l="출발일시" r={true} ch={<TI t="datetime-local"/>}/>]}/>
  <Row ch={[<F key="a" l="출동수단" r={true} ch={<SI ops={[{v:"company_car",l:"🚗 회사차량"},{v:"motorbike",l:"🏍️ 오토바이"},{v:"grab",l:"🚕 Grab"},{v:"taxi",l:"🚖 택시"}]}/>}/>,<F key="b" l="차량번호" ch={<TI p="29-B1 12345"/>}/>]}/>
  <ST t="거리" i="📍"/>
  <Row ch={[<F key="a" l="Google편도" ch={<TI v="12.5" dis={true}/>}/>,<F key="b" l="Google왕복" ch={<TI v="25.0" dis={true}/>}/>]}/>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
    <div><div style={{fontSize:"11px",fontWeight:600,color:D.sub,marginBottom:"4px"}}>📷 출발미터기</div><FU l="사진" a="JPG"/><F l="km" h="OCR/수동" ch={<TI t="number" p="15230"/>}/></div>
    <div><div style={{fontSize:"11px",fontWeight:600,color:D.sub,marginBottom:"4px"}}>📷 복귀미터기</div><FU l="사진" a="JPG"/><F l="km" h="OCR/수동" ch={<TI t="number" p="15257"/>}/></div>
  </div>
  <Row ch={[<F key="a" l="복귀일시" ch={<TI t="datetime-local"/>}/>]}/>
  <div style={{padding:"8px",borderRadius:"6px",background:D.primaryDim,fontSize:"11px",marginTop:"6px"}}><span style={{color:D.accent}}>실제 27km</span> | Google 25km | <span style={{color:D.success}}>차이 +2km</span></div>
  <ST t="교통비" i="🧾"/>
  <Row ch={[<F key="a" l="교통비(VND)" ch={<TI t="number"/>}/>]}/>
  <FU l="영수증" a="JPG, PDF"/>
  <Btns s="출동 등록"/>
</div>}/>);}

// ═══ 10. SALES (회사제거, 영업담당추가, 사용기간optional, 복수세트+엑셀) ═══
function P10(){return(<Card title="매출전표 입력" sub="Sales Entry" ch={<div>
  <ST t="전표" i="📋"/>
  <Row ch={[<F key="a" l="전표번호" r={true} h="자동생성" ch={<TI v="2026/04/21-01" dis={true}/>}/>,<F key="b" l="전표일자" r={true} ch={<TI t="date"/>}/>,<F key="c" l="거래처" r={true} ch={<TI p="🔍 검색"/>}/>]}/>
  <Row ch={[<F key="a" l="부서" r={true} ch={<SI ops={depts}/>}/>,<F key="b" l="매출유형" r={true} ch={<SI ops={[{v:"IT0003",l:"IT Rental(R)"},{v:"IT0001",l:"IT Buy&sell"},{v:"TM_R",l:"T&M Rental(R)"},{v:"TM_C",l:"T&M Calibration(C)"},{v:"TM_F",l:"T&M Repair(F)"}]}/>}/>,<F key="c" l="영업담당" r={true} ch={<SI ops={sales}/>}/>]}/>
  <Row ch={[<F key="a" l="사용시작일" ch={<TI t="date"/>}/>,<F key="b" l="사용종료일" ch={<TI t="date"/>}/>]}/>
  <ST t="품목 (수백 개 추가 가능)" i="📦"/>
  <div style={{padding:"10px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border,marginBottom:"6px"}}>
    <Row ch={[<F key="a" l="품목" r={true} ch={<TI p="🔍 검색"/>} w="170px"/>,<F key="b" l="수량" r={true} ch={<TI t="number" p="1"/>} w="70px"/>,<F key="c" l="단가" ch={<TI t="number"/>} w="120px"/>,<F key="d" l="금액" h="자동" ch={<TI dis={true}/>} w="120px"/>]}/>
    <SNCheck strict={false}/>
  </div>
  <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}><AddMore/><ExcelUpload/></div>
  <ST t="합계" i="💰"/>
  <Row ch={[<F key="a" l="공급가액" ch={<TI dis={true} v="자동"/>}/>,<F key="b" l="VAT" ch={<TI t="number" p="자동(10%)"/>}/>,<F key="c" l="합계" ch={<TI dis={true}/>}/>]}/>
  <Row ch={[<F key="a" l="창고" ch={<SI ops={[{v:"ITMAIN",l:"IT MAIN"},{v:"BNIT",l:"BN IT"},{v:"HNIT",l:"HN IT"}]}/>}/>,<F key="b" l="회계반영" ch={<label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"13px",color:D.text,marginTop:"4px"}}><input type="checkbox"/> 반영</label>}/>]}/>
  <Row ch={[<F key="a" l="비고" ch={<TA p="메모"/>}/>]}/>
  <Note t="💡 저장 시 청구서PDF 자동생성 + 미수금 자동생성"/>
  <Btns s="매출전표 저장"/>
</div>}/>);}

// ═══ 11. PURCHASE (회사제거, 영업담당추가, 사용기간optional, 복수세트+엑셀) ═══
function P11(){return(<Card title="매입전표 입력" sub="Purchase Entry" ch={<div>
  <ST t="전표" i="📋"/>
  <Row ch={[<F key="a" l="전표번호" r={true} h="자동생성" ch={<TI v="04/21-1" dis={true}/>}/>,<F key="b" l="전표일자" r={true} ch={<TI t="date"/>}/>,<F key="c" l="공급사" r={true} ch={<TI p="🔍 검색"/>}/>]}/>
  <Row ch={[<F key="a" l="입고창고" r={true} ch={<SI ops={[{v:"ITMAIN",l:"IT MAIN"},{v:"TMBN",l:"TM_service"},{v:"BNIT",l:"BN IT"}]}/>}/>,<F key="b" l="영업담당" r={true} ch={<SI ops={sales}/>}/>]}/>
  <Row ch={[<F key="a" l="사용시작일" ch={<TI t="date"/>}/>,<F key="b" l="사용종료일" ch={<TI t="date"/>}/>]}/>
  <ST t="품목 (수백 개 추가 가능)" i="📦"/>
  <div style={{padding:"10px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border,marginBottom:"6px"}}>
    <Row ch={[<F key="a" l="품목" r={true} ch={<TI p="🔍 검색"/>} w="170px"/>,<F key="b" l="수량" r={true} ch={<TI t="number"/>} w="70px"/>,<F key="c" l="단가" ch={<TI t="number"/>} w="120px"/>,<F key="d" l="금액" h="자동" ch={<TI dis={true}/>} w="120px"/>]}/>
    <SNCheck strict={false}/>
  </div>
  <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}><AddMore/><ExcelUpload/></div>
  <Row ch={[<F key="a" l="합계" ch={<TI dis={true} v="자동"/>}/>,<F key="b" l="회계반영" ch={<label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"13px",color:D.text,marginTop:"4px"}}><input type="checkbox"/> 반영</label>}/>]}/>
  <Row ch={[<F key="a" l="비고" ch={<TA p="PO번호 등"/>}/>]}/>
  <Note t="💡 매입확정 시 재고 자동반영 + 미지급금 자동생성"/>
  <Btns s="매입전표 저장"/>
</div>}/>);}

// ═══ 12. INCIDENT (코드 자동생성) ═══
function P12(){return(<Card title="사건기반 수시평가" sub="Incident Evaluation" ch={<div>
  <ST t="기본" i="📝"/>
  <Row ch={[<F key="a" l="평가코드" r={true} h="자동생성" ch={<TI v="INC-20260421-001" dis={true}/>}/>,<F key="b" l="작성자" r={true} h="자동" ch={<TI v="Trần Huy Lộc" dis={true}/>}/>,<F key="c" l="대상자" r={true} ch={<SI ops={[{v:"khang",l:"Phạm Đức Khang"},{v:"linh",l:"Nguyễn Văn Linh"},{v:"thiet",l:"Trương Viết Thiết"}]} p="선택"/>}/>]}/>
  <Row ch={[<F key="a" l="사건발생일" r={true} ch={<TI t="date"/>}/>,<F key="b" l="유형" r={true} ch={<div style={{display:"flex",gap:"8px",marginTop:"4px"}}><button style={{flex:1,padding:"8px",borderRadius:"6px",border:"2px solid "+D.success,background:D.successDim,color:D.success,fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:FONT}}>👏 칭찬</button><button style={{flex:1,padding:"8px",borderRadius:"6px",border:"1px solid "+D.border,background:"transparent",color:D.sub,fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:FONT}}>⚠ 개선</button></div>}/>]}/>
  <Row ch={[<F key="a" l="사건설명" r={true} h="50자이상, 자동번역" ch={<TA p="구체적 사건 서술" rows={4}/>}/>]}/>
  <FU l="증빙 첨부" a="JPG, PNG, PDF"/>
  <Row ch={[<F key="a" l="공개범위" r={true} ch={<SI ops={[{v:"manager_only",l:"🔒 상위평가자만"},{v:"all",l:"👥 전체"}]} v="manager_only"/>}/>]}/>
  <Btns s="저장"/>
</div>}/>);}

// ═══ 13. REGULAR EVAL (코드 자동생성) ═══
function P13(){
  var qs=["업무 이해도와 전문성","팀 협업 및 커뮤니케이션","문제 해결 능력","업무 책임감","고객 응대 품질"];
  var sc=[{v:"10",l:"매우 잘함(10)"},{v:"8",l:"잘함(8)"},{v:"6",l:"보통(6)"},{v:"4",l:"노력요함(4)"},{v:"2",l:"많은노력(2)"}];
  return(<Card title="정기 인사평가" sub="Regular HR Evaluation" ch={<div>
    <ST t="평가 기본" i="📊"/>
    <Row ch={[<F key="a" l="평가코드" r={true} h="자동생성" ch={<TI v="EVAL-20260421-001" dis={true}/>}/>,<F key="b" l="평가일자" r={true} ch={<TI t="date"/>}/>,<F key="c" l="마감일자" r={true} ch={<TI t="date"/>}/>]}/>
    <Row ch={[<F key="a" l="평가자" r={true} ch={<SI ops={[{v:"hung",l:"Nguyễn Văn Hùng(Mgr)"},{v:"binh",l:"Ms. Bình"}]} p="선택"/>}/>,<F key="b" l="피평가자" r={true} ch={<SI ops={[{v:"khang",l:"Phạm Đức Khang"},{v:"linh",l:"Nguyễn Văn Linh"}]} p="선택"/>}/>]}/>
    <ST t="평가 항목 (질문 사전등록 가능)" i="📝"/>
    {qs.map(function(q,i){return(<div key={i} style={{padding:"10px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border,marginBottom:"6px"}}><div style={{fontSize:"12px",fontWeight:600,color:D.text,marginBottom:"6px"}}><span style={{color:D.accent}}>Q{i+1}.</span> {q}</div><div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>{sc.map(function(s){return <button key={s.v} style={{padding:"5px 10px",borderRadius:"4px",fontSize:"10px",fontWeight:600,cursor:"pointer",fontFamily:FONT,border:"1px solid "+D.border,background:"transparent",color:D.sub}}>{s.l}</button>})}</div></div>)})}
    <AddMore label="+ 질문 추가"/>
    <ST t="점수" i="🏆"/>
    <div style={{padding:"10px",borderRadius:"6px",background:D.primaryDim,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:"12px",color:D.sub}}>5개 질문 → 100점 환산</span><span style={{fontSize:"24px",fontWeight:800,color:D.primary}}>76</span></div>
    <ST t="AI 종합" i="🤖"/>
    <div style={{padding:"10px",borderRadius:"6px",background:D.purpleDim,fontSize:"11px",color:D.sub}}>
      <b style={{color:D.purple}}>AI 분석:</b> ①사건평가(편향성분석) ②정기평가(점수패턴) ③ERP데이터 → <span style={{fontSize:"16px",fontWeight:800,color:D.success}}>79.2</span>/100
    </div>
    <ST t="관리자 최종" i="👨‍💼"/>
    <Row ch={[<F key="a" l="최종점수" r={true} ch={<TI t="number" p="79"/>}/>,<F key="b" l="조정사유" r={true} ch={<TA p="조정 이유" rows={2}/>}/>]}/>
    <Btns s="평가 제출"/>
  </div>}/>);
}

// ═══ 14. ONBOARDING (코드 자동생성) ═══
function P14(){return(<Card title="입사카드" sub="Onboarding Card" ch={<div>
  <Row ch={[<F key="a" l="입사카드코드" r={true} h="자동생성" ch={<TI v="ONB-20260421-001" dis={true}/>}/>,<F key="b" l="직원" r={true} ch={<SI ops={[{v:"new",l:"🔍 검색"}]} p="선택"/>}/>]}/>
  <ST t="학력/경력" i="🎓"/>
  <Row ch={[<F key="a" l="최종학력" ch={<TI/>}/>,<F key="b" l="전공" ch={<TI/>}/>,<F key="c" l="이전직장" ch={<TI/>}/>]}/>
  <ST t="동의서 (전자서명)" i="✍️"/>
  {["근로계약서","비밀유지서약서","개인정보동의서"].map(function(n){return(<div key={n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border,marginBottom:"4px"}}><span style={{fontSize:"13px"}}>{n}</span><button style={{padding:"4px 10px",borderRadius:"4px",background:D.primary,color:"#fff",border:"none",fontSize:"11px",cursor:"pointer"}}>서명</button></div>)})}
  <FU l="증명사진" a="JPG, PNG"/>
  <Note t="💡 서명 완료 시 PDF 자동생성"/>
  <Btns s="입사카드 완료"/>
</div>}/>);}

// ═══ 15. OFFBOARDING (코드 자동생성) ═══
function P15(){return(<Card title="퇴사카드" sub="Offboarding Card" ch={<div>
  <Row ch={[<F key="a" l="퇴사카드코드" r={true} h="자동생성" ch={<TI v="OFF-20260421-001" dis={true}/>}/>,<F key="b" l="직원" r={true} ch={<SI ops={[{v:"emp",l:"🔍 검색"}]}/>}/>,<F key="c" l="퇴사일" r={true} ch={<TI t="date"/>}/>]}/>
  <ST t="반납 (인사+퇴사자)" i="📦"/>
  {["노트북/PC","회사차량/열쇠","사무실카드","핸드폰","기타장비"].map(function(i){return <label key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"4px 12px",fontSize:"13px",color:D.text}}><input type="checkbox"/>{i}</label>})}
  <ST t="지급 (회계팀)" i="💰"/>
  <Row ch={[<F key="a" l="미지급급여" ch={<TI t="number" p="0"/>}/>,<F key="b" l="퇴직금" ch={<TI t="number" p="0"/>}/>,<F key="c" l="연차수당" ch={<TI t="number" p="0"/>}/>]}/>
  <ST t="중지 (인사+IT)" i="🔒"/>
  {["ERP계정 비활성화","보험 정지","접근권한 해제"].map(function(i){return <label key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"4px 12px",fontSize:"13px",color:D.text}}><input type="checkbox"/>{i}</label>})}
  <ST t="발급 서류" i="📄"/>
  {["경력증명서","퇴직증명서","원천징수영수증"].map(function(i){return <label key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"4px 12px",fontSize:"13px",color:D.text}}><input type="checkbox"/>{i} 발급</label>})}
  <ST t="동의서" i="✍️"/>
  <div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border}}><span style={{fontSize:"13px"}}>퇴직합의서+비밀유지</span><button style={{padding:"4px 12px",borderRadius:"4px",background:D.primary,color:"#fff",border:"none",fontSize:"11px",cursor:"pointer"}}>서명</button></div>
  <Note t="💡 완료 시 PDF 자동생성"/>
  <Btns s="퇴사카드 완료"/>
</div>}/>);}

// ═══ 16. LEAVE (코드 자동생성) ═══
function P16(){return(<Card title="연차/휴가 신청" sub="Leave Request" ch={<div>
  <Row ch={[<F key="a" l="신청코드" r={true} h="자동생성" ch={<TI v="LV-20260421-001" dis={true}/>}/>,<F key="b" l="직원" h="자동" ch={<TI v="Phạm Đức Khang" dis={true}/>}/>,<F key="c" l="잔여연차" ch={<TI v="8.5일" dis={true}/>}/>]}/>
  <Row ch={[<F key="a" l="휴가유형" r={true} ch={<SI ops={[{v:"P",l:"P-연차"},{v:"LT",l:"LT-공휴"},{v:"KSX",l:"KSX-특별"},{v:"KL",l:"KL-무급"},{v:"X",l:"X-결근"}]}/>}/>,<F key="b" l="휴가일" r={true} ch={<TI t="date"/>}/>,<F key="c" l="일수" r={true} ch={<SI ops={[{v:"0.5",l:"0.5일(반차)"},{v:"1",l:"1일"}]}/>}/>]}/>
  <Row ch={[<F key="a" l="사유" ch={<TA p="사유"/>}/>,<F key="b" l="승인자" r={true} ch={<SI ops={[{v:"hung",l:"Nguyễn Văn Hùng"}]}/>}/>]}/>
  <Btns s="휴가 신청"/>
</div>}/>);}

// ═══ 17. EXPENSE (회사제거, 코드자동) ═══
function P17(){return(<Card title="비용 등록" sub="Expense" ch={<div>
  <ST t="비용" i="💳"/>
  <Row ch={[<F key="a" l="비용코드" r={true} h="자동생성" ch={<TI v="EXP-20260421-001" dis={true}/>}/>,<F key="b" l="비용구분" r={true} ch={<SI ops={[{v:"purchase_related",l:"매입관련"},{v:"sales_related",l:"매출관련"},{v:"general",l:"일반"}]}/>}/>,<F key="c" l="비용항목" r={true} ch={<TI p="운송비, 통관비 등"/>}/>]}/>
  <Row ch={[<F key="a" l="관련 매입번호" ch={<TI p="04/08-1"/>}/>,<F key="b" l="관련 매출번호" ch={<TI p="2026/04/15-10"/>}/>]}/>
  <Row ch={[<F key="a" l="금액(VND)" r={true} ch={<TI t="number"/>}/>,<F key="b" l="지급예정일" r={true} ch={<TI t="date"/>}/>,<F key="c" l="지급일" ch={<TI t="date"/>}/>]}/>
  <Row ch={[<F key="a" l="담당자" r={true} ch={<SI ops={sales}/>}/>,<F key="b" l="부서" r={true} ch={<SI ops={depts}/>}/>]}/>
  <ST t="원가 배분" i="📊"/>
  <div style={{padding:"8px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border}}>
    <label style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"13px",color:D.text}}><input type="checkbox"/> 품목별 원가 배분</label>
    <div style={{display:"flex",gap:"12px",marginTop:"4px"}}><label style={{fontSize:"12px",color:D.sub}}><input type="radio" name="al"/> 수량기준</label><label style={{fontSize:"12px",color:D.sub}}><input type="radio" name="al"/> 금액기준</label></div>
  </div>
  <Btns s="비용 등록"/>
</div>}/>);}

// ═══ 18. AP/AR (자동생성 목록 → 선택 → 업데이트) ═══
function P18(){return(<Card title="미지급/미수금 관리" sub="Payables & Receivables" ch={<div>
  <ST t="자동생성 목록에서 선택" i="📋"/>
  <div style={{fontSize:"11px",color:D.sub,marginBottom:"8px"}}>매출/매입/비용 저장 시 자동생성됨. 건을 선택하세요.</div>
  <div style={{padding:"8px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border,marginBottom:"8px"}}>
    {[{no:"AR-0427",t:"미수금",cl:"YEJIN F&G",am:"8,567,964",due:"2026-05-14",st:"대기"},
      {no:"AP-0408",t:"미지급",cl:"SAMSUNGNEO",am:"604,517,446",due:"2026-05-08",st:"대기"},
      {no:"AP-0331",t:"미지급",cl:"Tellustech KR",am:"212,861,250",due:"2026-04-30",st:"지연"}
    ].map(function(r){return(<div key={r.no} style={{display:"flex",gap:"8px",fontSize:"11px",padding:"6px 8px",borderBottom:"1px solid "+D.border,cursor:"pointer",alignItems:"center"}} onMouseEnter={function(e){e.currentTarget.style.background=D.cardHover}} onMouseLeave={function(e){e.currentTarget.style.background="transparent"}}><span style={{fontFamily:"monospace",color:D.accent,fontWeight:700,flex:"0 0 60px"}}>{r.no}</span><Badge t={r.t} c={r.t==="미수금"?D.success:D.warn} bg={r.t==="미수금"?D.successDim:D.warnDim}/><span style={{flex:1,fontWeight:600}}>{r.cl}</span><span style={{fontWeight:700}}>{r.am}₫</span><span>{r.due}</span><Badge t={r.st} c={r.st==="지연"?D.danger:D.sub} bg={r.st==="지연"?D.dangerDim:D.border}/></div>)})}
  </div>
  <ST t="선택 건 (자동채워짐)" i="📌"/>
  <Row ch={[<F key="a" l="번호" ch={<TI v="AR-0427" dis={true}/>}/>,<F key="b" l="구분" ch={<TI v="미수금(매출)" dis={true}/>}/>,<F key="c" l="거래처" ch={<TI v="YEJIN F&G" dis={true}/>}/>]}/>
  <Row ch={[<F key="a" l="관련전표" ch={<TI v="2026/04/14-27" dis={true}/>}/>,<F key="b" l="금액" ch={<TI v="8,567,964" dis={true}/>}/>,<F key="c" l="예정일" ch={<TI v="2026-05-14" dis={true}/>}/>]}/>
  <ST t="입금/지급 확인 (여기만 입력)" i="✅"/>
  <Row ch={[<F key="a" l="확인일" ch={<TI t="date"/>}/>,<F key="b" l="지연일" h="자동" ch={<TI dis={true} v="자동"/>}/>]}/>
  <ST t="지연사유 이력" i="📝"/>
  <div style={{padding:"8px",borderRadius:"6px",background:D.bg,border:"1px solid "+D.border}}>
    <Row ch={[<F key="a" l="일자" ch={<TI t="date"/>} w="130px"/>,<F key="b" l="사유" ch={<TA p="자유기입(자동번역)" rows={2}/>}/>]}/>
    <AddMore label="+ 사유 추가"/>
  </div>
  <Note t="💡 확인 시 '완료' 처리. 미수금은 거래처 BLOCKING 연동."/>
  <Btns s="업데이트"/>
</div>}/>);}

// ═══ 19. SCHEDULE (코드 자동생성) ═══
function P19(){return(<Card title="일정(마감) 등록" sub="Schedule/Deadline" ch={<div>
  <Row ch={[<F key="a" l="일정코드" r={true} h="자동생성" ch={<TI v="SCH-20260421-001" dis={true}/>}/>,<F key="b" l="일정명" r={true} ch={<TI p="월말 재고 마감"/>}/>,<F key="c" l="반복주기" r={true} ch={<SI ops={[{v:"daily",l:"매일"},{v:"weekly",l:"매주"},{v:"monthly",l:"매월"},{v:"yearly",l:"매년"},{v:"once",l:"1회"}]}/>}/>]}/>
  <Row ch={[<F key="a" l="매월 마감일" ch={<TI t="number" p="25"/>}/>,<F key="b" l="마감시간" ch={<TI t="time"/>}/>]}/>
  <ST t="알림" i="🔔"/>
  <Row ch={[<F key="a" l="사전알림(일)" ch={<TI t="number" p="3"/>}/>,<F key="b" l="사전알림(시간)" ch={<TI t="number" p="0"/>}/>]}/>
  <ST t="대상" i="👥"/>
  <Row ch={[<F key="a" l="대상직원" r={true} ch={<TI p="🔍 검색 후 추가"/>}/>,<F key="b" l="보고대상(CFM수신)" r={true} ch={<TI p="🔍 관리자"/>}/>,<F key="c" l="연관모듈" ch={<SI ops={[{v:"inventory",l:"재고"},{v:"sales",l:"매출"},{v:"purchase",l:"매입"},{v:"calibration",l:"교정"},{v:"as",l:"AS"},{v:"hr",l:"인사"},{v:"finance",l:"재경"}]}/>}/>]}/>
  <Note t="💡 대상직원→모듈→CFM클릭→보고자알림"/>
  <Btns s="일정 등록"/>
</div>}/>);}

// ═══ 20. LICENSE (코드 자동생성) ═══
function P20(){return(<Card title="라이선스 등록" sub="License Management" ch={<div>
  <Row ch={[<F key="a" l="등록코드" r={true} h="자동생성" ch={<TI v="LIC-20260421-001" dis={true}/>}/>,<F key="b" l="라이선스명" r={true} ch={<TI p="MS Office, ISO 등"/>}/>,<F key="c" l="유형" ch={<SI ops={[{v:"software",l:"소프트웨어"},{v:"cert",l:"인증"},{v:"permit",l:"허가증"},{v:"other",l:"기타"}]}/>}/>]}/>
  <Row ch={[<F key="a" l="취득일" r={true} ch={<TI t="date"/>}/>,<F key="b" l="만료예정일" r={true} ch={<TI t="date"/>}/>,<F key="c" l="사전알림(일)" ch={<TI t="number" p="30"/>}/>]}/>
  <Row ch={[<F key="a" l="담당자" ch={<SI ops={sales}/>}/>,<F key="b" l="갱신비용(VND)" ch={<TI t="number"/>}/>]}/>
  <FU l="라이선스 증서 첨부" a="PDF"/>
  <Note t="💡 갱신 완료 시 차기 일정 자동생성"/>
  <Btns s="라이선스 등록"/>
</div>}/>);}

// ═══ MAIN ═══
export default function App(){
  var [s,setS] = useState("login");
  var screens = [
    {k:"login",l:"로그인",g:"시스템"},
    {k:"client",l:"거래처",g:"기초등록"},{k:"item",l:"품목",g:"기초등록"},{k:"emp",l:"직원",g:"기초등록"},{k:"schedule",l:"일정/마감",g:"기초등록"},{k:"license",l:"라이선스",g:"기초등록"},
    {k:"contract",l:"IT계약",g:"렌탈"},{k:"tm",l:"TM렌탈",g:"렌탈"},{k:"billing",l:"IT월별컨펌",g:"렌탈"},
    {k:"cal",l:"교정이행",g:"교정"},
    {k:"as",l:"AS접수",g:"AS"},{k:"dispatch",l:"출동",g:"AS"},
    {k:"sales",l:"매출입력",g:"매출매입"},{k:"purchase",l:"매입입력",g:"매출매입"},
    {k:"incident",l:"사건평가",g:"인사"},{k:"regular",l:"정기평가",g:"인사"},{k:"onboard",l:"입사카드",g:"인사"},{k:"offboard",l:"퇴사카드",g:"인사"},{k:"leave",l:"연차신청",g:"인사"},
    {k:"expense",l:"비용등록",g:"재경"},{k:"apar",l:"미수미지급",g:"재경"},
  ];
  var groups = {};
  screens.forEach(function(sc){if(!groups[sc.g]) groups[sc.g]=[];groups[sc.g].push(sc);});

  return(<div style={{minHeight:"100vh",background:D.bg,fontFamily:FONT,color:D.text}}>
    <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet"/>
    <div style={{background:"#0D0D10",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid "+D.border}}>
      <div><div style={{fontSize:"10px",color:D.muted,letterSpacing:"0.1em",fontWeight:600}}>TELLUSTECH ERP</div><div style={{fontSize:"16px",fontWeight:800}}>입력 화면 (21개)</div></div>
      <Badge t="v2 Input Forms" c={D.accent} bg={D.accentDim}/>
    </div>
    <div style={{maxWidth:"900px",margin:"0 auto",padding:"16px"}}>
      <div style={{marginBottom:"16px"}}>{Object.keys(groups).map(function(gn){return(<div key={gn} style={{marginBottom:"4px"}}><span style={{fontSize:"10px",color:D.muted,fontWeight:700,marginRight:"4px"}}>{gn}</span>{groups[gn].map(function(sc){return <button key={sc.k} onClick={function(){setS(sc.k)}} style={{padding:"4px 9px",borderRadius:"4px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:600,fontFamily:FONT,background:s===sc.k?D.primary:"transparent",color:s===sc.k?"#fff":D.sub,marginRight:"2px"}}>{sc.l}</button>})}</div>)})}</div>
      {s==="login"&&<P0/>}{s==="client"&&<P1/>}{s==="item"&&<P2/>}{s==="emp"&&<P3/>}{s==="contract"&&<P4/>}{s==="tm"&&<P5/>}{s==="billing"&&<P6/>}{s==="cal"&&<P7/>}{s==="as"&&<P8/>}{s==="dispatch"&&<P9/>}{s==="sales"&&<P10/>}{s==="purchase"&&<P11/>}{s==="incident"&&<P12/>}{s==="regular"&&<P13/>}{s==="onboard"&&<P14/>}{s==="offboard"&&<P15/>}{s==="leave"&&<P16/>}{s==="expense"&&<P17/>}{s==="apar"&&<P18/>}{s==="schedule"&&<P19/>}{s==="license"&&<P20/>}
    </div>
  </div>);
}
