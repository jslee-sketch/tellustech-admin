---
title: "Tellustech ERP — 관리자 매뉴얼"
subtitle: "ADMIN / MANAGER 전용"
author: "Tellustech IT 팀"
date: "2026-04"
lang: ko
---

# 머리말

본 문서는 ADMIN / MANAGER 권한 사용자가 ERP 의 **운영·정책 결정** 기능을 사용할 때 참고합니다.

- 일반 사용자 기능 → 별책 **A — 사용설명서**
- 고객사용 포탈 → 별책 **C — 고객 포탈 가이드**

본 권은 다음 8개 영역을 다룹니다.

1. 권한관리 — 사용자별 모듈 접근 제어
2. 회계마감 — 월별 잠금/해제
3. 휴지통 — Soft-delete 행 복구
4. 감사로그 — INSERT/UPDATE/DELETE 추적
5. 호환매핑 — 본품 ↔ 소모품/부품 M:N
6. 통계 깊이 보기 — KPI / SN별 이익
7. 시스템 운영 — 백업·배포·환경변수
8. 부록 — 자동코드·회사정책·S/N·번역·서명

---

# 1부. 관리자 권한 개요

## 1.1 역할 (role) 4종

| 역할 | 사이드바 | 회사 picker | 권한 매트릭스 |
|---|---|---|---|
| `ADMIN` | 전체 모듈 + 관리자 그룹 | TV/VR/ALL | 전 모듈 자동 `WRITE` (UserPermission 무시) |
| `MANAGER` | 전체 모듈 + 관리자 그룹 | TV/VR/ALL | UserPermission 적용 (지정한 모듈만) |
| `EMPLOYEE` | 권한 부여된 모듈만 | 본인 회사만 | UserPermission 적용 |
| `CLIENT` | 포탈 전용, 사내 화면 차단 | – | 별도 |

> `ADMIN` 은 모든 모듈의 `WRITE` 가 자동으로 부여됩니다. `MANAGER` 는 ADMIN 화면에는 접근 가능하지만 모듈별 권한은 별도 부여가 필요합니다.

## 1.2 권한 레벨 3단계

| 레벨 | 의미 |
|---|---|
| `HIDDEN` | 사이드바에서 숨김, API GET 도 차단 |
| `VIEW` | 보기만 가능, 작성·수정·삭제 차단 |
| `WRITE` | 작성·수정·삭제 모두 가능 |

레벨 변경은 즉시 반영되지만, 사용자가 이미 페이지를 열어 둔 경우에는 새로고침이 필요합니다.

## 1.3 회사 스코프와 통합조회

- `allowedCompanies` 가 한 개(`["TV"]` 또는 `["VR"]`)인 사용자는 그 회사 데이터만 봅니다.
- ADMIN/MANAGER 는 보통 `["TV","VR"]` 두 회사를 가지며, 사이드바에 회사 picker(`TV` / `VR` / `ALL`) 가 노출됩니다.
- `ALL` 통합조회 모드 → 모든 화면이 두 회사 합산. 단, **신규 등록은 회사를 명시한 회사 컨텍스트에서만** 권장 (자동 코드 발급의 회사 prefix 보존을 위해).

## 1.4 권한 vs 회사 분리

같은 모듈이라도 다음 두 가지가 독립적으로 작용합니다.

1. **권한 (UserPermission)** — 모듈 단위로 보기/쓰기 가능 여부.
2. **회사 스코프 (companyScope)** — 데이터 가시 범위.

ADMIN 이라도 `companyCode=TV` 세션에서는 VR 데이터를 보지 못합니다. `ALL` 모드로 전환해야 합니다.

---

# 2부. 권한관리 (`/admin/permissions`)

## 2.1 화면 구성

좌측에 **사용자 목록**(CLIENT 제외), 우측에 **31개 모듈 × 3레벨 매트릭스**.

## 2.2 31개 모듈 그룹별 정리

| 그룹 | 모듈 키 |
|---|---|
| **마스터** | `CLIENTS` · `ITEMS` · `WAREHOUSES` · `EMPLOYEES` · `DEPARTMENTS` · `PROJECTS` · `LICENSES` · `SCHEDULES` |
| **영업** | `SALES` · `PURCHASES` |
| **렌탈** | `IT_CONTRACTS` · `TM_RENTALS` |
| **AS** | `AS_TICKETS` · `AS_DISPATCHES` · `CALIBRATIONS` |
| **재고** | `INVENTORY` |
| **인사** | `HR_LEAVE` · `HR_ONBOARDING` · `HR_OFFBOARDING` · `HR_INCIDENT` · `HR_EVALUATION` · `HR_PAYROLL` · `HR_INCENTIVE` |
| **재경** | `FINANCE_PAYABLE` · `FINANCE_RECEIVABLE` · `FINANCE_EXPENSE` |
| **분석·소통** | `STATS` · `CHAT` · `CALENDAR` |
| **관리** | `AUDIT` · `ADMIN` |

## 2.3 입력값별 데이터 영향도

| 입력 / 동작 | **이 값이 시스템에서 하는 일** |
|---|---|
| **사용자 선택** (좌측) | API `GET /api/admin/permissions/{userId}` 호출 → 우측 표에 현재 레벨 채움. CLIENT 역할은 목록에서 제외됨 |
| **모듈 라디오** (HIDDEN/VIEW/WRITE) | 클라이언트 상태에만 반영 — 저장 전엔 DB 변경 없음 |
| **저장 버튼** | API `PUT /api/admin/permissions/{userId}` body=전체 매트릭스 → 31개 모듈 모두 upsert |
| **즉시 반영** | 사용자가 다음 페이지 이동 시 사이드바 자동 가림. 이미 열려 있는 페이지는 새로고침 필요 |

## 2.4 저장 시 일어나는 일

1. **`UserPermission` 테이블 일괄 upsert** — 31행 모두 (level=HIDDEN 인 행도 명시 저장).
2. **그 사용자의 권한 캐시 무효화** — 다음 `/api/auth/me` 호출 시 신규 매트릭스 적용.
3. **감사로그 기록** — `tableName=user_permissions`, action=`UPDATE`, before/after 매트릭스 JSON.
4. **사이드바 가림 즉시 적용** — 다음 페이지 로드 시 `KEY_TO_MODULE` 매핑으로 메뉴 자동 숨김.

## 2.5 부여·해제 절차

1. 좌측에서 사용자 선택 → 현재 권한이 우측 표에 즉시 표시됩니다.
2. 모듈별 라디오(`HIDDEN` / `VIEW` / `WRITE`) 변경.
3. 하단 **저장** 버튼 → API 호출.
4. 변경된 사용자에게 새로고침 안내.

## 2.4 보안 권장 사항

- 인사·재경 모듈은 담당자 외에는 `HIDDEN` 권장 — 급여·미수금 등 민감 정보 보호.
- `ADMIN` 역할은 최소화 — 가능하면 `MANAGER` + 필요한 모듈만 `WRITE`.
- 신규 입사자는 기본 `EMPLOYEE` + 본인 업무 모듈만 `WRITE`, 나머지 `HIDDEN` 으로 시작.
- 퇴사자는 즉시 사용자 비활성화(`status=TERMINATED`) — 권한 매트릭스 비우기는 보조 조치.

---

# 3부. 회계마감 (`/admin/closings`)

## 3.1 마감의 효과

월(`YYYY-MM`) 단위로 다음 4종 행에 `lockedAt` + `lockReason="회계 마감 YYYY-MM"` 이 부여됩니다.

| 모델 | 잠긴 후 차단되는 동작 |
|---|---|
| **Sales** | PATCH(수정) · Adjustment 등록 |
| **Purchase** | PATCH · Adjustment |
| **Expense** | PATCH · 안분 라인 변경 |
| **PayableReceivable** | PATCH · 결제·연락 이력 추가 |

잠긴 행에 대한 변경 시도는 API 가 `409 locked` 로 거절합니다. 사용자에게는 화면에서 「마감된 월입니다」 메시지가 표시됩니다.

## 3.2 입력값별 데이터 영향도

| 입력 / 동작 | **이 값이 시스템에서 하는 일** |
|---|---|
| **대상 월** (`YYYY-MM`) | API body 의 `yearMonth` — 월 시작 00:00 ~ 다음 월 시작 00:00 사이의 모든 4모델 행을 대상으로 함 |
| **마감 버튼** | `POST /api/admin/closings` → `lockedAt = 지금`, `lockReason = "회계 마감 YYYY-MM"` 일괄 부여 |
| **해제 버튼** (ADMIN 전용) | `DELETE /api/admin/closings?yearMonth=` → 그 월의 4모델 행에서 `lockedAt = null`, `lockReason = null` 일괄 제거 |

## 3.3 마감 절차

1. 화면 상단의 **대상 월 (YYYY-MM)** 입력 (기본값: 현재 월).
2. **마감 (lock)** 버튼 → 확인 모달 → 진행.
3. 결과 표시: `잠금 완료: 매출 N / 매입 N / 비용 N / PR N` — 잠긴 행 수 보고.

## 3.4 마감 해제 (ADMIN 전용)

마감 후 오류가 발견된 경우만 사용. 권한이 `MANAGER` 인 경우 해제 버튼이 보이지 않습니다.

1. 동일 화면에서 대상 월 입력.
2. **마감 해제 (unlock)** 버튼 → 확인 → 진행.
3. 결과 표시: `해제 완료: 매출 N / 매입 N / 비용 N / PR N`.

## 3.5 마감/해제 시 자동 일어나는 일

1. **4모델 일괄 UPDATE** — Sales · Purchase · Expense · PayableReceivable.
2. **잠긴 행에 대한 모든 PATCH/Adjustment/Amendment** 가 API 단계에서 `409 locked` 로 거절됨.
3. **신규 등록은 차단되지 않음** — 잠긴 월에 매출 신규 등록 자체는 가능 (저장 시점에 그 월이 잠긴 상태인지 검사하지 않음). **운영 권장**: 마감 후에는 다음 월 일자로만 신규 등록.
4. **감사로그 기록** — 4모델 모두 UPDATE 액션 기록 (마감 일괄 변경 추적 가능).

## 3.4 운영 권장 사항

- 매월 마감 일정은 매월 5일 (전월분) 권장. 일정 모듈에 정기 일정으로 등록.
- 마감 전에 미수금 회수·결제 등록·환율 정산 등 사전 점검.
- 해제는 예외 상황에 한정하고, 해제 사유는 별도 회의록(`/weekly-report`)에 기록.

---

# 4부. 휴지통 (`/admin/trash`)

소프트 삭제(`deletedAt != null`) 된 행을 복구합니다. 영구 삭제 기능은 제공하지 않습니다 (감사로그 보존).

## 4.1 대상 6개 모델

| 모델 | 표시 라벨 |
|---|---|
| `Client` | 거래처 |
| `Item` | 품목 |
| `Warehouse` | 창고 |
| `Employee` | 직원 |
| `Sales` | 매출 |
| `Purchase` | 매입 |

각 카테고리당 최근 100건까지 표시됩니다.

## 4.2 복구 동작 — 입력값별 데이터 영향도

| 입력 / 동작 | **이 값이 시스템에서 하는 일** |
|---|---|
| **복구 버튼** | `POST /api/admin/restore/{model}/{id}` 호출 — `model` 은 화이트리스트 6종만 허용 (Client/Item/Warehouse/Employee/Sales/Purchase) |
| **API 동작** | 해당 행의 `deletedAt = null` UPDATE 한 줄 |
| **연관 행 복구** | 자동 복구되지 않음 — 매출 복구해도 매출 라인은 별도 처리 필요 (현재 미구현, IT 팀 수동) |

## 4.3 복구 절차

1. 카테고리(거래처/품목/...) 별 카드에서 행을 확인.
2. 행 우측 **복구** 버튼 → 확인 모달 → API 호출.
3. 성공 시 페이지 자동 새로고침. 해당 행이 정상 모듈에 다시 노출됩니다.

## 4.4 복구 시 자동 일어나는 일

1. **`deletedAt = null` UPDATE** — 한 행만.
2. **감사로그 기록** — UPDATE 액션, before=`{deletedAt: 시각}`, after=`{deletedAt: null}`.
3. **신규 모듈 노출** — 다음 페이지 로드부터 정상 리스트에 다시 보임.
4. **자동검색 콤보박스에 즉시 반영** — 거래처·품목 콤보박스 검색 결과에 다시 등장.

## 4.3 운영 정책

- 복구 가능 기간 무제한 (영구 삭제 미지원). 잘못된 행은 그대로 두면 휴지통에 누적됩니다.
- 매출/매입 복구 시 연관 라인·재고 트랜잭션은 자동 함께 복원되지 않을 수 있습니다 — IT 팀에 문의 후 처리.
- 직원 복구 시 권한·로그인 정보는 별도 검토. 퇴사 후 재입사 케이스는 신규 등록을 권장.

---

# 5부. 감사로그 (`/admin/audit-logs`)

## 5.1 기록 범위

업무 데이터 21개 모델의 INSERT / UPDATE / DELETE 가 모두 자동 기록됩니다. Prisma 미들웨어로 일괄 처리되어 모듈마다 별도 코드가 필요하지 않습니다.

## 5.2 표 컬럼

| 컬럼 | 의미 |
|---|---|
| **시각** | 발생 일시 (UTC) |
| **회사** | 데이터의 `companyCode` |
| **사용자** | 변경자 username |
| **동작** | `INSERT` (녹색) · `UPDATE` (노랑) · `DELETE` (빨강) |
| **테이블** | DB 테이블명 (예: `sales`, `inventory_items`) |
| **레코드 ID** | 변경 대상 행 ID |
| **변경 내역** | before / after JSON 차이 |

## 5.3 검색·필터 — 입력값별 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **회사 (companyCode)** | URL `?company=` → `WHERE companyCode = X` |
| **사용자 (userId)** | `?user=` → `WHERE userId = X` |
| **테이블 (tableName)** | `?table=` → `WHERE tableName = X` (예: `sales`) |
| **동작 (action)** | `?action=` → INSERT/UPDATE/DELETE 중 하나 |
| **일자 from/to** | `?from=&to=` → `WHERE occurredAt BETWEEN ...` |

모든 필터는 AND 조건. 빈 값은 무시. 표 우상단의 페이지네이션 — 한 화면 50건 단위. 엑셀 다운로드는 별도 권한이 필요합니다 (대용량 우려).

## 5.4 사용 시나리오

- **데이터 정합성 점검** — 예상치 못한 가격/금액 변경 추적.
- **이상 행위 감지** — 한 사용자가 짧은 시간에 다수 DELETE 한 패턴.
- **고객 요청 응대** — 「언제 누가 변경했나요?」 질문에 즉답.
- **법적 증빙** — 회계마감 후 발생한 모든 조정의 추적.

---

# 6부. 호환매핑 (`/admin/item-compatibility`)

본품(`PRODUCT`) 과 소모품/부품(`CONSUMABLE` / `PART`) 의 M:N 호환 관계를 등록합니다. 이 매핑은 **고객 포탈의 소모품 요청 화면**에서 자동 필터로 사용됩니다.

## 6.1 등록 모델

| 필드 | 비고 |
|---|---|
| `productItemId` | 본품 (PRODUCT) |
| `consumableItemId` | 소모품 또는 부품 (CONSUMABLE / PART) |

`(productItemId, consumableItemId)` 조합은 unique 제약이 걸려 있어 중복 등록은 자동 차단됩니다.

## 6.2 입력값별 데이터 영향도

| 입력 / 동작 | **이 값이 시스템에서 하는 일** |
|---|---|
| **본품 선택** (검색바) | 우측에 그 `productItemId` 의 현재 호환 매핑 목록 표시 |
| **+ 추가** 버튼 → 콤보박스 | 선택한 itemId 가 `consumableItemId` 로 INSERT — `(productItemId, consumableItemId)` unique 위반 시 자동 무시 |
| **× 삭제** 버튼 | 그 행만 DELETE. 매핑이 끊긴 본품은 다음 페이지 로드부터 고객 포탈 「소모품 요청」 옵션에서 자동 제거됨 |

## 6.3 등록·삭제 시 자동 일어나는 일

1. **`ItemCompatibility` INSERT/DELETE** — 한 행.
2. **감사로그 기록** — `INSERT` 또는 `DELETE` 액션.
3. **고객 포탈 즉시 반영** — `/api/portal/my-supplies` 가 매번 라이브 조회하므로 캐시 무관.
4. **사내 디스패치 부품 자동 추천** — AS 디스패치에서 해당 본품 SN 선택 시 호환 소모품/부품이 ItemCombobox 드롭다운 상단에 노출됨.

## 6.4 등록 절차

1. 화면 상단 검색바로 본품을 찾아 선택.
2. 우측에 그 본품에 호환되는 소모품/부품 목록이 표시됩니다.
3. **+ 추가** 버튼 → 콤보박스로 소모품/부품 선택 → 저장.
4. 잘못 등록한 매핑은 **× 삭제** 로 즉시 제거 (감사로그 기록됨).

## 6.3 엑셀 일괄 업로드

대량 매핑은 엑셀로 일괄 처리.

| 컬럼 | 형식 |
|---|---|
| `productItemCode` | 예: `ITM-260101-001` |
| `consumableItemCode` | 예: `ITM-260101-005` |

빈 행 / 헤더 행은 자동 무시. 중복 행은 한 번만 등록되고 나머지는 스킵됩니다.

## 6.4 운영 권장 사항

- 신규 IT 계약 등록 시 즉시 호환 매핑을 함께 등록 — 그렇지 않으면 고객 포탈에서 소모품 요청이 막힙니다.
- 단종 품목은 매핑을 먼저 끊고 품목 마스터를 휴지통으로 이동.
- 호환 매핑 변경은 감사로그에 그대로 기록되므로 책임 추적 가능.

---

# 7부. 통계 깊이 보기 (`/stats`)

일반 사원에게는 「보기 권한」만 노출되는 4탭 화면(책 A 10부)을 관리자는 **분석·집계·드릴다운** 도구로 활용합니다.

## 7.1 KPI 카드

대시보드 최상단:

| KPI | 산식 |
|---|---|
| **월 매출** | 당월 매출 합계 (회사 스코프) |
| **렌탈 수익** | IT/TM 청구액 + 월 정액 |
| **AS 처리시간 (SLA)** | 접수 → COMPLETED 평균 시간 |
| **재고 회전** | 출고 ÷ 평균 재고 |

## 7.2 SN별 누적 이익 / TCO 분석

`/stats?tab=rental` 의 드릴다운으로 SN 단위 누적 매출 / 누적 비용 / 누적 부품원가 → **SN별 순이익**.

| 컬럼 | 산식 |
|---|---|
| **누적매출** | 그 SN 의 모든 청구·정산 합계 |
| **누적부품** | 그 SN 에 사용된 부품·소모품 원가 합계 |
| **누적운송** | 그 SN 관련 디스패치 운송비 합계 |
| **누적순이익** | 매출 − (부품 + 운송 + 감가) |

이 분석으로 **수익성 낮은 장비**를 식별하고 회수·교체·폐기 의사결정에 활용합니다.

## 7.3 부서·담당자별 실적

`/stats?tab=hr` — 영업담당자별 매출, AS 담당자별 처리량, 부서별 인원·평가점수 분포.

## 7.4 엑셀 export

각 차트 우상단의 **엑셀** 버튼으로 raw 데이터를 .xlsx 로 받습니다. 수치는 통화별로 분리되며, 환율 변환 결과(VND 환산)도 함께 포함됩니다.

---

# 8부. 시스템 운영

## 8.1 인프라 개요

- **호스팅**: Railway (사내 인스턴스 + 고객 포탈 인스턴스 분리)
- **DB**: PostgreSQL (Railway managed)
- **배포**: GitHub `main` 브랜치 push → 자동 빌드·배포
- **빌드 명령**: `prisma db push --accept-data-loss && next build`

## 8.2 두 인스턴스 구조

| 도메인 | 환경변수 | 접속 가능 역할 |
|---|---|---|
| `tellustech-admin-production.up.railway.app` | (PORTAL_MODE 없음) | ADMIN/MANAGER/EMPLOYEE |
| `portal.tellustech.co.kr` | `PORTAL_MODE=true` | CLIENT 만 |

같은 코드베이스 / 같은 DB 를 공유하지만 `PORTAL_MODE` 환경변수로 라우팅이 분기됩니다. 자세한 내용은 `docs/PORTAL_DEPLOY.md` 참조.

## 8.3 환경변수 — 값별 동작 영향

| 키 | 값 / 용도 | **이 값이 시스템에서 하는 일** |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 접속 문자열 | Prisma 가 모든 DB 쿼리에 사용. 두 인스턴스 동일해야 같은 데이터 공유 |
| `JWT_SECRET` | 세션 토큰 서명 키 | JWT 발급·검증. 두 인스턴스가 다르면 한쪽 로그인 후 다른 쪽 진입 시 세션 인식 실패 |
| `ANTHROPIC_API_KEY` | Claude API 키 | 3언어 자동 번역의 모든 호출. 미설정 시 원문 1언어만 저장 (오류 무시 모드) |
| `NODE_ENV` | `production` | Next.js 가 prod 모드로 빌드 — 에러 메시지 최소화, 정적 캐시 활성화 |
| `PORTAL_MODE` | 포탈 인스턴스에만 `true` | proxy 가 비-포탈 라우트(`/admin/*`, `/master/*` 등) 를 모두 차단. 비-CLIENT 세션 자동 거절 |

> **금지**: `.env` 를 git 에 커밋하지 마세요 (`.gitignore` 등록됨). 시크릿 로테이션 시 두 인스턴스를 동시에 갱신.

## 8.4 백업·복원

- **자동 백업**: Railway 의 일일 자동 백업 (보존 기간 7일 — 플랜에 따라 다름).
- **시점 복원**: Railway Dashboard → Database → Backups → 시점 선택 → Restore.
- **수동 백업**: `pg_dump` 로 정기 export (월 1회 권장). 결과물은 회사 내부 안전한 저장소에.

## 8.5 배포·롤백

| 동작 | 방법 |
|---|---|
| **배포** | `main` 브랜치에 push 또는 PR merge → 자동 빌드 |
| **롤백** | Railway Dashboard → Deployments → 이전 빌드 선택 → Redeploy |
| **인스턴스 정지** | 한 인스턴스만 정지(예: 포탈 점검) → 다른 인스턴스 영향 없음 |

## 8.6 모니터링

- Railway Dashboard 의 **Logs** 탭에서 실시간 로그 확인.
- 알림: Railway → Settings → Notifications 에서 배포 실패·크래시 시 이메일·Slack 발송 설정.
- 권장 모니터링 지표: 응답 시간 p95, 에러율, DB 연결 풀 사용률.

---

# 9부. 부록

## 9.1 자동코드 표 (전체)

| 대상 | 형식 | 비고 |
|---|---|---|
| 거래처 | `CL-YYMMDD-###` | 일자별 일련번호 |
| 품목   | `ITM-YYMMDD-###` | 일자별 일련번호 |
| **사원** | **`TNV-###` (TV) / `VNV-###` (VR)** | **회사별 일련번호, YYMMDD 미포함** |
| IT계약 | `TLS-YYMMDD-###` / `VRT-YYMMDD-###` | 회사별 prefix |
| TM렌탈 | `TM-YYMMDD-###` | |
| AS티켓 | `YY/MM/DD-##` | 슬래시 구분 |
| 매출   | `SLS-YYMMDD-###` | |
| 매입   | `PUR-YYMMDD-###` | |
| 평가   | `INC-YYMMDD-###` (사건) / `EVAL-YYMMDD-###` (정기) | |
| 입·퇴사 | `ONB-YYMMDD-###` / `OFF-YYMMDD-###` | |
| 연차   | `LV-YYMMDD-###` | |
| 비용   | `EXP-YYMMDD-###` | |
| 일정   | `SCH-YYMMDD-###` | |
| 라이선스 | `LIC-YYMMDD-###` | |

자동코드 시퀀스는 `code_sequences` 테이블에 회사별·날짜별로 저장됩니다.

## 9.2 회사코드 정책

- `TV` (Tellustech Vina) / `VR` (Vietrental) 2개만 존재.
- 모든 업무 테이블에 `company_code` 필수, 인덱스로 강제.
- 공유 마스터(`clients`, `items`, `warehouses`)는 회사코드 없음 — TV/VR 모두 동일 데이터.
- ADMIN/MANAGER 의 통합조회는 `companyCode='ALL'` 가상값으로 모든 쿼리에 IN 절 자동 주입.

## 9.3 S/N 통합 기준키

- S/N 이 모듈 간 연결고리. 설계 시 S/N 으로 조인 가능해야 함.
- **재고확인 정책**:
  - **STRICT** — IT 렌탈 등록 시. 자사 재고에 SN 이 있어야만 허용.
  - **LOOSE** — TM 렌탈 / 교정 / AS / 매출 / 매입. 외부·고객 지급품 허용 (경고만).
- SN 마스터: `InventoryItem` (S/N 단위 재고 + 상태 + QR + 이력).
- SN 검색 API: `GET /api/inventory/sn/search?q=` (회사 스코프 자동, 옵션 `itemId`, `inStock`).

## 9.4 3언어 자동번역

- 자유서술 필드는 `*_vi/_en/_ko` 3컬럼 + `original_lang`.
- 저장 시 Claude API (`ANTHROPIC_API_KEY`) 가 나머지 2개 언어 자동 번역.
- 적용 대상: AS 증상·내역, 사건평가, 메모, 채팅, 회의록, PR 연락이력, 연차사유, 부서명·거래처명·직원명 등.
- **번역 수정은 관리자만 가능** — 일반 사용자는 원문 수정만 가능.
- 번역 실패 시(API 장애 등) 원문 1개 언어만으로 저장되며, 사용자 화면에서 「원문 보기」로 표시.

## 9.5 서명 (Signature)

- 모바일 손가락 서명 (HTML5 canvas) 지원.
- 컴포넌트: `SignatureCanvas` (인라인) / `SignatureModal` (팝업).
- 저장 형식: PNG data URL (`data:image/png;base64,...`).
- 적용 위치: 고객 포탈 사용량 컨펌, AS 디스패치 완료 시.
- 서명 후에는 해당 행이 잠기는 효과 — 수정 시 새 서명을 받아야 합니다.

## 9.6 문제 해결 빠른 안내

| 증상 | 1차 점검 |
|---|---|
| 「권한 없음」 화면 | UserPermission 매트릭스 — 해당 모듈 `HIDDEN` 인가? |
| 「회사 외 데이터」 메시지 | 사이드바 회사 picker 가 `ALL` 또는 해당 회사인가? |
| 「마감된 월입니다」 | 회계마감(`/admin/closings`) 에서 해제 후 재시도 — 신중히 |
| API 500 에러 반복 | Railway Logs 확인, ANTHROPIC_API_KEY 잔액 확인 |
| 사이드바 메뉴 사라짐 | 권한 매트릭스 변경 후 새로고침 필요 |
| 자동 번역이 한 언어만 저장됨 | ANTHROPIC_API_KEY 확인, Claude API 응답 시간 초과 가능성 |

---

# 10부. 포탈 확장 관리 (NEW — Phase A/B/C/D)

고객 포탈을 단순 AS 도구에서 **고객 lock-in + 마케팅 채널** 로 확장한 신규 모듈 5개. 모두 사이드바 「관리」 그룹에 추가됨.

## 10.1 사이드바 추가 메뉴

| 경로 | 화면 | 기능 |
|---|---|---|
| `/admin/portal-points` | 🏆 포탈 포인트 관리 | 4탭: 단가설정 / 수동지급 / 교환승인 / 이력 |
| `/admin/portal-banners` | 📣 포탈 배너 관리 | OA/TM 슬롯별 한 줄 광고 + 링크 URL |
| `/admin/quotes` | 💬 견적 요청 관리 | 견적 배정 + 발송 + 계약 전환 |
| `/admin/feedback` | 🌟 고객 의견 관리 | 칭찬/개선/제안 답변 (3언어 자동번역) |
| `/admin/portal-posts` | 📰 포탈 게시글 관리 | 7카테고리 CMS + AI 초안 생성 + 발행 토글 |
| `/admin/surveys` | 📊 서베이 관리 | RATING/CHOICE/TEXT 질문 생성 + 결과 집계 |
| `/admin/referrals` | 🤝 추천 관리 | 5단계 상태 + 첫 입금 시 100,000d 트리거 |

## 10.2 포탈 포인트 관리 (`/admin/portal-points`)

### 탭 1: 단가 설정 (ADMIN 만 수정 가능)

15개 사유 (`PointReason` enum) 별 적립 단가:

| 사유 | 기본값 | 비활성 시 |
|---|---|---|
| `AS_REQUEST` | 1,000 | AS 등록해도 적립 안 됨 |
| `SUPPLIES_REQUEST` | 1,000 | |
| `SERVICE_CONFIRM` | 1,000 | |
| `USAGE_CONFIRM` | 1,000 | |
| `QUOTE_REQUEST` | 1,000 | |
| `FEEDBACK_PRAISE/IMPROVE/SUGGEST` | 각 1,000 | |
| `SURVEY_COMPLETE` | 10,000 | (서베이마다 별도 지정 가능) |
| `POST_WRITE` | 1,000 | 커뮤니티 글 작성 |
| `POST_READ_BONUS` | 0 (글마다 지정) | |
| `REFERRAL_CONTRACT` | 100,000 | 첫 입금 시점 |
| `ADMIN_GRANT/DEDUCT` | 0 (수동) | — |
| `REWARD_EXCHANGE` | — (자동 차감) | — |

### 탭 2: 수동 지급/차감

거래처 선택 + 금액 (양수=지급, 음수=차감) + 사유 → 즉시 잔액 반영. 마케팅 행사·보상·환불 처리에 사용.

### 탭 3: 교환 승인

고객이 신청한 `PortalReward(PENDING)` 목록.
- **[승인]** → `APPROVED` (실제 처리 진행)
- **[거절]** → `REJECTED` + 차감된 포인트 자동 환원
- **[지급완료]** → `DELIVERED`
  - INVOICE_DEDUCT 시: 차감 적용할 PayableReceivable ID 입력
  - GIFT_CARD 시: 발송 내역 (기프티콘 번호·메시지 등) 입력

### 탭 4: 전체 이력

모든 적립/차감 검색·필터 (거래처/사유/기간) + 엑셀 다운로드 (Phase 후속).

## 10.3 포탈 배너 (`/admin/portal-banners`)

OA/TM 슬롯별 한 줄 광고 텍스트 + 링크 URL.

```
Slot: OA
KO: 프린터 걱정 없는 올인원 렌탈
VI: Cho thuê máy in trọn gói
EN: All-in-one printer rental
URL: https://tellustech.co.kr/oa
[저장]
```

저장 즉시 모든 고객 포탈에 반영됨. 사용자 언어에 맞는 텍스트가 사이드바 사업부문 헤더 아래에 표시됨.

## 10.4 견적 관리 (`/admin/quotes`)

### 견적 작성 흐름

1. 고객이 `/portal/quotes` 에서 요청 → `status = REQUESTED`, `QR-YYMMDD-###` 발급
2. 영업담당 자동 배정 (Phase 후속) 또는 관리자 수동 배정
3. 관리자가 [견적 작성] 클릭 → 금액 입력 + 메모 (PDF 첨부는 Phase 후속)
4. → `status = QUOTED` 로 전환, 고객 화면에 [수락]/[거절] 활성화
5. 고객 수락 → `ACCEPTED` → IT계약/TM렌탈/매출 폼으로 전환 (Phase 후속)

### 견적 거절·만료 정책

- 거절 (`REJECTED`): 고객이 거절한 견적
- 만료 (`EXPIRED`): 자동 만료 시점 도달 (현재 자동 만료 미구현 — 관리자가 수동 변경)

## 10.5 의견 관리 (`/admin/feedback`)

종류별 (`PRAISE / IMPROVE / SUGGEST`) 의견 목록 + 답변 작성.

### 답변 작성

- 한국어 한 칸만 입력해도 Claude API 가 VI/EN 자동 번역
- 저장 시 `status = REPLIED`, 고객 화면에 답변 박스 추가 표시
- 답변 후에도 추가 답변 (덮어쓰기) 가능

### 칭찬 → 인사평가 연동 (Phase 후속)

칭찬 의견을 클릭 시 [인사평가 연동] 버튼이 표시되어 `Incident(COMMENDATION)` 자동 생성 — 직원 평가 시 가산점 자료로 활용 가능 (현재 수동 연동).

## 10.6 게시글 관리 (`/admin/portal-posts`)

### 카드형 리스트

- 상태 탭: 전체 / 📝 초안 / ✅ 발행됨 (개수 자동 집계)
- 정렬: 최신순 (createdAt desc)
- 카드 클릭 → **편집 모달** (제목 3언어, 본문 KO/VI/EN 탭, 카테고리, 발행, 고정, 보너스 포인트)

### AI 초안 생성

상단 「🤖 AI 초안 생성」 카드:
- 카테고리 select (7종)
- 주제 텍스트 입력 (예: "2026년 5월 베트남 공휴일 안내")
- [🤖 AI 초안 생성] 버튼

내부 동작:
1. Claude haiku-4.5 호출 (system + assistant prefill 으로 JSON 강제)
2. 카테고리별 strict 가이드 (`mustBe / mustNot / tone`) 적용 — 마케팅 탭에서 TIP 같은 무관 콘텐츠 차단
3. `web_search_20250305` 도구 활성화 — 외부 사실 필요 시 자동 검색
4. 응답 파싱 → 한국어 제목·본문·sources 배열
5. fillTranslations 로 VI/EN 자동 번역
6. 본문 끝에 자동 footer 부착:
   ```
   ---
   출처:
   - https://...
   - https://...

   ※ AI 자동 생성 초안 — 발행 전 사실 검증 필요
   ```
7. `isPublished=false`, `isAiGenerated=true` 로 저장
8. 자동으로 「초안」 탭으로 이동 + 방금 만든 글 자동 모달 오픈 → 검토 후 발행

### 🧹 AI 정리 도구

이전 prefill 수정 전에 만들어진 글들이 reasoning 텍스트 + ```json``` 블록을 본문에 그대로 가지고 있을 수 있음.
- 카드에 빨간 ring + ⚠ 정리필요 뱃지 자동 표시
- [🧹 AI 정리] 버튼 클릭 → 본문에서 JSON 추출 → title/body 깨끗하게 교체 → footer 부착 → VI/EN 재번역
- JSON 자체가 없는 케이스는 reasoning 프리앰블 자동 제거 후 그대로 사용
- 모두 실패하면 `[삭제] 후 재생성` 안내

### 카테고리 strict 정책

| 카테고리 | mustBe (반드시) | mustNot (금지) |
|---|---|---|
| MARKETING | 프로모션·이벤트·신상품·CTA 한 문장 포함 | 사용 팁, 회사 일상, 뉴스 요약 |
| COMPANY_NEWS | 인사·조직·신규 사무소·수상 | 외부 뉴스, 마케팅, 사용 팁 |
| KOREA_NEWS | 한국·한인 비즈니스/경제 뉴스 | 텔러스테크 마케팅, 사용 팁 |
| VIETNAM_NEWS | 베트남 정책·공휴일·산업 | 한국 뉴스, 텔러스테크 마케팅 |
| INDUSTRY_NEWS | OA/계측기 시장·신제품·기술 | 텔러스테크 마케팅, 사용 팁 |
| TIP | 사용·관리·문제해결 가이드 | 마케팅, 외부 뉴스, 회사 발표 |
| COMMUNITY | 고객 간 정보 공유 | 공식 발표, 마케팅, 기술 팁 |

## 10.7 서베이 관리 (`/admin/surveys`)

### 서베이 생성

| 필드 | 의미 |
|---|---|
| 제목 (KO/VI/EN) | 자동 번역 |
| 시작일 / 종료일 | 이 기간에만 고객에게 노출 |
| 보상 포인트 | 응답 완료 시 적립 (기본 10,000d) |
| 질문 N개 | RATING (1~5) / CHOICE (단일선택) / TEXT (자유서술) |

### 결과 집계 (Phase 후속)

- RATING: 평균 점수 + 분포 차트
- CHOICE: 선택지별 파이 차트
- TEXT: Claude API 로 자유서술 요약 분석

## 10.8 추천 관리 (`/admin/referrals`)

### 5단계 상태 진행

| 단계 | 액션 | 자동 트리거 |
|---|---|---|
| SUBMITTED | 고객이 등록 | 영업담당 자동 배정 (Phase 후속) |
| CONTACTED | 1차 연락 완료 | 관리자가 변경 |
| MEETING | 영업미팅 진행 | 관리자가 변경 |
| CONTRACTED | 계약 체결 (입금 전) | 관리자가 변경 |
| **PAID** | **첫 입금 발생** | [첫 입금] 버튼 → **+100,000d 자동 적립 + `firstPaymentAt` 기록 + `contractPointId` 저장** |
| DECLINED | 거절·무산 | 관리자가 변경 |

> **자기추천 차단**: 추천 등록 시 `companyName` 이 본인 거래처 `companyNameVi` 와 일치하면 `400 self_referral` 응답.

### 첫 입금 트리거 (중복 방지)

`PAID` 상태로 전환되면:
- `Referral.firstPaymentAt = 지금`
- `Referral.contractPointId = grantPoints 가 만든 PortalPoint.id`
- 같은 추천을 다시 PAID 로 전환하려 하면 `already_paid` 거절

## 10.9 운영 권장 사항

### 포인트 인플레이션 방지

- 단가 설정 변경은 신중히 — 한 번 적립된 포인트는 그대로 남음
- 만료 정책: Phase A 범위 외 (별도 결정 필요 — 베트남 소비자보호법 검토 후)
- 적립 vs 사용 비율 모니터링: 월 1회 4탭 「이력」 에서 합계 추이 확인

### AI 게시글 검증

- AI 초안은 항상 `isPublished=false` 로 생성됨 — 검토 후 발행 토글
- 외부 사실 (베트남 공휴일·한국 경제 등) 은 web_search 출처 URL 클릭해서 확인
- MARKETING 글은 web_search 호출 안 됨 → sources 빈 배열이 정상

### 추천 부정 방지

- 같은 회사명·전화번호 중복 추천 등록되면 수동 검토
- 첫 입금 트리거는 한 추천당 1회만 작동 — 재입금/추가계약은 별도 보상 안 함

---

# 11부. 모바일 운영 안내 (NEW)

## 11.1 PWA manifest 변경 시 주의사항

`public/manifest.webmanifest` 변경 후 사용자가 즉시 반영받도록 하려면:
1. 서비스워커 캐시 이름 bump (`tts-portal-v2` → `v3`)
2. `ASSETS` 배열에서 manifest 제거
3. fetch 핸들러에서 manifest 는 항상 네트워크 우선

배포 후 `controllerchange` 이벤트로 자동 새로고침 → 사용자가 따로 캐시 청소 안 해도 즉시 반영.

## 11.2 PWA 설치된 사용자 (홈 화면 추가)

iOS Safari 의 경우 manifest 가 OS 레벨에서 install 시점에 캐시됨. orientation 같은 값을 변경한 경우:
- 사용자에게 「홈 화면 아이콘 삭제 → Safari 에서 재접속 → 다시 홈 화면 추가」 가이드
- Android Chrome 은 SW 자동 새로고침으로 즉시 반영

## 11.3 화면 회전 잠금 해제

`screen.orientation.unlock()` 호출 — Chrome/Edge 에서 잔여 잠금 해제. iOS Safari 는 미지원이지만 manifest 만 올바르면 OS 가 알아서 회전 허용.
