#!/bin/bash
# 100 시나리오 화면 + API 라이브 검증 (HTTP 200 확인)
# 사전: dev 서버 실행 + /tmp/sess.txt에 세션 쿠키 저장

BASE="${BASE:-http://localhost:3000}"
COOKIE="-b /tmp/sess.txt"
PASS=0
FAIL=0
FAIL_LIST=""

check() {
  local name="$1"
  local url="$2"
  local code
  code=$(curl -sS $COOKIE -o /dev/null -w "%{http_code}" "$BASE$url")
  if [[ "$code" == "200" || "$code" == "307" || "$code" == "304" ]]; then
    echo "✅ $code | $name | $url"
    PASS=$((PASS + 1))
  else
    echo "❌ $code | $name | $url"
    FAIL=$((FAIL + 1))
    FAIL_LIST="$FAIL_LIST\n  ✗ [$code] $url"
  fi
}

echo "━━━━━ 화면 라우트 (PAGE) ━━━━━"
check "마스터 — 거래처"         "/master/clients"
check "마스터 — 품목"           "/master/items"
check "마스터 — 직원"           "/master/employees"
check "마스터 — 창고"           "/master/warehouses"
check "마스터 — 부서"           "/master/departments"
check "마스터 — 품목호환"        "/admin/item-compatibility"
check "마스터 — 라이선스"        "/master/licenses"
check "마스터 — 일정"            "/master/schedules"
check "마스터 — 프로젝트"        "/master/projects"

check "영업 — 매출"             "/sales"
check "영업 — 매입"             "/purchases"
check "영업 — 견적"             "/admin/quotes"

check "AS — 티켓"               "/as/tickets"
check "AS — 출동"               "/as/dispatches"

check "렌탈 — IT 계약"          "/rental/it-contracts"
check "렌탈 — TM 렌탈"          "/rental/tm-rentals"

check "재고 — 현황"             "/inventory/stock"
check "재고 — 입출고 등록"       "/inventory/transactions/new"
check "재고 — QR 스캔"          "/inventory/scan"

check "재경 — 계좌"             "/finance/accounts"
check "재경 — 자금이동"          "/finance/cash-transactions"
check "재경 — 자금현황판"        "/finance/cash-dashboard"
check "재경 — 미수/미지급"       "/finance/payables"
check "재경 — 비용"              "/finance/expenses"
check "재경 — 비용센터"          "/finance/cost-centers"
check "재경 — 수익성"            "/finance/profitability"
check "재경 — 계정과목"          "/finance/chart-of-accounts"
check "재경 — 분개"              "/finance/journal-entries"
check "재경 — 매핑"              "/finance/account-mappings"
check "재경 — 시산표"            "/finance/trial-balance"
check "재경 — 손익계산서"        "/finance/income-statement"
check "재경 — 재무상태표"        "/finance/balance-sheet"
check "재경 — 회계마감"          "/admin/closings"
check "재경 — 회계설정"          "/finance/accounting-config"

check "관리 — 알림 규칙"         "/admin/notification-rules"
check "관리 — 알림 이력"         "/admin/notification-history"
check "관리 — 적정율 분석"       "/admin/yield-analysis"
check "관리 — 사용량확인서"      "/admin/usage-confirmations"
check "관리 — SNMP"             "/admin/snmp"
check "관리 — 감사로그"          "/admin/audit-logs"
check "관리 — 휴지통"            "/admin/trash"
check "관리 — 권한"              "/admin/permissions"

check "내 알림"                 "/notifications"
check "설정 — 알림"             "/settings/notifications"

check "캘린더"                  "/calendar"
check "채팅"                    "/chat"
check "대시보드"                "/"

echo ""
echo "━━━━━ API (데이터 fetch) ━━━━━"
check "API — 거래처 목록"        "/api/master/clients?q=CL-100"
check "API — 품목 목록"          "/api/master/items?q=ITM-100"
check "API — 매출 목록"          "/api/sales"
check "API — 매입 목록"          "/api/purchases"
check "API — IT 계약 목록"       "/api/rental/it-contracts"
check "API — TM 렌탈 목록"       "/api/rental/tm-rentals"
check "API — AS 티켓 목록"       "/api/as-tickets"
check "API — 재고 — 품목별"      "/api/inventory/stock"
check "API — Bank Accounts"     "/api/finance/bank-accounts"
check "API — Cash Transactions" "/api/finance/cash-transactions"
check "API — PR (미수/미지급)"   "/api/finance/payables"
check "API — Expenses"          "/api/finance/expenses"
check "API — JournalEntries"    "/api/finance/journal-entries"
check "API — TrialBalance"      "/api/finance/trial-balance?period=2026-04"
check "API — IncomeStatement"   "/api/finance/income-statement?period=2026-04"
check "API — BalanceSheet"      "/api/finance/balance-sheet?asOf=2026-04"
check "API — Notifications"     "/api/notifications"
check "API — Auth Me"           "/api/auth/me"

echo ""
echo "━━━━━ 결과 ━━━━━"
echo "PASS=$PASS / FAIL=$FAIL"
if [ $FAIL -gt 0 ]; then echo -e "실패 라우트:$FAIL_LIST"; fi
