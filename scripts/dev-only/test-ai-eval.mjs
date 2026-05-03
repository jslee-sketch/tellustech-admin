#!/usr/bin/env node
// AI 평가 실제 테스트 — admin 로그인 → TNV-001 조회 → POST /api/hr/evaluations/ai

const BASE = "https://tellustech-admin-production.up.railway.app";

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
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data, setCookie: res.headers.get("set-cookie") };
}

function extractCookie(setCookie) {
  if (!setCookie) return null;
  const m = setCookie.match(/(tts_session=[^;]+)/);
  return m ? m[1] : null;
}

(async () => {
  console.log("1. admin/TV 로그인...");
  const login = await req("POST", "/api/auth/login", {
    body: { companyCode: "TV", username: "admin", password: "admin123", language: "KO" },
  });
  if (login.status !== 200) {
    console.error("로그인 실패:", login.status, login.data);
    process.exit(1);
  }
  const cookie = extractCookie(login.setCookie);
  console.log("   ✓ 로그인 성공");

  console.log("\n2. TNV-001 직원 조회...");
  const emps = await req("GET", "/api/master/employees", { cookie });
  const list = emps.data?.employees || emps.data?.items || emps.data || [];
  const arr = Array.isArray(list) ? list : [];
  const tnv001 = arr.find((e) => e.employeeCode === "TNV-001");
  if (!tnv001) {
    console.error("TNV-001 없음. 전체:", arr.map((e) => e.employeeCode));
    process.exit(1);
  }
  console.log(`   ✓ 직원: ${tnv001.employeeCode} · ${tnv001.nameVi} (id=${tnv001.id.slice(0, 10)}...)`);

  console.log("\n3. AI 종합평가 실행 (/api/hr/evaluations/ai POST)...");
  const t0 = Date.now();
  const ai = await req("POST", "/api/hr/evaluations/ai", {
    cookie,
    body: { employeeId: tnv001.id },
  });
  const ms = Date.now() - t0;
  if (ai.status !== 200) {
    console.error(`   ✗ 실패 ${ai.status}:`, JSON.stringify(ai.data).slice(0, 300));
    process.exit(1);
  }

  const { report, apiKeyPresent } = ai.data;
  console.log(`   ✓ 응답 ${ms}ms`);
  console.log(`   Claude API: ${apiKeyPresent ? "✓ 활성" : "✗ 비활성 (규칙기반만)"}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" AI 종합 인사평가 — TNV-001");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log(`\n[최종]  종합 점수: ${report.finalScore.total}   등급: ${report.finalScore.grade}\n`);

  console.log("[9지표 breakdown]");
  const pad = (s, n) => String(s).padEnd(n);
  for (const [k, b] of Object.entries(report.finalScore.breakdown)) {
    console.log(`  ${pad(k, 14)}  score=${pad(b.score, 6)} × weight=${pad(String(b.weight * 100).slice(0, 4) + "%", 6)} = ${b.contribution}`);
  }

  console.log("\n[사건 분석]");
  console.log(`  규칙 점수: ${report.incidentAnalysis.ruleScore}`);
  console.log(`  AI 점수:   ${report.incidentAnalysis.aiScore ?? "— (Claude 미활성 또는 사건 없음)"}`);
  console.log(`  요약:      ${report.incidentAnalysis.patternSummary}`);
  if (report.incidentAnalysis.strengths.length > 0)
    console.log(`  강점:      ${report.incidentAnalysis.strengths.join(", ")}`);
  if (report.incidentAnalysis.weaknesses.length > 0)
    console.log(`  약점:      ${report.incidentAnalysis.weaknesses.join(", ")}`);
  if (report.incidentAnalysis.aiText) {
    console.log("  AI 원문:");
    console.log("  " + report.incidentAnalysis.aiText.split("\n").map((l) => "  " + l).join("\n"));
  }

  console.log("\n[ERP 객관 지표]");
  console.log(`  AS TAT (hrs):        ${report.erpMetrics.asTatHours ?? "—"}`);
  console.log(`  출동 효율 (%):       ${report.erpMetrics.dispatchEfficiency.toFixed(1)}`);
  console.log(`  매출 기여 (VND):     ${report.erpMetrics.salesContribution.toLocaleString()}`);
  console.log(`  ERP 속도/마감:       ${report.erpMetrics.erpSpeed.toFixed(0)} / ${report.erpMetrics.erpDeadline.toFixed(0)}`);
  console.log(`  ERP 숙련:            ${report.erpMetrics.erpMastery}`);
  console.log(`  근태:                ${report.erpMetrics.attendance}`);
  console.log(`  동료 평가 평균:      ${report.peerScore}`);

  if (report.biasWarnings.length > 0) {
    console.log("\n[편향 경고]");
    for (const w of report.biasWarnings) console.log(`  ⚠ ${w}`);
  }

  console.log("\n4. 편향성 분석 GET (reviewerId=TNV-001)...");
  const bias = await req("GET", `/api/hr/evaluations/ai?reviewerId=${tnv001.id}`, { cookie });
  if (bias.status === 200) {
    const b = bias.data.bias;
    console.log(`   평가 기록 수: ${b.totalReviews}`);
    console.log(`   평균 점수: ${b.avgScore}`);
    console.log(`   표준편차: ${b.stdDev}`);
    console.log(`   고위험 편향: ${b.highRisk ? "⚠ YES" : "OK"}`);
    console.log(`   권고 보정: ${b.suggestedCorrection > 0 ? "+" : ""}${b.suggestedCorrection}`);
    if (b.aiText) {
      console.log("   AI 편향 분석:");
      console.log("   " + b.aiText.split("\n").map((l) => "   " + l).join("\n"));
    } else {
      console.log("   (Claude 미활성 또는 평가 이력 부족)");
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("테스트 완료.");
})();
