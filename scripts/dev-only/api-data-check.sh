#!/bin/bash
# API 응답에 -100- 시드 데이터가 실제 들어있는지 검증.
BASE="${BASE:-http://localhost:3000}"
COOKIE="-b /tmp/sess.txt"
PASS=0
FAIL=0

assert_contains() {
  local name="$1"
  local url="$2"
  local needle="$3"
  local body
  body=$(curl -sS $COOKIE "$BASE$url")
  if echo "$body" | grep -q "$needle"; then
    echo "✅ $name | grep '$needle' OK"
    PASS=$((PASS + 1))
  else
    echo "❌ $name | needle='$needle' missing"
    FAIL=$((FAIL + 1))
    echo "    응답 첫 200자: $(echo "$body" | head -c 200)"
  fi
}

echo "━━━━━ API 데이터 fetch — 100 시드 데이터 존재 검증 ━━━━━"

assert_contains "거래처 — 삼성전자 베트남"    "/api/master/clients?q=CL-100"           "삼성전자 베트남"
assert_contains "거래처 — 신도리코 (공급)"    "/api/master/clients?q=CL-100-008"       "신도리코"
assert_contains "품목 — Sindoh D330"        "/api/master/items?q=ITM-100-001"        "Sindoh D330"
assert_contains "품목 — Black Toner D330"    "/api/master/items?q=ITM-100-006"        "Black Toner D330"
assert_contains "매출 SLS-100-001"          "/api/sales"                              "SLS-100-001"
assert_contains "매입 PUR-100-001"          "/api/purchases"                          "PUR-100-001"
assert_contains "IT 계약 TLS-100-001"       "/api/rental/it-contracts"                "TLS-100-001"
{ # TM-100-001은 VR 회사 데이터 — VR 세션으로 검증
  body=$(curl -sS -b /tmp/sess-vr.txt "$BASE/api/rental/tm-rentals")
  if echo "$body" | grep -q "TM-100-001"; then
    echo "✅ TM 렌탈 TM-100-001 (VR 세션) | grep 'TM-100-001' OK"; PASS=$((PASS + 1))
  else
    echo "❌ TM 렌탈 TM-100-001 (VR 세션) | needle missing"; FAIL=$((FAIL + 1))
  fi
}
assert_contains "AS 티켓 AS-100-001"        "/api/as-tickets"                         "AS-100-001"
assert_contains "은행 계좌 ACC-100-001"      "/api/finance/bank-accounts"             "ACC-100-001"
assert_contains "Cash CT-100-"              "/api/finance/cash-transactions"          "CT-100-"
assert_contains "비용 EXP-100-001"           "/api/finance/expenses"                   "EXP-100-001"
assert_contains "JE-100-PUR-"               "/api/finance/journal-entries"            "JE-100-PUR-"
assert_contains "TrialBalance — 156(상품)"  "/api/finance/trial-balance?period=2026-04" "156"
assert_contains "IncomeStatement — 511 매출액" "/api/finance/income-statement?period=2026-04" "511"
assert_contains "BalanceSheet — 자산"         "/api/finance/balance-sheet?asOf=2026-04" "112"
assert_contains "PR (RECEIVABLE 매출)"        "/api/finance/payables?kind=RECEIVABLE"   "RECEIVABLE"
assert_contains "PR (PAYABLE 매입)"           "/api/finance/payables?kind=PAYABLE"      "PAYABLE"

echo ""
echo "━━━━━ 결과 ━━━━━"
echo "PASS=$PASS / FAIL=$FAIL"
