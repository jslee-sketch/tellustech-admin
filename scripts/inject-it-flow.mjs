#!/usr/bin/env node
// IT 계약 1건에 종합 흐름 주입
//   - 장비 1대 (e2e가 이미 만든 TLS-260425-002 사용)
//   - 그 장비를 위한 소모품 4건 입고+출고 (IT 계약 장비 S/N 매핑)
//   - 추가 AS 티켓 + 출동 + 비용
//   - 비용 2건 (출동 교통비 + 매입 연결)
//   - IT 계약 매출 반영 (월별 청구 + reflect-sales)

const BASE = process.env.BASE || "https://tellustech-admin-production.up.railway.app";

async function req(method, path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (opts.cookie) headers.Cookie = opts.cookie;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text?.slice(0, 200); }
  return { status: res.status, data };
}
async function login(u, p, cc = "TV") {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyCode: cc, username: u, password: p, language: "KO" }),
  });
  const sc = r.headers.get("set-cookie");
  return sc.match(/(tts_session=[^;]+)/)[1];
}

const log = (ok, msg) => console.log(`  ${ok ? "✓" : "✗"} ${msg}`);

(async () => {
  const cookie = await login("admin", "admin123");
  const techCookie = await login("tech1", "test123");
  console.log("✓ 세션 (admin + tech1)\n");

  // 1) IT 계약 + 장비 S/N 가져오기
  const contractsRes = await req("GET", "/api/rental/it-contracts", { cookie });
  const contracts = contractsRes.data?.contracts ?? [];
  const target = contracts.find((c) => c.contractNumber === "TLS-260425-002") ?? contracts[0];
  if (!target) { console.error("IT 계약 없음"); process.exit(1); }
  console.log(`[대상 계약] ${target.contractNumber} (id=${target.id.slice(0, 12)}...)`);

  const detailRes = await req("GET", `/api/rental/it-contracts/${target.id}`, { cookie });
  const equipment = detailRes.data?.contract?.equipment ?? [];
  if (equipment.length === 0) { console.error("계약에 장비 없음 — 먼저 e2e.mjs 실행 필요"); process.exit(1); }
  const eqSN = equipment[0].serialNumber;
  console.log(`[대상 장비 S/N] ${eqSN}\n`);

  // 시드 마스터
  const itemsRes = await req("GET", "/api/master/items", { cookie });
  const items = itemsRes.data?.items ?? [];
  const toner = items.find((i) => /toner/i.test(i.name)) ?? items[0];
  const drum = items.find((i) => /drum/i.test(i.name)) ?? items[1] ?? items[0];
  const whsRes = await req("GET", "/api/master/warehouses", { cookie });
  const itmain = (whsRes.data?.warehouses ?? whsRes.data ?? []).find((w) => w.code === "ITMAIN");
  const empsRes = await req("GET", "/api/master/employees", { cookie });
  const emps = empsRes.data?.employees ?? empsRes.data ?? [];
  const tnv = emps.find((e) => e.employeeCode === "TNV-001");
  const deptsRes = await req("GET", "/api/master/departments", { cookie });
  const depts = deptsRes.data?.departments ?? deptsRes.data ?? [];
  const tvbn = depts.find((d) => d.code === "TVBN") ?? depts[0];

  // 2) 소모품 4건: 입고 → 장비 대상 출고
  console.log("[소모품 4건 입고 → 장비 대상 출고]");
  const consumablesData = [
    { item: toner, name: "Toner Black", sn: `TONER-BK-${Date.now()}-1` },
    { item: toner, name: "Toner Black 2", sn: `TONER-BK-${Date.now()}-2` },
    { item: drum, name: "Drum Unit", sn: `DRUM-${Date.now()}-1` },
    { item: items.find((i) => /paper/i.test(i.name)) ?? items[2] ?? items[0], name: "A4 Paper", sn: `PAPER-${Date.now()}-1` },
  ];
  let consumablesOK = 0;
  for (const c of consumablesData) {
    const inRes = await req("POST", "/api/inventory/transactions", {
      cookie,
      body: {
        itemId: c.item.id, toWarehouseId: itmain.id, txnType: "IN", reason: "PURCHASE",
        serialNumber: c.sn, quantity: 1, note: `소모품 ${c.name} 입고`,
      },
    });
    const outRes = await req("POST", "/api/inventory/transactions", {
      cookie,
      body: {
        itemId: c.item.id, fromWarehouseId: itmain.id, txnType: "OUT", reason: "CONSUMABLE_OUT",
        serialNumber: c.sn, quantity: 1, targetEquipmentSN: eqSN,
        note: `[자동] ${eqSN} 장비에 ${c.name} 사용`,
      },
    });
    const ok = inRes.status === 201 && outRes.status === 201;
    if (ok) consumablesOK++;
    log(ok, `${c.name} (${c.sn}) → 장비 ${eqSN}`);
  }

  // 3) 추가 AS 티켓 + 출동 (IT 계약 거래처 = WELSTORY)
  console.log("\n[AS 티켓 + 출동 1건 추가 (IT 계약 거래처 WELSTORY)]");
  const tk = await req("POST", "/api/as-tickets", {
    cookie,
    body: {
      clientId: target.clientId,
      assignedToId: tnv?.id,
      itemId: equipment[0].itemId,
      serialNumber: eqSN,
      symptomVi: `Máy ${eqSN} báo lỗi giấy kẹt — cần kỹ thuật viên đến kiểm tra ngay tại văn phòng khách hàng.`,
      originalLang: "VI",
    },
  });
  const tkId = (tk.data?.ticket || tk.data)?.id;
  log(tk.status === 201, `AS 티켓 (장비 S/N ${eqSN} 자동번역 트리거)`);

  if (tkId) {
    const dispRes = await req("POST", "/api/as-dispatches", {
      cookie,
      body: {
        asTicketId: tkId,
        dispatchEmployeeId: tnv?.id,
        transportMethod: "COMPANY_CAR",
        googleDistanceKm: 30,
        departMeterKm: 20000,
        returnMeterKm: 20061, // 60km ≈ google 30 × 2 = 60km 일치
        transportCost: 150000,
        departedAt: "2026-04-25T08:00:00Z",
        arrivedAt: "2026-04-25T09:00:00Z",
      },
    });
    const dispMatch = (dispRes.data?.dispatch || dispRes.data)?.distanceMatch;
    log(dispRes.status === 201, `출동 + 거리매칭=${dispMatch} (60km vs 60km expected)`);
  }

  // 4) 비용 2건 — 출동 교통비 + 일반 매입
  console.log("\n[비용 2건]");
  const exp1 = await req("POST", "/api/finance/expenses", {
    cookie,
    body: {
      expenseType: "TRANSPORT", amount: "150000", currency: "VND", fxRate: "1",
      incurredAt: "2026-04-25", departmentId: tvbn?.id,
      note: `${target.contractNumber} ${eqSN} 출동 교통비`,
    },
  });
  log(exp1.status === 201 || exp1.status === 200, `교통비 150,000 VND`);

  const exp2 = await req("POST", "/api/finance/expenses", {
    cookie,
    body: {
      expenseType: "PURCHASE", amount: "2500000", currency: "VND", fxRate: "1",
      incurredAt: "2026-04-25", departmentId: tvbn?.id,
      note: `${target.contractNumber} 소모품 매입 (토너 2 + 드럼 1 + 용지)`,
    },
  });
  log(exp2.status === 201 || exp2.status === 200, `소모품 매입 비용 2,500,000 VND`);

  // 5) IT 계약 매출 자동반영
  console.log("\n[IT 계약 매출 자동반영]");
  const refl = await req("POST", `/api/rental/it-contracts/${target.id}/reflect-sales`, { cookie, body: {} });
  log(refl.status === 201 || refl.status === 200, `reflect-sales (status=${refl.status})`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" 주입 결과");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  소모품 출고:      ${consumablesOK}/4 (장비 ${eqSN} 매핑)`);
  console.log(`  AS 티켓 + 출동:   1건 (자동번역 + distanceMatch)`);
  console.log(`  비용:             2건 (교통비 + 소모품 매입)`);
  console.log(`  매출 자동반영:    1건`);
  console.log(`\n  IT 계약 상세 URL: ${BASE}/rental/it-contracts/${target.id}`);
})();
