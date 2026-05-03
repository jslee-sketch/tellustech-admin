const BASE = "https://tellustech-admin-production.up.railway.app";
const lr = await fetch(BASE+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyCode:"TV",username:"admin",password:"admin123",language:"KO"})});
const C = lr.headers.get("set-cookie").match(/(tts_session=[^;]+)/)[1];
const get = async (p) => { const r = await fetch(BASE+p,{headers:{Cookie:C}}); return await r.json(); };
const [inv,inc,sales,purs,exp,as,disp,cl,emp] = await Promise.all([
  get("/api/inventory/transactions?limit=500"),
  get("/api/hr/incidents"),
  get("/api/sales"),
  get("/api/purchases"),
  get("/api/finance/expenses"),
  get("/api/as-tickets"),
  get("/api/as-dispatches"),
  get("/api/master/clients"),
  get("/api/master/employees"),
]);
const tx = inv.transactions || [];
const cons = tx.filter(t=>t.reason==="CONSUMABLE_OUT");
const consM = cons.filter(c=>c.targetEquipmentSN);
const incs = inc.incidents || [];
const trans3 = incs.filter(i=>i.contentVi&&i.contentEn&&i.contentKo);
console.log("[데이터 현황]");
console.log(`  거래처: ${(cl.clients||cl||[]).length}`);
console.log(`  직원:   ${(emp.employees||emp||[]).length}`);
console.log(`  재고 트랜잭션: ${tx.length} (PURCHASE ${tx.filter(t=>t.reason==="PURCHASE").length} / SALE ${tx.filter(t=>t.reason==="SALE").length} / CONSUMABLE_OUT ${cons.length})`);
console.log(`    └─ 소모품출고 중 targetEquipmentSN 매핑됨: ${consM.length}/${cons.length}`);
console.log(`  매출:   ${(sales.sales||[]).length}`);
console.log(`  매입:   ${(purs.purchases||[]).length}`);
console.log(`  비용:   ${(exp.expenses||exp||[]).length}`);
console.log(`  AS티켓: ${(as.tickets||[]).length} / 출동: ${(disp.dispatches||[]).length}`);
console.log(`  사건평가: ${incs.length} (3언어 모두 채워진 것: ${trans3.length})`);
const distMatched = (disp.dispatches||[]).filter(d=>d.distanceMatch===true).length;
const distNull = (disp.dispatches||[]).filter(d=>d.distanceMatch===null).length;
console.log(`    └─ distanceMatch=true: ${distMatched} / null(미계산): ${distNull}`);
