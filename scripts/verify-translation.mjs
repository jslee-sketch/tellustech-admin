#!/usr/bin/env node
// 자동 번역 검증 — 베트남어로만 사건평가 작성 → DB에 ko/en도 채워졌는지 확인

const BASE = "https://tellustech-admin-production.up.railway.app";

async function req(method, path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (opts.cookie) headers.Cookie = opts.cookie;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text?.slice(0, 200); }
  return { status: res.status, data, setCookie: res.headers.get("set-cookie") };
}
function extractCookie(setCookie) {
  if (!setCookie) return null;
  const m = setCookie.match(/(tts_session=[^;]+)/);
  return m ? m[1] : null;
}

(async () => {
  console.log("1. tech1 로그인 (사건 작성용 — empCode 필요)");
  const lr = await req("POST", "/api/auth/login", {
    body: { companyCode: "TV", username: "tech1", password: "test123", language: "VI" },
  });
  if (lr.status !== 200) { console.error("로그인 실패", lr); process.exit(1); }
  const cookie = extractCookie(lr.setCookie);
  console.log("   ✓ 로그인");

  console.log("\n2. admin 로그인 (직원 조회용)");
  const ar = await req("POST", "/api/auth/login", {
    body: { companyCode: "TV", username: "admin", password: "admin123", language: "KO" },
  });
  const adminCookie = extractCookie(ar.setCookie);

  const empsRes = await req("GET", "/api/master/employees", { cookie: adminCookie });
  const arr = empsRes.data?.employees || empsRes.data || [];
  const tnv = (Array.isArray(arr) ? arr : []).find((e) => e.employeeCode === "TNV-001");
  if (!tnv) { console.error("TNV-001 없음"); process.exit(1); }
  console.log(`   ✓ TNV-001: ${tnv.id.slice(0, 12)}...`);

  console.log("\n3. 베트남어로만 사건평가 POST (자동번역 트리거)");
  const t0 = Date.now();
  const inc = await req("POST", "/api/hr/incidents", {
    cookie,
    body: {
      subjectId: tnv.id,
      type: "PRAISE",
      originalLang: "VI",
      contentVi: "Nhân viên đã hoàn thành dự án triển khai mạng cho khách hàng IMJ VINA đúng thời hạn, vượt qua mong đợi và giảm thiểu thời gian dừng hoạt động.",
    },
  });
  const ms = Date.now() - t0;
  console.log(`   응답 ${ms}ms / status ${inc.status}`);
  if (inc.status !== 201 && inc.status !== 200) {
    console.error("   ✗ 실패:", JSON.stringify(inc.data).slice(0, 300));
    process.exit(1);
  }

  const incident = inc.data?.incident || inc.data;
  console.log("\n[저장된 데이터]");
  console.log(`   incidentCode: ${incident.incidentCode}`);
  console.log(`   originalLang: ${incident.originalLang}`);
  console.log(`   contentVi:    ${incident.contentVi?.slice(0, 80)}...`);
  console.log(`   contentEn:    ${incident.contentEn ? incident.contentEn.slice(0, 80) + "..." : "❌ NULL"}`);
  console.log(`   contentKo:    ${incident.contentKo ? incident.contentKo.slice(0, 80) + "..." : "❌ NULL"}`);

  const allFilled = !!(incident.contentVi && incident.contentEn && incident.contentKo);
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (allFilled) {
    console.log(" ✓ 자동번역 작동 — VI 입력 → EN/KO 자동 채움");
  } else {
    console.log(" ✗ 자동번역 미작동 — EN 또는 KO가 NULL");
    console.log(" 원인 후보: API 키 부재 / 크레딧 부족 / 네트워크 / 모델 호출 실패");
  }

  // 상세 페이지 URL 출력 (다음 단계 Chrome 확인용)
  console.log(`\n  상세: ${BASE}/hr/incidents/${incident.id}`);
})();
