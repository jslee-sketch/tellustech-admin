#!/usr/bin/env node
// E2E 테스트 데이터 재주입 — TNV-001 대상으로 의미있는 평가 데이터 생성
// 실행: node scripts/inject-test-data.mjs

const BASE = process.env.BASE || "https://tellustech-admin-production.up.railway.app";

async function req(method, path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (opts.cookie) headers.Cookie = opts.cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text?.slice(0, 100); }
  return { status: res.status, data, setCookie: res.headers.get("set-cookie") };
}

function extractCookie(setCookie) {
  if (!setCookie) return null;
  const m = setCookie.match(/(tts_session=[^;]+)/);
  return m ? m[1] : null;
}

async function login(username, password, companyCode = "TV") {
  const r = await req("POST", "/api/auth/login", {
    body: { companyCode, username, password, language: "KO" },
  });
  if (r.status !== 200) throw new Error(`login failed ${username}: ${r.status} ${JSON.stringify(r.data)}`);
  return extractCookie(r.setCookie);
}

const tracker = { incidents: 0, asTickets: 0, asCompleted: 0, sales: 0, dispatches: 0, errors: [] };
function rec(label, ok, detail) {
  if (ok) console.log(`  ✓ ${label}`);
  else { console.log(`  ✗ ${label}: ${detail}`); tracker.errors.push(`${label}: ${detail}`); }
}

(async () => {
  console.log("E2E 데이터 재주입 — TNV-001 대상\n");

  // ─── 세션 ───
  const adminCookie = await login("admin", "admin123");
  const techCookie = await login("tech1", "test123");
  console.log("✓ 세션 (admin + tech1)");

  // ─── TNV-001 ID 조회 ───
  const empsRes = await req("GET", "/api/master/employees", { cookie: adminCookie });
  const emps = empsRes.data?.employees || empsRes.data?.items || empsRes.data || [];
  const arr = Array.isArray(emps) ? emps : [];
  const tnv = arr.find((e) => e.employeeCode === "TNV-001");
  if (!tnv) { console.error("TNV-001 없음 — 시드 미실행?"); process.exit(1); }
  console.log(`✓ TNV-001: ${tnv.id}\n`);

  // ─── 시드 데이터 의존 ───
  const [clientsRes, projectsRes, itemsRes, whsRes] = await Promise.all([
    req("GET", "/api/master/clients", { cookie: adminCookie }),
    req("GET", "/api/master/projects", { cookie: adminCookie }),
    req("GET", "/api/master/items", { cookie: adminCookie }),
    req("GET", "/api/master/warehouses", { cookie: adminCookie }),
  ]);
  const clients = clientsRes.data?.clients ?? clientsRes.data ?? [];
  const projects = projectsRes.data?.projects ?? projectsRes.data ?? [];
  const items = itemsRes.data?.items ?? [];
  const whs = whsRes.data?.warehouses ?? whsRes.data ?? [];

  const client = (Array.isArray(clients) ? clients : []).find((c) => c.companyNameVi === "WELSTORY") || clients[0];
  const tradeProject = (Array.isArray(projects) ? projects : []).find((p) => p.salesType === "TRADE");
  const item = items[0];
  const itmain = (Array.isArray(whs) ? whs : []).find((w) => w.code === "ITMAIN");
  if (!client || !tradeProject || !item || !itmain) {
    console.error("시드 부족:", { client: !!client, tradeProject: !!tradeProject, item: !!item, itmain: !!itmain });
    process.exit(1);
  }

  // ─── 사건평가 3건 ───
  console.log("[사건평가 3건 (PRAISE 2 + IMPROVEMENT 1)]");
  const incidents = [
    { type: "PRAISE", contentVi: "Nguyễn đã xử lý nhanh sự cố máy in tại WELSTORY trong 30 phút, vượt SLA. Khách hàng đã gửi email cảm ơn." },
    { type: "PRAISE", contentVi: "Hoàn thành cài đặt hệ thống cho khách hàng mới với chất lượng cao và đúng tiến độ trong tuần này." },
    { type: "IMPROVEMENT", contentVi: "Có một lần báo cáo công việc chậm 2 ngày trong tháng 4. Cần cải thiện kỷ luật báo cáo theo lịch hằng tuần." },
  ];
  for (const inc of incidents) {
    const r = await req("POST", "/api/hr/incidents", {
      cookie: techCookie,
      body: { subjectId: tnv.id, type: inc.type, originalLang: "VI", contentVi: inc.contentVi },
    });
    if (r.status === 201 || r.status === 200) { tracker.incidents++; rec(`incident ${inc.type}`, true); }
    else rec(`incident ${inc.type}`, false, `${r.status} ${JSON.stringify(r.data).slice(0, 100)}`);
  }

  // ─── AS 티켓 5건 ───
  console.log("\n[AS 티켓 5건]");
  const ticketIds = [];
  for (let i = 1; i <= 5; i++) {
    const r = await req("POST", "/api/as-tickets", {
      cookie: adminCookie,
      body: {
        clientId: client.id,
        assignedToId: tnv.id,
        symptomVi: `Sự cố máy in #${i} — ${i === 1 ? "kẹt giấy" : i === 2 ? "lỗi mực" : i === 3 ? "không in được" : i === 4 ? "in mờ" : "tiếng ồn lạ"}`,
        originalLang: "VI",
      },
    });
    if (r.status === 201 || r.status === 200) {
      tracker.asTickets++;
      const id = (r.data?.ticket || r.data)?.id;
      ticketIds.push(id);
      rec(`AS ticket #${i}`, true);
    } else rec(`AS ticket #${i}`, false, `${r.status} ${JSON.stringify(r.data).slice(0, 100)}`);
  }

  // 3건 COMPLETED 처리 (TAT 계산용)
  console.log("\n[AS 티켓 3건 COMPLETED 처리]");
  for (let i = 0; i < Math.min(3, ticketIds.length); i++) {
    const r = await req("PATCH", `/api/as-tickets/${ticketIds[i]}`, {
      cookie: adminCookie,
      body: { status: "COMPLETED" },
    });
    if (r.status === 200) { tracker.asCompleted++; rec(`AS COMPLETED ${i + 1}`, true); }
    else rec(`AS COMPLETED ${i + 1}`, false, `${r.status} ${JSON.stringify(r.data).slice(0, 100)}`);
  }
  // 나머지 2건은 IN_PROGRESS
  for (let i = 3; i < ticketIds.length; i++) {
    await req("PATCH", `/api/as-tickets/${ticketIds[i]}`, {
      cookie: adminCookie,
      body: { status: "IN_PROGRESS" },
    });
  }

  // ─── 매출 3건 ───
  console.log("\n[매출 3건 (salesEmployeeId = TNV-001)]");
  const salesAmounts = [5000000, 8500000, 12000000];
  for (let i = 0; i < salesAmounts.length; i++) {
    const r = await req("POST", "/api/sales", {
      cookie: adminCookie,
      body: {
        clientId: client.id,
        projectId: tradeProject.id,
        warehouseId: itmain.id,
        salesEmployeeId: tnv.id,
        items: [{ itemId: item.id, quantity: 1, unitPrice: salesAmounts[i] }],
      },
    });
    if (r.status === 201 || r.status === 200) { tracker.sales++; rec(`Sale ${salesAmounts[i].toLocaleString()} VND`, true); }
    else rec(`Sale ${i + 1}`, false, `${r.status} ${JSON.stringify(r.data).slice(0, 100)}`);
  }

  // ─── 출동 4건 — distanceMatch 다양하게 ───
  console.log("\n[출동 4건 (3건 일치 + 1건 불일치)]");
  const dispatchData = [
    // 일치 (oddo 일치 + Google 거리도 비슷)
    { dep: 10000, ret: 10050, google: 25, expected: true },
    { dep: 11000, ret: 11048, google: 24, expected: true },
    { dep: 12000, ret: 12046, google: 23, expected: true },
    // 불일치 (oddo 적게 찍힘)
    { dep: 13000, ret: 13020, google: 30, expected: false },
  ];
  // 출동에는 ticket 필요 — 위에서 만든 ticket 4번째 사용 (IN_PROGRESS 상태에선 등록 가능한지 확인 필요)
  // 안전하게: 출동을 위한 추가 티켓 4개 별도 생성 후 출동 등록
  for (let i = 0; i < dispatchData.length; i++) {
    const tkRes = await req("POST", "/api/as-tickets", {
      cookie: adminCookie,
      body: {
        clientId: client.id,
        assignedToId: tnv.id,
        symptomVi: `Disp ticket #${i + 1}`,
        originalLang: "VI",
      },
    });
    const tkId = (tkRes.data?.ticket || tkRes.data)?.id;
    if (!tkId) { rec(`Dispatch #${i + 1} ticket`, false, "no id"); continue; }
    const d = dispatchData[i];
    const r = await req("POST", "/api/as-dispatches", {
      cookie: adminCookie,
      body: {
        asTicketId: tkId,
        dispatchedById: tnv.id,
        vehicleType: "COMPANY_CAR",
        vehicleNumber: `29-A1 ${1000 + i}`,
        googleDistanceKm: d.google,
        departMeterKm: d.dep,
        returnMeterKm: d.ret,
        departedAt: `2026-04-${10 + i}T08:00:00Z`,
        arrivedAt: `2026-04-${10 + i}T09:30:00Z`,
      },
    });
    if (r.status === 201 || r.status === 200) {
      tracker.dispatches++;
      const m = (r.data?.dispatch || r.data)?.distanceMatch;
      rec(`Dispatch #${i + 1} (oddo ${d.ret - d.dep}km / google ${d.google}km, match=${m})`, true);
    } else rec(`Dispatch #${i + 1}`, false, `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" 주입 결과");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  사건평가: ${tracker.incidents}/3`);
  console.log(`  AS 티켓:  ${tracker.asTickets}/5  (COMPLETED ${tracker.asCompleted}/3)`);
  console.log(`  매출:     ${tracker.sales}/3`);
  console.log(`  출동:     ${tracker.dispatches}/4`);
  if (tracker.errors.length > 0) {
    console.log(`\n  실패 ${tracker.errors.length}건:`);
    tracker.errors.forEach((e) => console.log(`    - ${e}`));
  } else {
    console.log("\n  모두 성공.");
  }
})();
