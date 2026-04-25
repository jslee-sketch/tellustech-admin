const BASE = "https://tellustech-admin-production.up.railway.app";
const lr = await fetch(BASE+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyCode:"TV",username:"admin",password:"admin123",language:"KO"})});
const C = lr.headers.get("set-cookie").match(/(tts_session=[^;]+)/)[1];
const req = async (m,p,b)=>{const r=await fetch(BASE+p,{method:m,headers:{Cookie:C,"Content-Type":"application/json"},body:b?JSON.stringify(b):undefined});const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{}return{status:r.status,data:d};};

const log = (label, ok, detail="") => console.log(`  ${ok?"✓":"✗"} ${label}${detail?" — "+detail:""}`);

console.log("\n━━━ ① 부품 DELETE → 재고 복원 ━━━");
{
  // 준비: ITM-015 Fuser, ITMAIN, 활성 IT 계약 1개 사용
  const items = (await req("GET","/api/master/items?q=Fuser")).data.items;
  const fuser = items[0];
  const whs = (await req("GET","/api/master/warehouses")).data.warehouses;
  const itmain = whs.find(w=>w.code==="ITMAIN");
  const dispatches = (await req("GET","/api/as-dispatches")).data.dispatches;
  const disp = dispatches[0];

  const sn = "DEL-TEST-"+Date.now();
  // (1) IN 1건
  await req("POST","/api/inventory/transactions",{itemId:fuser.id,toWarehouseId:itmain.id,txnType:"IN",reason:"PURCHASE",serialNumber:sn,quantity:1});

  // (2) 현재 재고 확인 (Fuser/ITMAIN onHand)
  const stockBefore = (await req("GET",`/api/inventory/stock?item=${fuser.id}&warehouse=${itmain.id}`)).data.stock?.[0];
  const onHandBefore = stockBefore?.onHand ?? 0;

  // (3) 부품 추가
  const partRes = await req("POST",`/api/as-dispatches/${disp.id}/parts`,{
    itemId:fuser.id, serialNumber:sn, quantity:1,
    targetEquipmentSN:"E2E-SN-1777080708605",
    fromWarehouseId:itmain.id, note:"DELETE 테스트"
  });
  const partId = partRes.data.part.id;
  const txnId = partRes.data.part.inventoryTxnId;
  log("부품 추가 후 inventoryTxnId 연결", !!txnId, txnId?.slice(0,12));

  // (4) 재고 -1 확인
  const stockAfterAdd = (await req("GET",`/api/inventory/stock?item=${fuser.id}&warehouse=${itmain.id}`)).data.stock?.[0];
  log(`부품 추가 후 재고 ${onHandBefore} → ${stockAfterAdd?.onHand}`, stockAfterAdd?.onHand === onHandBefore - 1);

  // (5) DELETE
  const delRes = await req("DELETE",`/api/as-dispatches/${disp.id}/parts/${partId}`);
  log("DELETE status 200", delRes.status === 200);

  // (6) 재고 복원 확인
  const stockAfterDel = (await req("GET",`/api/inventory/stock?item=${fuser.id}&warehouse=${itmain.id}`)).data.stock?.[0];
  log(`DELETE 후 재고 ${stockAfterAdd?.onHand} → ${stockAfterDel?.onHand} (${onHandBefore} 기대)`, stockAfterDel?.onHand === onHandBefore);

  // (7) InventoryTransaction이 정말 삭제됐는지
  const txnList = (await req("GET","/api/inventory/transactions?limit=500")).data.transactions;
  const stillExists = txnList.some(t => t.id === txnId);
  log("연결된 InventoryTransaction 삭제됨", !stillExists);
}

console.log("\n━━━ ② 재고 부족 시 부품 추가 차단 ━━━");
{
  const items = (await req("GET","/api/master/items?q=Fuser")).data.items;
  const fuser = items[0];
  const whs = (await req("GET","/api/master/warehouses")).data.warehouses;
  const bnit = whs.find(w=>w.code==="BNIT") || whs.find(w=>w.code==="HNIT") || whs[1];
  const dispatches = (await req("GET","/api/as-dispatches")).data.dispatches;
  const disp = dispatches[0];

  // bnit 창고는 비어 있을 것 (Fuser 0)
  const stockBnit = (await req("GET",`/api/inventory/stock?item=${fuser.id}&warehouse=${bnit.id}`)).data.stock?.[0];
  console.log(`  ${bnit.code} Fuser 재고: ${stockBnit?.onHand ?? 0}`);

  // 재고 0인 창고에서 1개 출고 시도
  const tryRes = await req("POST",`/api/as-dispatches/${disp.id}/parts`,{
    itemId:fuser.id, quantity:1, targetEquipmentSN:"E2E-SN-1777080708605",
    fromWarehouseId:bnit.id, note:"재고부족 테스트"
  });
  log(`재고 0창고에서 추가 시도 차단 (status ${tryRes.status})`, tryRes.status === 400);
  log(`error=insufficient_stock`, tryRes.data?.error === "insufficient_stock", JSON.stringify(tryRes.data?.details||{}));
}

console.log("\n━━━ ③ 매입가 표시 (PurchaseItem 있을 때) ━━━");
{
  const dispatches = (await req("GET","/api/as-dispatches")).data.dispatches;
  const disp = dispatches[0];
  const itContracts = (await req("GET","/api/rental/it-contracts")).data.contracts;
  const tls = itContracts[0];
  // 해당 계약 장비 S/N
  const detail = (await req("GET",`/api/rental/it-contracts/${tls.id}`)).data.contract;
  const eqSN = detail.equipment[0]?.serialNumber;
  if (!eqSN) { console.log("  장비 없음 — skip"); }
  else {
    // 그 S/N의 PurchaseItem이 있는지
    const cost = (await req("GET",`/api/rental/it-contracts/${tls.id}/equipment-cost`)).data;
    const me = cost.equipment.find(e=>e.serialNumber===eqSN);
    console.log(`  S/N ${eqSN}: 매입가 ${me?.purchaseCost.toLocaleString()}, 부품비 ${me?.partsCost.toLocaleString()}, 소모품비 ${me?.consumablesCost.toLocaleString()}, 교통비 ${me?.transportCost.toLocaleString()}, 합계 ${me?.totalCost.toLocaleString()}`);

    if ((me?.purchaseCost ?? 0) === 0) {
      console.log("  → PurchaseItem 매입 기록 없음. 추가 후 재계산 검증 시도...");
      const items = (await req("GET","/api/master/items")).data.items;
      const item = items[0]; // 아무 품목
      const sales = (await req("GET","/api/sales")).data.sales;
      const welstory = (await req("GET","/api/master/clients")).data;
      const projects = (await req("GET","/api/master/projects")).data;
      const trade = projects.projects.find(p=>p.salesType==="TRADE");
      const tv = welstory.clients.find(c=>c.companyNameVi==="WELSTORY") || welstory.clients[0];
      const whs = (await req("GET","/api/master/warehouses")).data.warehouses;
      const itmain = whs.find(w=>w.code==="ITMAIN");
      // 매입 1건 — 그 장비 S/N으로 unitPrice 30,000,000
      const purRes = await req("POST","/api/purchases",{
        supplierId: tv.id, projectId: trade.id, warehouseId: itmain.id,
        items: [{ itemId: detail.equipment[0].itemId, quantity: 1, unitPrice: 30000000, serialNumber: eqSN }],
      });
      log("매입 1건 생성", purRes.status === 201, purRes.data?.purchase?.purchaseNumber);

      // 다시 누적비용 조회
      const cost2 = (await req("GET",`/api/rental/it-contracts/${tls.id}/equipment-cost`)).data;
      const me2 = cost2.equipment.find(e=>e.serialNumber===eqSN);
      log(`매입가 표시: ${me2?.purchaseCost.toLocaleString()} (30,000,000 기대)`, me2?.purchaseCost === 30000000);
    } else {
      log(`매입가 이미 있음: ${me.purchaseCost}`, true);
    }
  }
}

console.log("\n━━━ ④ 상태 변경 → Remark 자동생성 + Claude 번역 ━━━");
{
  const items = (await req("GET","/api/inventory/items")).data.items;
  const target = items.find(i=>i.status==="NORMAL");
  if (!target) { console.log("  NORMAL 상태 InventoryItem 없음"); }
  else {
    console.log(`  대상: ${target.serialNumber} (현재 ${target.status})`);
    // (a) 상태 변경 + 비고 입력
    const ko = "카트리지 누출 발견. 교체 부품 주문 필요.";
    const r = await req("PATCH",`/api/inventory/items/${target.id}/status`,{
      status:"NEEDS_REPAIR", remarkContent: ko, remarkLang:"KO"
    });
    log("상태변경 status 200", r.status === 200);
    log("status: NORMAL → NEEDS_REPAIR", r.data?.item?.status === "NEEDS_REPAIR");

    // (b) Remark가 자동 생성됐고 3언어 번역됐는지
    const remarks = (await req("GET",`/api/inventory/items/${target.id}/remarks`)).data.remarks;
    const last = remarks[0];
    log(`Remark 1건 생성됨 (총 ${remarks.length})`, remarks.length >= 1);
    log(`KO 원문 정확: ${last?.contentKo?.slice(0,30)}...`, last?.contentKo === ko);
    log(`VI 자동번역: ${last?.contentVi?.slice(0,40)}...`, !!last?.contentVi);
    log(`EN 자동번역: ${last?.contentEn?.slice(0,40)}...`, !!last?.contentEn);
  }
}

console.log("\n━━━ ⑤ E2E 86건 중 실패 4건 원인 분석 ━━━");
console.log("(별도로 e2e.mjs 실행 후 FAIL 항목만 출력)");
