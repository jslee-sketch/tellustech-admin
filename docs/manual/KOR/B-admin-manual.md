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

### 탭 0: 거래처별 정책 + 포탈 계정 (NEW — 가장 중요)

이 탭은 **포탈 운영의 통합 콘솔** — 포탈 ID 발급/비밀번호 관리 + 포인트 사용 정책을 한 곳에서.

#### 표 컬럼

| 컬럼 | 의미 | 액션 |
|---|---|---|
| 코드 | clientCode | — |
| 거래처명 | KO 우선 표시 | — |
| **포탈 ID** | 발급된 username, 비활성 시 취소선, 미발급 시 ⚠ 표시 | (아래 액션 컬럼) |
| 포인트 잔액 | SUM(PortalPoint.amount) — 거래처 단위 | — |
| 사용 정책 | NONE / INVOICE_DEDUCT_ONLY / GIFT_CARD_ONLY / BOTH | select 즉시 반영 |
| **계정 액션** | [+ ID 발급] / [🔑 비번재설정] / [활성/비활성 토글] | (아래 절차) |

#### 포탈 ID 발급 (신규 거래처 등록 직후 실행)

1. 「⚠ 미발급」 표시된 거래처의 **[+ ID 발급]** 버튼 클릭
2. 프롬프트 1: **포탈 ID** 입력 (비워두면 자동 생성 — `clientcode_portal`, 예: `cl-260101-001_portal`)
3. 프롬프트 2: **초기 비밀번호** 입력 (비워두면 10자리 랜덤 자동 생성)
4. 발급 성공 시 alert 으로 **ID + 임시 비밀번호** 표시
5. **⚠ 비밀번호는 다시 표시되지 않음** — 즉시 복사해서 고객 IT 담당자에게 전달

#### 비밀번호 재설정 (분실 / 정기 변경)

1. 발급된 거래처의 **[🔑 비번재설정]** 버튼 클릭
2. 확인 다이얼로그 — "기존 비밀번호 즉시 무효화" 경고 → 확인
3. 프롬프트: 새 비밀번호 입력 (비워두면 자동 생성)
4. 재설정 후 alert 으로 새 비밀번호 표시 → 즉시 고객에게 전달

#### 활성화 토글

- **비활성화**: 일시 정지 (계약 분쟁·미지급 등). 사용자가 로그인 시도하면 즉시 거절됨. 적립된 포인트는 보존.
- **활성화**: 다시 사용 가능.
- 영구 삭제는 ADMIN 전용 + DELETE API (포인트 이력 충돌 시 비활성화 권장).

#### 포인트 사용 정책 결정

**계약 시점에 거래처별 포인트 사용 방식을 정합니다.** 대기업 컴플라이언스 (개인 상품권 수령 금지 등) 대응을 위해 신중히 설정.

| 정책 | 의미 | 적용 사례 |
|---|---|---|
| **NONE** | 적립만 가능, 교환 불가 (기본값) | 신규 거래처 — 정책 결정 전 |
| **INVOICE_DEDUCT_ONLY** | 청구액 차감만 가능 | 대기업 (Samsung/LG/현대 등) — 개인 수령 차단 |
| **GIFT_CARD_ONLY** | 상품권 수령만 가능 | 중소·SOHO — 청구가 적어 차감 어려운 경우 |
| **BOTH** | 둘 다 선택 가능 | 일반 거래처 |

select 변경 즉시 DB 반영. 다음 고객 로그인부터 적용.

#### 검증

- 고객이 정책에 어긋나는 옵션으로 교환 신청 시 → API `400 policy_violation` 거절
- 정책 = NONE 인 거래처 → 교환 버튼 자체가 비활성화 + "관리자 미설정" 안내
- 잔액은 정책과 무관 — 적립은 항상 동작

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

---

# 12부. SNMP 카운터 자동수집 + 사용량 확인서

복합기·프린터의 인쇄 카운터를 고객사 PC 에 설치한 작은 프로그램(=에이전트)이 자동으로 읽어 ERP 로 전송하고, 매월 그 값으로 **사용량 확인서**(고객 서명용 PDF) → 매출 전표까지 한 흐름으로 처리합니다. 이 부는 **현장에서 누구든 따라 할 수 있는 절차서**입니다.

## 12.0 한 장 요약 — 처음 도입하는 거래처에 무엇을 해야 하나

```
[관리자]                    [관리자/영업]                  [고객사 PC]
1) 모델 OID 등록 ─────┐
                      └──→ 2) 계약·장비 등록·과금 입력 ──→ 3) 토큰 발급
                                                          ↓
                                              4) 에이전트 패키지 다운로드 (ZIP)
                                                          ↓
                                                    5) USB 로 전달 → install.bat
                                                          ↓
                                              6) 첫 수집 확인 (수집 현황)
                                                          ↓
[관리자]
7) 매월: 사용량 확인서 자동 생성 → 고객 알림 → 서명 → PDF → 매출 전표
```

## 12.1 SNMP 관리 화면 (`/admin/snmp`)

화면 진입: 사이드바 → **렌탈** 그룹 → **SNMP 관리**.

세 개의 탭으로 구성됩니다.

### 탭 1 — 모델 OID 관리

복합기·프린터 모델별로 **카운터를 어떤 OID 로 읽을지** 정의합니다. 같은 모델 여러 대는 한 번만 등록.

이미 시드된 6종 (사용 시 그대로 활용):

| deviceModel | 비고 |
|---|---|
| `SAMSUNG_SCX8123` · `SAMSUNG_X7500` | 삼성 컬러 복합기 표준 OID |
| `SINDOH_D330` · `SINDOH_D410` · `SINDOH_D320` | 신도리코 흑백/컬러 |
| `GENERIC_PRINTER` | RFC 3805 표준 OID 만 사용 (브랜드 미상 시 fallback) |

#### 신규 모델 추가 — 단계별

1. **[+ 모델 추가]** 버튼 클릭.
2. 다음 표대로 입력:

| 필드 | 예시 | 어떻게 알아내나 |
|---|---|---|
| `deviceModel` | `BROTHER_HL5470` | 영문 대문자 + 언더바. 같은 모델 여러 대를 한 키로 묶음 |
| `brand` | `BROTHER` | 표시용 |
| `modelName` | `HL-5470DW` | 표시용 |
| `oidTotal` | `1.3.6.1.2.1.43.10.2.1.4.1.1` | **RFC 3805 표준** — 90% 의 프린터가 이 OID 로 총 카운터 응답. 처음엔 이 값 그대로. |
| `oidBw` | (선택) | 흑백 분리 카운터. 사설 OID — 제조사 매뉴얼 / 웹 검색 (예: "Samsung X7500 SNMP OID BW counter") |
| `oidColor` | (선택) | 컬러 카운터. 컬러 모델만 |
| `oidSerial` | `1.3.6.1.2.1.43.5.1.1.17.1` | 표준 S/N OID. 자동 감지 시 사용 |
| `isMonoOnly` | ☑ / ☐ | 흑백 전용이면 체크 → 컬러 OID 무시 |

3. **[저장]**. 즉시 적용 — 신규 장비 등록 시 드롭다운에 노출.

#### 새 모델 OID 검증 방법 (선택, IT 팀)

> 처음 한 대만 검증하면 됨.

1. 그 모델 1대를 임의 IP 로 LAN 에 연결.
2. 어떤 PC 에서 PowerShell:
   ```
   snmpwalk -v2c -c public <프린터IP> 1.3.6.1.2.1.43.10.2.1.4.1.1
   ```
   숫자 응답이 오면 OID 정상. 응답 없으면 SNMP 가 꺼져 있거나 community 가 다름 — 프린터 웹UI 에서 SNMP v2c, community=`public` 활성화.
3. 응답 OID 를 그대로 위 표 `oidTotal` 에 입력.

### 탭 2 — 수집 현황

최근 500건 `SnmpReading` 가 시간 역순으로 표시됩니다.

| 컬럼 | 의미 |
|---|---|
| 수집일시 | 에이전트가 ERP 로 전송 받은 시각 (UTC → KST 표시) |
| 계약 / S/N / 모델 | 어느 장비의 데이터인지 |
| 총 / 흑백 / 컬러 | 누적 카운터 (delta 가 아닌 raw) |
| 방식 | `AGENT` (자동) / `MANUAL` (관리자 수동 입력) |
| 뱃지 | 정상 / **⚠ 리셋** (음수 delta 감지) |

#### "⚠ 리셋" 뱃지가 뜨면 무엇을 하나

1. 해당 장비 IT 계약 상세 → 장비 탭 → **[수정]**.
2. **`resetAt`** 필드에 리셋이 일어난 일자 입력 (예: 메인보드 교체일, 또는 수집된 일자 그대로).
3. 저장 → 다음 사용량 계산부터 그 시점 이후의 카운터만 사용 (이전 값 무시).
4. 메인보드 교체가 아니라 단순 카운터 오류라면 **수동 SnmpReading 입력**으로 보정값을 추가 입력.

### 탭 3 — 장비 토큰

ACTIVE IT 계약별로 그룹핑된 표 — 각 장비당 한 행.

| 컬럼 | 의미 / 액션 |
|---|---|
| 장비 (S/N · 모델) | ItContractEquipment 정보 |
| 토큰 상태 | `없음` / `유효 (만료 D-N)` / `만료` / `폐기됨` |
| 마지막 수집 | `lastReadingAt` (없으면 "—") |
| 액션 | **[🔑 발급]** / **[폐기]** / **[📦 에이전트 패키지 다운로드]** |

#### 토큰 정책

- **장비 토큰** (`tok_*`) — 한 대당 한 토큰. 에이전트가 SNMP 카운터 전송 시 사용.
- **계약 토큰** (`ctr_*`) — 계약당 1개. 에이전트가 새 장비 발견 시 등록 신청에 사용.
- **TTL 60일** — 매 접속 시 슬라이딩 갱신 (자동 연장). 60일 미접속 자동 만료.
- **폐기** — 즉시 무효 (DB `revokedAt` 기록). 해당 에이전트는 다음 전송부터 `401` 거절. **분실/퇴사/계약 종료 시** 사용.

#### [🔑 발급] 버튼

- 미발급 또는 만료 상태 → 즉시 새 UUID 발급. 화면에 1회 노출 후 다시 안 보임 (DB 만 보관).
- 이미 유효 토큰이 있으면 버튼이 [재발급] 으로 바뀌고, 기존 토큰은 폐기됨 + 새 토큰 발급.

### [📦 에이전트 패키지 다운로드]

이 버튼이 **현장 설치의 시작점**입니다. 클릭 시 다음 흐름:

1. ERP 가 `config-{contractCode}.json` 파일 생성 — 계약 토큰 + 장비 토큰 N개 + ERP URL 모두 포함.
2. 브라우저 다운로드.
3. 관리자가 받은 파일 + (별도 보관 중인) `tellustech-agent.exe` + `install.bat` + `uninstall.bat` + `README.txt` 를 **ZIP 으로 묶어** USB 에 복사.

> 보안: `config-*.json` 토큰이 평문 — USB 분실 시 즉시 사이드바 → SNMP → 해당 계약 [폐기] 후 [재발급].

---

## 12.2 신규 거래처 도입 절차 — 단계별 워크 스루

### Step 1. 계약·장비 등록 (영업 / 관리자)

1. 사이드바 → **렌탈** → **IT 계약** → **[+ 신규]** → 계약 등록 (TLS-/VRT-YYMMDD-### 자동발급).
2. 계약 상세 → **장비 목록** 탭 → **[+ 장비 추가]**.
3. 다음 필드는 **SNMP 자동수집을 위해 필수**:

| 필드 | 의미 | 입력 예 |
|---|---|---|
| 품목 (ItemCombobox) | 자사 재고에 등록된 본체 | "Samsung X7500" |
| **S/N** | 자사 재고의 정확한 S/N | `SN-X7500-001` |
| 제조사 | 자유 텍스트 | "SAMSUNG" |
| **deviceModel** (드롭다운) | 12.1 의 모델 OID 키 | `SAMSUNG_X7500` |
| **deviceIp** | 자동 스캔으로 채워짐 — **공란 가능** | (DHCP) |
| **snmpCommunity** | 기본 `public` | 회사 정책 시 변경 |
| **installCounterBw / installCounterColor** | 설치 시점 카운터 | 0 (신품) / 12,345 (중고) |
| **baseIncludedBw / Color** | 월 기본 포함 매수 | 5,000 / 1,000 |
| **extraRateBw / Color** | 추가 단가 (₫/매) | 30 / 200 |

> `deviceIp` 가 비어 있으면 에이전트가 **첫 실행 시 LAN 스캔**으로 자동 감지·DB 갱신.

### Step 2. 토큰 발급 (관리자)

1. 사이드바 → **렌탈** → **SNMP 관리** → 탭 3.
2. 등록한 계약을 펼쳐 각 장비 행 **[🔑 발급]** 클릭.
3. 모든 장비 토큰 발급 완료 확인.

### Step 3. 에이전트 패키지 만들기 (관리자, 본사 PC)

1. 같은 화면 [📦 **에이전트 패키지 다운로드**] → `config-{contractCode}.json` 저장.
2. 본사 PC 에 보관된 마스터 파일 모음을 USB 또는 임시 폴더에 모음:
   - `tellustech-agent.exe` ([GitHub Releases](https://github.com/jslee-sketch/tellustech-admin/releases) 에서 최신 다운로드)
   - 방금 받은 `config-{contractCode}.json` → 파일명을 **`config.json`** 으로 변경
   - `installer/install.bat`
   - `installer/uninstall.bat`
   - `installer/README.txt`
3. 위 5개 파일을 **ZIP 1개로 묶기** → 파일명: `tellustech-agent-{고객사명}.zip`.

### Step 4. 고객사 PC 설치 (현장 방문 / 원격 안내)

#### 사전 확인

- **OS**: Windows 10 / 11 (64bit). Windows Server 도 가능.
- **네트워크**: 그 PC 가 프린터들과 같은 LAN. 인터넷 (ERP 도메인 HTTPS) 접근 가능.
- **권한**: PC 에 관리자 비밀번호 가능한 계정 (UAC 승인 필요).
- **방화벽**: SNMP 송신 (UDP 161) 허용. 사내 방화벽 정책 확인.

#### 설치 흐름

1. ZIP 을 USB 로 PC 로 복사 → 임의 폴더에 압축 해제.
2. **`install.bat` 우클릭 → 관리자 권한으로 실행**.
3. UAC 대화 → "예".
4. 콘솔 화면 (TUI):
   ```
   ╔════════════════════════════════════╗
   ║  TELLUSTECH SNMP AGENT — Setup     ║
   ╚════════════════════════════════════╝
   1. 네트워크 스캔 중... (192.168.1.0/24)
      → 발견된 SNMP 장비 5대
   2. 어떤 장비를 등록할까요? (이 PC 가 담당)
      [1] 192.168.1.10  Samsung X7500  SN: K0123456
      [2] 192.168.1.11  Sindoh D330    SN: D0234567
      ...
      선택 (콤마 구분, all=전체): _
   ```
5. 번호 선택 → ERP 로 등록 신청 → 화면에 등록 결과 표시.
6. 마지막에 자동 silent 모드 진입 → 트레이로 잠적.
7. **`install.bat` 끝에서 `config.json` 자동 삭제** (USB 분실 시 토큰 노출 방지).

#### 설치 위치 / 자동 시작

- 설치 폴더: `C:\Tellustech\` (사용자 권한만 접근 가능)
- 시작프로그램 등록: 부팅 시 `tellustech-agent.exe --silent` 자동 실행
- 로컬 큐 DB: `C:\Tellustech\agent.db` (SQLite — 전송 실패 시 보관, 재시도)

### Step 5. 첫 수집 확인 (관리자, 본사)

1. 설치 완료 5분 이내에 본사 ERP → 사이드바 → SNMP → **탭 2 수집 현황**.
2. 등록한 S/N 들이 **방식=AGENT** 로 행에 추가되어 있는지 확인.
3. **누락된 S/N 이 있으면**:
   - **탭 1 (모델 OID)**: 해당 모델의 OID 가 이 프린터에서 응답하는지 확인 (Step 12.1 의 snmpwalk).
   - **고객사 PC**: 트레이의 에이전트 우클릭 → "상태 보기" (또는 cmd 에서 `tellustech-agent.exe --status`) → 최근 시도 로그 + pending 큐 확인.
   - **방화벽**: 그 PC 에서 `Test-NetConnection <프린터IP> -Port 161 -Information Detailed` (UDP 는 직접 테스트 어려움 → snmpwalk 가 더 확실).

### Step 6. 자동 수집 흐름 (이후 자동)

| 시각 | 동작 | 어디서 |
|---|---|---|
| 매일 00:00 (PC 시간) | `snmpCollectDay` 와 일치하는 장비 만 폴링 | 에이전트 |
| 폴링 성공 | ERP `POST /api/snmp/readings` 전송 → SnmpReading 행 생성 | 에이전트 → ERP |
| 폴링 실패 | 매시간 재시도 5회. 5회 후 heartbeat 에러 보고 | 에이전트 |
| 매시간 | heartbeat (`POST /api/snmp/heartbeat`) — agentVersion / online 시간 | 에이전트 |
| 매일 12:00 (PC 시간) | 자동 업데이트 체크 (`/api/snmp/agent-version`) | 에이전트 |
| 매월 1일 03:00 KST | UsageConfirmation 자동 생성 (`/api/jobs/snmp-usage-check`) | ERP cron |

### Step 7. 매월 사용량 확인서 처리 (12.3 항)

→ 12.3 으로 이동.

---

## 12.3 사용량 확인서 (`/admin/usage-confirmations`)

수집된 카운터로 매월 자동 생성되는 **고객 서명용 확인서** + **매출 전표** 를 만드는 흐름입니다.

### 6단계 워크플로

```
COLLECTED → CUSTOMER_NOTIFIED → CUSTOMER_CONFIRMED → ADMIN_CONFIRMED → PDF_GENERATED → BILLED
   ⬜            🟡                    🟢                  🔵              📄          ✅
   수집완료      고객알림됨            고객CFM완료         관리자CFM        PDF생성       매출연결
```

각 행의 우측 [액션] 버튼은 현재 상태에 맞는 다음 단계만 노출됩니다.

### 자동 생성 (관리자가 손대지 않아도 됨)

매월 ACTIVE IT 계약의 `snmpCollectDay` (기본 25일) **다음 날** 03:00 KST 에 cron 이 동작:
- 그 계약의 모든 장비 SnmpReading 이 도착했나?
  - **모두 도착** → `UsageConfirmation` 자동 생성 (status=COLLECTED).
  - **일부만 도착** → 관리자 검토 큐로 이동 (수동 입력 필요).
  - **전혀 안 옴** → 알림 없음. 다음 날 다시 시도.

### 수기 카운터 입력 (에이전트 미설치 / 일시 장애)

1. 사이드바 → SNMP → 탭 2 → **[+ 수동 입력]**.
2. 계약 / S/N / 흑백·컬러 카운터 입력 → 저장.
3. UsageConfirmation cron 이 그 다음 정해진 시간에 그 데이터로 자동 처리.

### 사용량 계산 공식 (자동)

```
월 사용량(매수)        = 이번 달 카운터 - 지난 달 카운터
초과 사용(매수)        = max(0, 월 사용량 - 기본 포함 매수)
초과 과금(₫)           = 초과 사용 × 추가 단가
청구 합계(₫)           = 월 기본료 + 흑백 초과 과금 + 컬러 초과 과금
```

#### 음수 / 카운터 리셋 처리 (자동)

- 음수가 나오면 (이번 < 지난) → 사용량 0 으로 클립 + `isCounterReset=true` 플래그.
- PDF 에 ⚠ 표시 + 그 줄은 청구 대상에서 자동 제외.
- ItContractEquipment 의 `resetAt` 이 prev~curr 기간 사이라면 prev 무시 (메인보드 교체 등).

#### 첫 달 처리

- prev = 없음 → `installCounterBw / installCounterColor` 를 prev 로 사용.
- 첫 달 청구 = 설치 시점 ~ 첫 검침 사이 사용량.

### 상태별 액션 (각 줄의 우측 버튼)

| 상태 | 노출 버튼 | 클릭 시 일어나는 일 |
|---|---|---|
| ⬜ COLLECTED | **[고객 알림]** | 거래처의 포탈 사용자에게 Notification 생성 + 이메일(설정 시). status → CUSTOMER_NOTIFIED |
| 🟡 CUSTOMER_NOTIFIED | **[재알림]** / **[수동CFM]** | 재알림: 같은 알림 다시 발송. 수동CFM: 메모 필수 (예: "04-26 전화 확인") |
| 🟢 CUSTOMER_CONFIRMED | **[관리자CFM]** | 한 번 더 관리자 검토 후 승인 |
| 🔵 ADMIN_CONFIRMED | **[PDF생성]** | pdf-lib + Noto Sans CJK + 거래처 서명 임베드. status → PDF_GENERATED |
| 📄 PDF_GENERATED | **[📄 PDF]** / **[매출 전표]** | PDF: 다운로드. **매출 전표**: 확인 모달 → Sales 신규 발행 + PayableReceivable(미수금) 자동 생성. status → BILLED |
| ✅ BILLED | **[📄 PDF]** | 잠금 — 더 이상 수정 불가. PDF 만 다시 다운로드 가능 |

### 매월 운영 권장 시나리오

```
1일 03:00  → cron 자동 처리 → 고객사별 1건 COLLECTED 행 생성 (관리자 손 안 댐)
1일 09:00  → 관리자: 모든 COLLECTED 행 [고객 알림] 일괄 클릭
1~5일      → 고객사 포탈 로그인 → 카운터 확인 → 서명 → CUSTOMER_CONFIRMED
6일        → 관리자: 미컨펌 거래처에 [재알림] 또는 [수동CFM] (전화 확인 후)
6일 오후   → 관리자: 모든 CUSTOMER_CONFIRMED 행 [관리자CFM] → [PDF생성] → [매출 전표]
8일        → 청구서 발송 (재경 미수금 모듈에서 PDF 첨부)
```

---

## 12.4 IT 계약 상세 — SNMP 관련 필드 (장비 등록·수정)

ItContractEquipment 의 SNMP 관련 필드 한눈에:

| 필드 | 카테고리 | 비고 |
|---|---|---|
| `deviceIp` | 자동 | 에이전트 첫 실행 시 LAN 스캔으로 갱신. DHCP 변경 시 매번 갱신. |
| `deviceModel` | 등록 시 입력 | SnmpModelOid 의 키 (드롭다운) |
| `snmpCommunity` | 기본 `public` | 회사 정책 시 변경 |
| `deviceToken` / `contractToken` | 시스템 | UUID, DB 만 보관 |
| `deviceTokenExpiresAt` / `RevokedAt` | 시스템 | 60일 슬라이딩 + 폐기 시각 |
| `snmpCollectDay` (계약) | 기본 25 | 1~28 사이만 (31일 없는 달 회피) |
| `installCounterBw` / `Color` | 등록 시 | 첫 달 prev 기준 |
| `baseIncludedBw` / `Color` | 등록 시 | 월 포함 매수 |
| `extraRateBw` / `Color` | 등록 시 | 초과 단가 (₫/매) |
| `resetAt` | 운영 중 입력 | 카운터 리셋 시점. 그 이후 카운터만 사용 |
| `lastReadingAt` | 자동 | 마지막 SNMP 수집 시각 (에이전트 health 모니터) |

---

## 12.5 에이전트 운영 — 일상 / 트러블슈팅 / 업그레이드

### 정상 동작 점검 (월 1회)

1. 사이드바 → SNMP → 탭 3 (장비 토큰).
2. 모든 ACTIVE 장비의 **마지막 수집** 컬럼이 그 달 안에 있는지 확인.
3. 30일 이상 미수집 장비 → 12.5.1 의 트러블슈팅.

### 12.5.1 자주 만나는 문제 — 빠른 진단

| 증상 | 원인 후보 | 조치 |
|---|---|---|
| 마지막 수집 = 한 달 이상 전 | PC 가 꺼져 있음 / 네트워크 단절 | 고객사에 재부팅 안내. 트레이 아이콘 확인 |
| `방식=AGENT` 행이 한 번도 없음 | 토큰 미발급 / config.json 누락 / 폴링 실패 | 탭 3 에서 토큰 상태 확인 → 재발급 → 새 패키지 재배포 |
| 음수/리셋 뱃지 자주 발생 | 장비 카운터가 진짜로 리셋됨 (메인보드 교체 / 점검) | 장비 수정 → resetAt 입력 |
| `SnmpUnregisteredDevice(PENDING)` 에 새 행 등장 | 에이전트가 LAN 에서 새 프린터 발견 | 12.5.2 미등록 장비 큐 처리 |
| 에이전트 자동 업데이트 실패 | AGENT_DOWNLOAD_URL 잘못됨 / GitHub 다운로드 차단 | Railway 환경변수 확인. 사내 방화벽이 github.com 차단 시 사내 미러로 변경 |
| heartbeat 에러: "snmp_timeout" | 프린터 SNMP 꺼짐 / community 다름 | 프린터 웹UI 에서 SNMP v2c · public 활성화 |

### 12.5.2 미등록 장비 큐 (`SnmpUnregisteredDevice`)

에이전트가 LAN 스캔 중 발견했지만 ERP 의 `ItContractEquipment` 에 매칭되지 않은 장비는 PENDING 상태로 큐에 쌓입니다.

처리 방법:
1. 사이드바 → SNMP → (향후) 미등록 큐 탭 — 현재는 DB 직접 조회 (P2.B 후속).
2. 검토 후 둘 중 하나:
   - **신규 장비로 등록** → IT 계약 → 장비 추가 → S/N · IP 입력 → 토큰 발급. 큐 행 status `REGISTERED` 자동 변경.
   - **무시** → status `IGNORED` (예: 사내 사용 프린터)

### 12.5.3 토큰 폐기 시나리오

| 상황 | 조치 |
|---|---|
| 고객사 PC 분실 / 도난 | 즉시 사이드바 → SNMP → 해당 계약 → 모든 장비 토큰 [폐기]. 새 PC 준비 후 [재발급] + 새 패키지 |
| 직원 퇴사 (그 PC 가 그 직원 자리) | [폐기] → 후임 PC 에 [재발급] + 패키지 재배포 |
| 계약 종료 | [폐기] (자동 60일 후 만료되지만 즉시 차단 권장) |

### 12.5.4 에이전트 업그레이드 (관리자, 본사)

#### 새 버전 준비

1. 개발자가 `agent/` 코드 수정 → version bump.
2. 빌드:
   ```
   cd agent
   build.cmd
   ```
   → `agent/build/tellustech-agent.exe` (단일 exe, ~57MB)

#### 배포

```
gh release create v1.0.1-agent agent/build/tellustech-agent.exe \
  --title "SNMP Agent v1.0.1" \
  --notes "버그 수정 / 기능 추가 요약"
```

#### 환경변수 갱신 (Railway 또는 호스팅 콘솔)

| 변수 | 값 |
|---|---|
| `AGENT_LATEST_VERSION` | `1.0.1` (semver) |
| `AGENT_DOWNLOAD_URL` | `https://github.com/jslee-sketch/tellustech-admin/releases/download/v1.0.1-agent/tellustech-agent.exe` |

#### 자동 배포 흐름

- 매일 12:00 (각 PC 시간) 에이전트가 `/api/snmp/agent-version` 호출.
- 응답의 `latestVersion` 이 본인 버전보다 높으면 → exe 다운로드 → `tellustech-agent.exe.pending` 으로 저장.
- 다음 PC 재부팅 또는 install.bat 재실행 시 `.pending` 을 정상 파일로 교체 후 새 버전 실행.

> 강제 즉시 적용이 필요하면 고객사에 PC 재부팅 안내. 재부팅이 어려운 환경은 cmd 에서 `tellustech-agent.exe --restart` 도 가능 (P2.B 후속).

### 12.5.5 Heartbeat 모니터링

- 에이전트가 매시간 `POST /api/snmp/heartbeat` → AgentHeartbeat 테이블에 기록.
- 30일 이상 heartbeat 없음 → 관리자 알림 (P2.B 후속, 현재는 SQL 직접 조회).
- SQL:
  ```sql
  SELECT contract_id, agent_machine_id, MAX(reported_at)
  FROM agent_heartbeats
  GROUP BY contract_id, agent_machine_id
  HAVING MAX(reported_at) < NOW() - INTERVAL '30 days';
  ```

---

## 12.6 보안·정책 요약

- 토큰 평문 저장은 `config.json` 안에서만. ERP DB 에는 평문 보관 (해시 X) — 매번 verify 가 필요해서. 대신 폐기·만료·슬라이딩 갱신으로 risk 관리.
- `config.json` 파일은 install.bat 끝에서 자동 삭제 (USB 분실 시 노출 방지).
- 에이전트 설치 폴더 `C:\Tellustech` 는 그 사용자 권한으로만 접근.
- 토큰 분실 의심 → 관리자가 즉시 폐기 → 재발급 + 새 패키지.
- ERP 측에서 모든 토큰 사용 이력은 `audit_log` 에 기록 (Prisma middleware).

---

## 12.7 기술자 부록 — 명령어·로그·SNMP 패킷 검증

> 이 절은 **현장 IT 기술자 / 사내 IT 팀** 이 사용하는 명령·경로·디버그 절차 모음입니다.

### 12.7.1 에이전트 명령줄 옵션

| 옵션 | 동작 | 사용처 |
|---|---|---|
| `tellustech-agent.exe --setup` | 첫 실행 — 네트워크 스캔 + 사용자 선택 + ERP 등록 | install.bat 가 자동 호출 |
| `tellustech-agent.exe --silent` | 백그라운드 — cron 스케줄러 실행 | 부팅 시 자동 실행 |
| `tellustech-agent.exe --collect` | 즉시 1회 수집 (디버그) | 트레이 미반응 시 직접 실행 |
| `tellustech-agent.exe --status` | 최근 로그 + pending 큐 출력 | 진단 |
| `tellustech-agent.exe --version` | exe 자체 버전 출력 | 업데이트 확인 |

### 12.7.2 파일·폴더 경로

| 경로 | 내용 | 권한 |
|---|---|---|
| `C:\Tellustech\tellustech-agent.exe` | 본체 exe (~57MB, Node18 + pkg) | 사용자 RX |
| `C:\Tellustech\config.json` | erpUrl + contract/device 토큰 (install 후 자동 삭제 → 첫 setup 시 메모리만, 이후 빈 파일 또는 미존재) | 사용자 RW |
| `C:\Tellustech\agent.db` | SQLite — pending 큐 (전송 실패 보관, 재시도 큐) | 사용자 RW |
| `C:\Tellustech\agent.log` | 일별 회전 로그 (info/warn/error) | 사용자 RW |
| `C:\Tellustech\tellustech-agent.exe.pending` | 자동 업데이트 다운로드 임시 파일. 재부팅·재실행 시 본체 교체 후 삭제 | 사용자 RW |
| `C:\Users\<user>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\TellustechAgent.lnk` | 부팅 자동 실행 바로가기 (`--silent`) | 사용자 RW |

### 12.7.3 로그 보기·진단

```cmd
:: 최근 100줄
type C:\Tellustech\agent.log | more

:: 에러만
findstr /I "ERROR WARN" C:\Tellustech\agent.log | more

:: 실시간
powershell -c "Get-Content C:\Tellustech\agent.log -Wait -Tail 50"
```

로그 행 형식:
```
2026-04-28T10:15:32+09:00 [INFO]  poll  192.168.1.10  total=12345 bw=10000 color=2345
2026-04-28T10:15:33+09:00 [INFO]  send  contract=TLS-260101-001  rows=1  ok=200
2026-04-28T10:15:34+09:00 [WARN]  poll  192.168.1.11  snmp_timeout (3s)
2026-04-28T10:15:35+09:00 [ERROR] send  401 unauthorized — token revoked or expired
```

### 12.7.4 pending 큐 직접 조회

전송 실패한 reading 들은 SQLite 큐에 보관됩니다. 시스템 sqlite3 가 있다면:

```cmd
sqlite3 C:\Tellustech\agent.db "SELECT id, equipment_sn, total_pages, attempts, last_error FROM pending ORDER BY id DESC LIMIT 20;"
```

그 후 강제 재전송:
```cmd
tellustech-agent.exe --flush-pending
```

### 12.7.5 SNMP 응답 직접 확인

#### Windows + snmpwalk (Net-SNMP 윈도우 버전 또는 PowerShell)

PowerShell (`SNMP-Tools` 모듈 또는 `Olive.SnmpSharpNet`):
```powershell
# 표준 RFC 3805 총 카운터
$ip = "192.168.1.10"
snmpwalk -v2c -c public $ip 1.3.6.1.2.1.43.10.2.1.4.1.1
# 예상: HOST-RESOURCES-MIB::hrPrinterDetectedErrorState.1 = INTEGER: 12345

# S/N
snmpwalk -v2c -c public $ip 1.3.6.1.2.1.43.5.1.1.17.1
```

#### Linux / WSL (snmpwalk)
```bash
sudo apt install snmp -y
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.2.1.43.10.2.1.4.1.1
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.2.1.43.5.1.1.17.1
```

#### 응답 없을 때 체크리스트

1. PC 와 프린터가 **같은 서브넷** 인가? (`route print` 또는 `ip route`)
2. 프린터 SNMP 가 켜져 있나? 프린터 웹UI → Network → SNMP → **v2c, public, Read 활성화**.
3. 사내 방화벽이 UDP 161 차단? (`Test-NetConnection -ComputerName 192.168.1.10 -Port 161` — UDP 는 직접 안 되니 위 snmpwalk 가 가장 확실)
4. community 가 `public` 이 아니라 회사 정책 (`tellustech` 등)? → 12.1 모델 OID 화면에서 `snmpCommunity` 변경 + 장비 PATCH.
5. 어떤 프린터는 SNMPv1 만 → `-v1` 로 시도. 일부는 v3 만 — 그건 별도 모델 추가 필요.

### 12.7.6 패킷 캡처로 끝까지 검증 (최후 수단)

```
1. 그 PC 에서 Wireshark 또는 tcpdump (WSL) 설치
2. 필터: udp.port == 161 and ip.addr == <프린터IP>
3. snmpwalk 실행
4. SNMP GetRequest / GetResponse 가 둘 다 보이는가?
   - GetRequest 만 보임 → 프린터가 응답 안 함 (방화벽 / SNMP off / community 다름)
   - 둘 다 보이지만 응답이 noSuchObject → OID 다름 (모델 OID 검증)
   - 응답이 정상 INTEGER → 모든 게 OK. 에이전트 측 문제 (config.json / 토큰)
```

### 12.7.7 트레이/서비스 모드 (현재 vs 후속)

현재 (v1.0.x):
- **사용자 세션** 기반. 부팅 후 그 사용자가 로그인해야 자동 실행 (Startup 바로가기).
- 한 PC 의 한 사용자 계정에만 동작. 그 PC 가 로그아웃 상태면 수집 중단.

향후 (v2.0 예정):
- **Windows Service** 모드. 사용자 로그인 무관 항상 동작.
- `nssm install TellustechAgent C:\Tellustech\tellustech-agent.exe --silent` 로 등록 가능 (NSSM 사용 시).

> 현재는 PC 가 항상 켜져 있고 그 자리 사용자가 거의 로그인 상태인 환경에 최적화. 24/7 무인 환경은 향후 service 모드 사용 권장.

### 12.7.8 ERP 측 진단 엔드포인트

| Endpoint | 용도 | 인증 |
|---|---|---|
| `GET /api/snmp/agent-version` | 최신 exe 버전 + 다운로드 URL | 없음 (정적) |
| `POST /api/snmp/heartbeat` | 에이전트가 매시간 호출 | `Authorization: Bearer <contractToken>` |
| `POST /api/snmp/readings` | 에이전트가 카운터 전송 | `Authorization: Bearer <deviceToken>` |
| `POST /api/snmp/register-devices` | 에이전트가 새 발견 장비 등록 신청 | `Authorization: Bearer <contractToken>` |

본사에서 진단 시 (브라우저 또는 curl):
```bash
# 최신 버전 정보
curl https://tellustech-admin-production.up.railway.app/api/snmp/agent-version

# 토큰 유효성 (200 = 유효, 401 = 폐기/만료)
curl -X POST https://.../api/snmp/heartbeat \
  -H "Authorization: Bearer ctr_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"agentVersion":"1.0.0","agentMachineId":"test"}'
```

### 12.7.9 자주 보는 ERP 측 SQL (관리자 콘솔 / IT 팀 직접)

```sql
-- 최근 24시간 수집 받은 장비
SELECT contract_id, equipment_id, MAX(collected_at) AS last
  FROM snmp_readings
  WHERE collected_at >= NOW() - INTERVAL '1 day'
  GROUP BY contract_id, equipment_id
  ORDER BY last DESC;

-- 30일 이상 수집 없는 장비 (heartbeat 모니터)
SELECT eq.id, eq.serial_number, c.contract_number, eq.last_reading_at
  FROM it_contract_equipment eq
  JOIN it_contracts c ON eq.it_contract_id = c.id
  WHERE c.status = 'ACTIVE' AND eq.removed_at IS NULL
    AND (eq.last_reading_at IS NULL OR eq.last_reading_at < NOW() - INTERVAL '30 days')
  ORDER BY eq.last_reading_at NULLS FIRST;

-- 토큰 만료 임박 (D-7 이내)
SELECT serial_number, device_token_expires_at
  FROM it_contract_equipment
  WHERE device_token_revoked_at IS NULL
    AND device_token_expires_at < NOW() + INTERVAL '7 days';

-- 카운터 리셋이 자주 발생한 장비 (관리자 정합성 점검)
SELECT equipment_id, COUNT(*) AS reset_count
  FROM snmp_readings
  WHERE is_counter_reset = TRUE
    AND collected_at >= NOW() - INTERVAL '90 days'
  GROUP BY equipment_id
  HAVING COUNT(*) >= 3
  ORDER BY reset_count DESC;
```

# 13부. 소모품 적정율 분석 (NEW)

토너·드럼 등 소모품 투입량 대비 SNMP 실제 출력량을 비교해 효율성·재고 신호·**부정 사용 의심**을 자동 감지하는 모듈.

## 13.1 핵심 공식

```
기대 출력량 = 투입수량 × 정격출력장수 × (기준상밀도 ÷ 실제상밀도)
적정율(%)   = 실제출력량 ÷ 기대출력량 × 100
```

- **흑백(B/W)**: Black 토너·Drum·Fuser 합산
- **컬러(C)**: C/M/Y 그룹별 합산 후 **MIN** (1 페이지 = C+M+Y 동시 소모) — 한 색이라도 미투입이면 컬러 분석 대상에서 제외

### 뱃지 5단계

| 적정율 | 뱃지 | 의미 | 자동 액션 |
|---|---|---|---|
| 120% 이상 | 🔵 BLUE | 토너 부족 — 추가 투입 필요 | (확장 예정) 재발주 알림 |
| 80~119% | 🟢 GREEN | 정상 | 없음 |
| 50~79% | 🟡 YELLOW | 주의 — 과다 투입 의심 | 모니터링 |
| 30~49% | 🟠 ORANGE | 경고 — 사유 확인 | 관리자 알림 |
| 30% 미만 | 🔴 RED | 부정 의심 | 관리자 알림 + audit_log 자동 기록 + isFraudSuspect=true |

임계값은 `/admin/yield-analysis` 의 **설정** 탭에서 조정 가능 (단조감소 검증).

## 13.2 사전 작업 — 품목 마스터 yield 입력

1. **품목 마스터** → CONSUMABLE 또는 PART 유형 → 편집  
2. "출력 관련 (소모품)" 섹션 입력:
   - **정격 출력 장수** (제조사 공표, 5% 상밀도 기준): 예 25,000
   - **기준 상밀도 (%)**: 기본 5

> 입력 안 하면 적정율 계산에서 해당 부품은 무시됨. 시드는 기존 토너·드럼 자동 매핑됨 (build-in 패턴).

## 13.3 사전 작업 — 장비별 실제 상밀도

IT계약 상세 → **장비 목록** 탭 → 각 행의 **"실제 상밀도"** 컬럼에 인라인 입력 (1~100%).
- 기본 5% — 일반 사무 환경.
- 사진/그래픽 다출력 고객은 10~15% 등으로 조정.
- 적정율 재계산 시 즉시 반영.

## 13.4 적정율 계산 실행

### 자동 — 매월 cron
- `/api/jobs/yield-analysis-monthly` (매월 1일 02:00 KST)
- 전월 ACTIVE 계약의 모든 장비에 대해 일괄 계산.
- SNMP reading 또는 AsDispatchPart 가 1건이라도 있으면 분석 대상.
- RED 뱃지 → 모든 ADMIN 사용자에게 자동 알림 (`YIELD_FRAUD_SUSPECT` 타입, 3언어).

### 수동 — 단일 장비 재계산
IT계약 → 장비 목록 행 → 📊 버튼 → 직전 6개월 기간 계산.

### 수동 — 동기 일괄 (테스트/관리)
```
curl -X POST "<host>/api/jobs/yield-analysis-monthly?sync=1&targetMonth=2026-04" \
  -H "Authorization: Bearer $CRON_SECRET"
```
응답: `{ total, created, fraudCount, skippedNoData }`

## 13.5 대시보드 (`/admin/yield-analysis`)

### 탭 1 — 전체 현황
- **계약 단위 그룹 뷰**: 계약번호 행 클릭 시 ▾ 펼쳐져 장비 S/N 행 표시.
- 그룹 행은 계약 내 **최저 적정율** + 부정 의심 건수 노출.
- 정렬: 최저 적정율 오름차순 (위험한 것 먼저).
- **검색·필터**: 계약번호 / 거래처 / 장비 S/N / 기간 시작·종료 / 뱃지(5단계) — 부분일치, **초기화** 버튼.

### 탭 2 — 부정 의심 관리
- isFraudSuspect=true 만 표시 + 위 검색·필터 동일 동작.
- 행 액션 [조사 메모] → 모달에서 메모 입력 → 저장 시 fraudReviewedById/At 자동 기록.
- 한번 조사 완료 후에도 [조사 결과] 로 메모 수정 가능.

### 탭 3 — 거래처별 통계
- 거래처별 분석 건수, 평균 적정율, 부정 의심 건수.
- (향후 AsDispatchPart.dispatchEmployee 기반 **기사별 통계** 로 확장 예정)

### 탭 4 — 설정
- BLUE/GREEN/YELLOW/ORANGE 임계값 + 부정 알림 임계값 조정.
- 단조감소 검증 (Blue > Green > Yellow > Orange > 0).

## 13.6 매출 현황 적정율 컬럼

`/sales` 매출 리스트 — RENTAL 프로젝트 매출에만 거래처 단위 **최저 적정율** 노출:
- `B/W 🟢 90%  C 🟢 90%` 형식 (B/W=흑백, C=컬러)
- 같은 거래처의 IT계약 장비들 중 가장 우려되는 값 기준
- 클릭 시 적정율 대시보드로 이동
- TRADE/MAINTENANCE 등 비-RENTAL 매출은 "—"

## 13.7 알림

부정 의심 발생 시 모든 ADMIN 사용자에게 `Notification` 자동 생성:
- 제목: `소모품 적정율 이상 감지 — {S/N}`
- 본문: 계약번호, 거래처, 흑백/컬러 적정율
- 링크: `/admin/yield-analysis?id={analysisId}`
- 3언어 (vi/en/ko) 동시 저장

## 13.8 데이터 모델 요약

| 모델 | 역할 |
|---|---|
| `Item.expectedYield`, `yieldCoverageBase` | 품목별 정격·기준 |
| `ItContractEquipment.actualCoverage` | 고객별 실제 상밀도 (기본 5) |
| `ItContractEquipment.lastYieldRateBw/Color/CalcAt` | 마지막 계산 캐시 (정렬·필터용) |
| `YieldAnalysis` | 분석 이력 (기간·실제·기대·뱃지·부정·조사메모) |
| `YieldConfig` | 임계값 설정 (단일 row, id="default") |
| `YieldBadge` enum | BLUE / GREEN / YELLOW / ORANGE / RED |
| `NotificationType.YIELD_FRAUD_SUSPECT` | 부정 의심 알림 타입 |

---

# 14부. 다운로드 / 업로드 — 관리자 책임 영역

A 매뉴얼 부록 D 가 일반 사용자 중심이라면, 본 장은 **관리자만 접근 가능한 다운로드/업로드** + **전체 일괄 작업의 운영 정책**을 다룹니다.

## 14.1 ECOUNT 마이그레이션 import (`/admin/ecount-import` — 비공개 도구)

**용도**: 기존 ECOUNT ERP 의 거래처/품목/매출/매입 마스터를 한 번 통째로 가져오기.

**파일 형식**: ECOUNT export XLSX 그대로. 헤더 한국어 (`거래처코드`, `품목명`, `구분`, `카테고리` 등).

⚠️ **1회 한정 도구**. 운영 중 정기 import 미지원 — ECOUNT 값을 수정한 후 재 import 해도 동기화 안 됨. 이미 import 된 거래처는 itemCode/clientCode 로 식별되어 PATCH 처럼 업데이트 가능하지만, 의도하지 않은 덮어쓰기 위험.

⚠️ **회사코드 명시 필요**. ECOUNT 데이터가 TV/VR 어느 회사인지 import 직전에 선택. 잘못 선택하면 이후 정정에 시간 듬뿍.

💡 **꿀팁**:
- **데이터 정제 먼저**. ECOUNT 거래처 중 휴면·중복은 import 전에 ECOUNT 측에서 정리.
- **dry-run** (3 행만) 으로 먼저 확인. 컬럼 매핑이 맞는지 (`구분=PRODUCT/CONSUMABLE/PART`, `카테고리=description`).
- **순서 지키기**: 거래처 → 품목 → 매입 → 매출. 매출이 먼저 들어가면 거래처 미존재로 거절.

## 14.2 SNMP 에이전트 패키지 다운로드 (`/admin/snmp` 탭3)

**용도**: 고객사 PC 에 설치할 ZIP 묶음 만들기.

⚠️ **`config-{contractCode}.json` 은 평문 토큰 포함**. USB 분실 시 즉시 그 계약의 모든 장비 토큰 [폐기].

⚠️ **install.bat 은 끝에서 config.json 자동 삭제** — 그 PC 에서 재설치 필요 시 새로 패키지 받아야 함.

⚠️ **에이전트 exe (~57MB)** 는 GitHub Releases 에서 별도 보관. 패키지 만들 때마다 매번 다운로드 X — 본사 PC 한 곳에 보관 후 재사용.

💡 **꿀팁**:
- **계약 단위로 ZIP 1개**. 한 거래처에 여러 PC 가 있으면 같은 ZIP 사본 사용 가능 (계약 토큰은 같음, 장비 토큰만 다름).
- **체크섬 비교** 권장: GitHub Release 페이지의 SHA256 vs 내려받은 exe 비교.
- **버전 표기**: ZIP 파일명에 `tellustech-agent-{고객사}-v1.0.0.zip` 처럼 버전 박아 두기.

## 14.3 사용량 확인서 PDF (`/admin/usage-confirmations`)

**용도**: 고객 서명용 월별 사용량 PDF + 매출 전표 첨부.

⚠️ **PDF 생성 후에는 카운터 수정 불가**. PDF 생성 직전이 마지막 검토 기회.

⚠️ **Noto Sans CJK 폰트 임베드**. 한국어·베트남어 모두 PDF 에 정상 표시되어야 함. 폰트 파일 누락 시 □□□ 박스로 출력 — 이 경우 IT 팀 호출.

💡 **꿀팁**:
- **2주마다 한 번 일괄 처리**: 월초 자동 cron → 5일 고객 컨펌 → 6일 일괄 [관리자 CFM] → [PDF 생성] → [매출 전표]. 업무 흐름이 깔끔.
- **고객 미컨펌 처리**: 5일 이상 미컨펌 시 [재알림] 또는 전화 후 [수동CFM] (메모 필수). PDF 에 "전화 확인" 메모 노출.

## 14.4 적정율 리포트 (`/admin/yield-analysis`)

⚠️ 현재는 화면 조회만. CSV/엑셀 export 는 향후 추가 (백로그).

💡 **꿀팁**: 화면에서 「부정 의심 관리」 탭 → 행 우클릭 → 페이지 인쇄 (사이드바 자동 숨김 — 12.1 참조) 로 임시 PDF 생성 가능.

## 14.5 감사로그 export (`/admin/audit-logs`)

⚠️ **대용량 주의**. 1년치는 수백만 행 가능. 검색 필터 적용 후 export 권장.

⚠️ **export 권한 별도**. 일반 ADMIN 도 로그 조회는 가능하지만 export 는 별도 권한 부여 필요 (정보보호).

💡 **꿀팁**:
- **회계 마감 직후** 그 월의 감사로그를 백업 export. 외부 감사 대비.
- **보관 기간**: 최소 5년 (베트남 회계법). DB 안에 무한 보관되지만, 30일치를 분기마다 별도 S3/외부 백업 저장소로 떼어 두기 권장.

## 14.6 공통 운영 정책

| 작업 | 권한 | 빈도 |
|---|---|---|
| ECOUNT import | ADMIN | 1회 (마이그레이션 시) |
| 거래처/품목/매출 일괄 업로드 | MANAGER+ | 필요 시 |
| 사용자 계정 일괄 등록 | ADMIN | 분기 1회 (신규 입사 일괄) |
| 권한 매트릭스 일괄 변경 | ADMIN | 인사 발령 시 |
| SNMP 에이전트 패키지 | MANAGER+ | 신규 거래처 도입 시 |
| 사용량 확인서 PDF | MANAGER+ | 매월 1회 일괄 |
| 감사로그 export | ADMIN (별도 권한) | 외부 감사 / 회계 마감 시 |
| DB 전체 백업 (Railway 콘솔) | DevOps | 매일 자동 |

⚠️ **모든 일괄 작업은 audit_log 에 자동 기록**. 누가 언제 무엇을 일괄 변경했는지 추적 가능.

⚠️ **부분 실패 후 재업로드** 시: 같은 코드(`itemCode/clientCode/salesNumber`) 가 있으면 upsert 동작 (덮어쓰기). 의도치 않은 덮어쓰기 방지를 위해 import 전 백업 export 권장.

---

# 15부. Mock 매출 워크플로 (NEW — 2026-04 말 도입)

매월 자동 발행되는 DRAFT 매출 + 페르소나(기술/영업/재경)별 액션 흐름.

## 15.1 핵심 개념

매월 1일 09:00 KST cron `/api/jobs/rental-mock-sales-monthly` 가:
- 전월 기준 ACTIVE IT 계약 + 진행 중 TM 렌탈 모든 건에 **DRAFT Sales** 1건씩 자동 발행 (멱등).
- IT 매출 = 기본료 임시 입력, 추가 사용량은 0 (UC ADMIN_CONFIRMED 후 자동 채움).
- TM 매출 = 모든 라인 합산.

cron-job.org 등록 정보: 14부 참조.

## 15.2 4단계 뱃지 + 자동 진행

| 단계 | 조건 | 자동 전환 트리거 |
|---|---|---|
| 🟡 TECH | `isDraft=true && !technicianReady` | (IT) 사용량 확인서 ADMIN_CONFIRMED 시 → 🟠 |
| 🟠 SALES | `isDraft=true && technicianReady` | 영업 [매출 발행] 클릭 → 🔵 |
| 🔵 FINANCE | `!isDraft && !financeConfirmedAt` | 재경 [CFM] 클릭 → 🟢 |
| 🟢 DONE | `financeConfirmedAt!=null` | (회계 마감 대상) |

> TM 은 SNMP 흐름 없으므로 cron 발행 시점부터 `technicianReady=true` → 🟠 직행.

## 15.3 신규 화면

- `/sales` — 단계 KPI + 단계 셀렉트 + 컬럼 뱃지 + "내 액션 필요" 필터
- `/sales/[id]` — 상단 단계 뱃지 + [🟠 매출 발행] / [🔵 재경 CFM] / [재경 잠금 해제] 버튼
- `/finance/sales-confirm` — 🔵 단계 매출만 모아서 체크박스 **일괄 CFM**

## 15.4 신규 API

- `POST /api/jobs/rental-mock-sales-monthly?sync=1&targetMonth=YYYY-MM` — cron + 동기 옵션
- `POST /api/sales/[id]/confirm` — 영업 발행 (PR 자동 발행)
- `POST /api/sales/[id]/finance-confirm` — 재경 CFM (lock)
- `DELETE /api/sales/[id]/finance-confirm` — ADMIN 만 lock 해제
- `POST /api/rental/it-contracts/[id]/terminate` — 조기 종료 (장비 회수 + 미래 DRAFT 삭제)
- `POST /api/rental/tm-rentals/[id]/terminate` — TM 동일

## 15.5 백필 스크립트

과거 월 1회성 채움:
```
DATABASE_URL=... npx tsx scripts/backfill-mock-sales.ts 2026-01 2026-02 2026-03
```

---

# 16부. 거래처 포탈 계정 관리 (NEW)

기존: API 만 있고 UI 없음 → 거래처 상세 페이지에 카드 추가됨.

## 16.1 위치

`/master/clients/[id]` 진입 → 하단 카드 **🔐 고객 포탈 계정**.

## 16.2 액션

- **계정 없음** → `[+ 계정 발급 (ID = {clientCode})]` — username = clientCode, 비번 기본 `1234`, mustChangePassword=true.
- **계정 있음** →
  - 로그인 ID / 상태 / 마지막 로그인 / 기본비번 사용 중 표시.
  - **🔑 비밀번호를 1234 로 리셋** — 고객이 분실 시.
  - **🚫 비활성화 / ✅ 활성화** — 계약 종료 등.

## 16.3 직원 비번 리셋

`/admin/permissions` → 좌측 사용자 선택 → 헤더 **🔑 비번 리셋 (1234)** 버튼.
- ADMIN 만 가능, 비번 `1234` + mustChangePassword=true.

## 16.4 비번 정책 변경 이력

- 옛 정책: `username = "{clientCode}-portal"`, 비번 임의
- 현재 정책: `username = clientCode`, 비번 기본 `1234`, 첫 로그인 시 강제 변경

> 옛 ID(`xxx-portal`) 로 로그인이 안 되는 거래처는 16.1 의 [재발급] 또는 [비밀번호 리셋] 으로 즉시 해결.

---

# 17부. 재고 현상태 기술 (NEW)

InventoryItem 에 신규 필드:
- `stateNoteVi / stateNoteEn / stateNoteKo` — 자유 텍스트 (저장 시 3국어 자동 번역).
- `stateNoteOriginalLang` — 입력 원문 언어.

양품/불량 분류는 기존 `status` enum 그대로:
- 🟢 **양품** = `NORMAL`
- 🔴 **불량** = `NEEDS_REPAIR` / `PARTS_USED` / `IRREPARABLE`

UI 노출은 후속 — 현재는 schema + 기존 Remark 모달 + status 변경으로 처리 가능.

---

# 보강 1 — SNMP¹⁰ 자동수집 (심층)

> ¹⁰ SNMP = Simple Network Management Protocol. 네트워크 장비의 상태·카운터를 표준 OID 로 조회하는 프로토콜.

## 전체 워크플로 (관리자 관점)

```
[1] 고객사에 Windows Agent 설치 (admin 다운로드 → 토큰 발급)
       │
       ▼
[2] Agent 가 매시간 프린터 SNMP polling (총 페이지 카운터 등)
       │
       ▼
[3] /api/snmp/ingest 로 카운터 전송 (토큰 인증)
       │
       ▼
[4] DB 에 SnmpReading 저장 (S/N + timestamp + 카운터값)
       │
       ▼
[5] 매월 1일 02:00 KST cron: 사용량 확인서 6단계 워크플로
        ① 전월 카운터 차이 계산
        ② Item.expectedYield 와 비교
        ③ 적정율 산출 → YieldAnalysis 저장
        ④ YieldBadge 부여
        ⑤ 부정 의심 시 ADMIN 알림 (3언어 자동번역)
        ⑥ PDF 생성 → /admin/usage-confirmations 에 저장
       │
       ▼
[6] 고객 포탈 (또는 이메일) 로 PDF 전송 → 청구서 첨부
```

## 토큰 관리

- 발급: `/admin/snmp` → `[+ Agent 발급]` → 고객별 1토큰. 발급 시 1회만 노출 (재조회 불가).
- 폐기: `[Revoke]` → 즉시 `tokenRevokedAt` 스탬프. Agent 401 응답 받음.
- 재발급: 폐기 후 `[+ 재발급]` → 새 토큰. 고객사에 전달 필요.

## Agent 자동 업데이트

- GitHub Releases 의 최신 `.exe` URL 을 `/api/snmp/agent-version` 이 반환.
- Agent 가 시작 시 / 매일 한 번 비교 → 신 버전이면 다운로드 후 자동 재시작.

## 예외 처리

| 상황 | 시스템 동작 | 관리자 조치 |
|---|---|---|
| Agent 가 24시간 연락 두절 | 알림 (`SNMP_AGENT_OFFLINE`) | 고객사에 PC 재시작 안내 |
| 카운터 역행 (≤ 이전값) | reading 무시 + 로그 | 프린터 교체/펌웨어 의심 |
| 전월 데이터 0건 | 사용량 확인서 SKIP | 고객 수동 보고 요청 |

---

# 보강 2 — 소모품 적정율 분석 (`/admin/yield-analysis`)

## 핵심 개념

각 토너 카트리지의 **정격 출력장수**(`Item.expectedYield`) 대비 **실 출력 페이지**(SNMP 카운터)를 비교 → **적정율**(yieldRate) 계산.

```
적정율 = (실제 출력 페이지) / (정격 출력장수 × yieldCoverageBase 보정) × 100%
```

| 적정율 | 배지 | 의미 |
|---|---|---|
| ≥ 90% | 🔵 BLUE | 매우 양호 (정상 사용) |
| 70~89% | 🟢 GREEN | 양호 |
| 50~69% | 🟡 YELLOW | 주의 |
| 30~49% | 🟠 ORANGE | 경고 |
| < 30% | 🔴 RED | **부정 의심** — ADMIN 자동 알림 |

> **컬러 토너 공식** (시안+마젠타+옐로우 동시 소모): 1 페이지 = C+M+Y 모두 1장씩 → 적정율 계산 시 `MIN(sum_C, sum_M, sum_Y)` 사용.

## 4탭 대시보드

| 탭 | 용도 |
|---|---|
| **전체 현황** | 계약별 그룹 + 평균 적정율 |
| **부정 의심** | RED 배지만 필터. 조사 완료 표시 가능 |
| **기사별 통계** | 향후 확장 — 현재는 거래처별 |
| **설정** | 임계값(BLUE/GREEN/YELLOW/ORANGE) 조정. 단조감소 유지 |

## 임계값 변경

`/admin/yield-analysis` → **설정** 탭 → 슬라이더 또는 직접 입력. 저장 시 다음 월간 cron 부터 적용.

> 임계값은 **단조감소** 여야 함 (BLUE > GREEN > YELLOW > ORANGE > 0). 위반 시 저장 거부.

## 부정 의심 워크플로

1. 매월 1일 cron 이 RED 자동 검출.
2. ADMIN 들에게 `NotificationType.YIELD_FRAUD_SUSPECT` (3언어).
3. `/admin/yield-analysis` → **부정 의심** 탭 → 행 펼치기 → 카운터 이력 확인.
4. 조사 후 `[조사 완료]` 클릭 → `fraudReviewedAt` + `fraudReviewNote` 기록.

---

# 보강 3 — 고객 포탈 운영 (Phase A·B·C·D)

## 4개 Phase 개요

| Phase | 화면 | 의미 |
|---|---|---|
| **A** | `/admin/portal-points` | 포탈 포인트 — 매출액 기준 자동 적립 + 수동 조정 |
| **B** | `/admin/portal-banners` | 포탈 배너 — 3언어 텍스트 + 이미지 스케줄 |
| **C** | `/admin/portal-posts` | 포탈 게시글 — AI 초안 생성 + 검토 후 발행 |
| **D** | `/admin/feedback` + `/admin/surveys` + `/admin/referrals` | 고객 의견·서베이·업체 추천 |

## Phase C — AI 게시글 자동 생성

- **월요일 09:00 KST** cron `/api/jobs/portal-news-generate` 가 자동 실행.
- 매출 데이터, 적정율 통계, 신규 고객 등 수치를 Claude API 에 전달.
- 3언어(VI/EN/KO) 초안 동시 생성 → `draft` 탭에 저장.
- 관리자가 검토 후 `[발행]` 클릭 → 고객 포탈에 노출.

## Phase D 운영

- **고객 의견** (`/admin/feedback`): 고객이 포탈에서 보낸 1줄 의견. 카테고리·중요도 라벨링 후 회의 안건 등재 가능.
- **서베이** (`/admin/surveys`): 분기별 NPS 등 정기 조사. 응답률 + 점수 트렌드.
- **업체 추천** (`/admin/referrals`): 기존 고객이 추천한 신규 업체. 첫 입금 발생 시 추천인에게 포인트 지급.

---

# 보강 4 — 재고 4축 진리표 (관리자용 심층)

`A-supplement-2026-05.md` 의 6.2 절을 참조하되, 관리자가 알아야 할 추가 사항:

## ClientRuleOverride

특정 거래처에 대해 **BASE_RULES 의 일부 행을 덮어쓰기** 할 수 있습니다.

```sql
-- 예: ABC 거래처는 외주수리 후 회수해도 매입후보 자동 생성하지 않도록.
INSERT INTO "ClientRuleOverride" (clientId, referenceModule, overrideJson)
VALUES ('client_abc', 'REPAIR', '{"autoPurchaseCandidate": false}');
```

UI 는 추후 추가 예정. 현재는 DB 직접 변경.

## 진리표 변경 절차

1. `src/lib/inventory-rules.ts` 의 `BASE_RULES` 객체 수정.
2. `SubKind` 타입 확장 시 i18n 콤보 라벨 추가.
3. `transaction-new-form.tsx` `COMBOS_BY_TYPE` 업데이트.
4. `/api/inventory/sn/[sn]/state` 추천 로직 보강.
5. E2E 테스트 (`scripts/test-inv-e2e.ts`) 시나리오 추가.

> 룰 추가 시 **autoPurchaseCandidate / autoSalesCandidate** 가 PR DRAFT 자동 생성을 트리거합니다. 회계 흐름 검증 필수.

---

# 보강 5 — 회계 마감 (`/admin/closings`)

## 마감 동작

매월 단위(`YYYY-MM`)로 4종 레코드를 일괄 잠금:

| 잠금 대상 | 효과 |
|---|---|
| `Sales` | 매출 수정·삭제 차단 |
| `Purchase` | 매입 수정·삭제 차단 |
| `InventoryTransaction` | 입출고 수정·삭제 차단 |
| `PayableReceivable` | 미수금/미지급금 수정·삭제 차단 |

각 레코드에 `lockedAt = now()`, `lockReason = "회계 마감 YYYY-MM"` 자동 스탬프.

## 잠금 해제

원칙적으로 마감 후 해제 불가. 단, 긴급 시 ADMIN 권한으로 `/admin/closings` → 해당 월 → **[잠금 해제]** → `lockedAt = NULL`. 모든 변경은 `audit_log` 에 기록.

---

# 보강 6 — 권한관리 (`/admin/permissions`)

## 역할(Role) 기반

| Role | 의미 |
|---|---|
| `ADMIN` | 시스템 전체 (회사 통합조회 가능) |
| `MANAGER` | 회사 내 모든 모듈 |
| `EMPLOYEE` | 자신의 데이터 + 부서 내 일부 모듈 |
| `CLIENT` | 고객 포탈 전용 (별도 인증) |

## allowedCompanies

각 사용자의 `allowedCompanies` 컬럼:
- `["TV"]` 또는 `["VR"]` → 해당 회사만
- `["TV","VR"]` → 통합 조회 가능 (사이드바 ALL 버튼 노출)

회사 전환 시 모든 SQL 쿼리에 `WHERE company_code = :session` 자동 주입.

---

# 보강 7 — 감사로그 (`/admin/audit-logs`)

## 자동 기록 대상

모든 업무 테이블의 INSERT / UPDATE / DELETE:
- 어떤 테이블, 어떤 행 (`record_id`)
- 변경 전 값 (`before` JSON)
- 변경 후 값 (`after` JSON)
- 누가 (`user_id`), 언제 (`createdAt`), 어느 회사 (`company_code`)

## 검색 / 필터

- 테이블명 / 기간 / 사용자 / 회사 코드.
- 변경 다이프 자동 표시 (before vs after 색상).

---

# 보강 8 — 휴지통 (`/admin/trash`)

## 7일 복원 정책

소프트 삭제된 모든 레코드는 **7일** 동안 휴지통에 보관. 7일 경과 시 자동 영구 삭제 (다음 cron 에서).

| 액션 | 권한 |
|---|---|
| 복원 (`Restore`) | ADMIN |
| 즉시 영구 삭제 | ADMIN (7일 대기 무시) |
| 7일 자동 삭제 | 시스템 cron (매일 01:00 KST) |

## 복원 시 고려사항

- 외래 키 의존성 자동 검증. 부모 레코드가 이미 영구 삭제됐으면 복원 거부.
- `audit_log` 에 `restored_at` 기록.

---

# 보강 9 — Mock 매출 워크플로

테스트 / 데모용 매출 자동 생성 도구.

| 단계 | 동작 |
|---|---|
| ① IT 계약 선택 | 활성 계약 중 한 개 |
| ② 월 선택 | 매출 발생 월 |
| ③ 자동 단가 적용 | 본체 + 소모품 단가 |
| ④ Mock Sales 생성 | `OUT/TRADE/SALE/COMPANY` 트랜잭션 + Sales 행 |

생성된 매출은 `mock=true` 플래그로 감사 로그에 기록. 회계마감 전 정리 권장.

---

# 보강 10 — 거래처 포탈 계정 관리

## 자동 생성 흐름

`Client` 마스터에 `email` 입력 → 저장 시 자동:
1. 임시 비밀번호 생성 (1회용 토큰).
2. Welcome 이메일 (3언어) 발송.
3. 첫 로그인 시 비밀번호 변경 강제.

## 액세스 토큰 / 세션

- 포탈 로그인 → 쿠키 `tts_session` (회사 ERP 와 별개).
- 만료 24시간. 만료 시 재로그인 필요.
- 비밀번호 분실 시 ADMIN 이 `[리셋]` 버튼으로 재발급.

---

# 보강 11 — 재고 현상태 기술 (자유서술)

`InventoryItem.stateNoteVi/En/Ko` + `stateNoteOriginalLang` — S/N 단위 현상태 메모.

## 입력 시점

- 재고 현황 화면에서 상태 변경(NEEDS_REPAIR 등) 시 같이 입력.
- AS 디스패치 후 결과 메모.
- 매월 점검 결과.

## 자동 번역

저장 시 Claude API 가 나머지 2개 언어로 즉시 번역. 사용자 표시 언어로 자동 노출.

---

# 부록 (관리자) — 추가 색인

| 약어/용어 | 의미 |
|---|---|
| **AGENT_OFFLINE** | SNMP Agent 24h 연락두절 알림 |
| **CRON** | 정기 실행 작업 (cron expression) |
| **fraudReviewedAt** | 부정 의심 조사 완료 시점 |
| **HMR** | Hot Module Replacement (개발 모드) |
| **SnmpReading** | SNMP 카운터 1건 저장 모델 |
| **softDelete** | 7일 휴지통 보관 후 영구 삭제 |
| **YieldAnalysis** | 월별 적정율 분석 결과 모델 |
| **YieldConfig** | 임계값 설정 모델 |
| **mock=true** | Mock 매출 표식 |

---

# 변경 이력 (관리자 매뉴얼 v2 보강판)

- **v2.3.0 · 2026-05-03**: 재경 Layer 2 — 비용/원가 관리 (CostCenter + AllocationRule + Budget + 거래처 수익성). 사이드바 2 메뉴 추가. 자세한 내용은 사용자 매뉴얼 부록 K 참조.
- **v2.2.0 · 2026-05-03**: 재경 Layer 1 자금관리 모듈 신설 (BankAccount/CashTransaction + Expense 강화 + Payroll bulk-pay + cash-shortage cron). 사이드바 재경 그룹 3 메뉴 추가. 자세한 변경은 사용자 매뉴얼 부록 K 참조.
- **v2.1.2 · 2026-05-03**: Prisma extension 의 `resolveSessionCompanyCode()` fallback 도입 — ALS 컨텍스트가 비어 있어도 `x-session-user` 헤더에서 직접 회사코드를 읽음. v2.1.1 의 `enterWith` 가 RSC 격리로 작동 안 하던 케이스 해결.
- **v2.1.1 · 2026-05-03**: Server Component 자동 회사 필터 fix — `getSession()` 이 ALS 컨텍스트를 sticky 설정. v2.1.0 에서 누락된 server component 경로에서도 자동 필터 작동.
- **v2.1.0 · 2026-05-03**: companyCode 전수 보강 — 34개 업무 데이터 모델에 컬럼 일괄 추가(@default(TV) 로 기존 행 백필). `src/lib/prisma.ts` 의 `COMPANY_SCOPED_MODELS` Set 이 회사별 자동 필터·자동 주입. CodeSequence 는 `(companyCode, key)` 복합 PK 로 분리(TNV/VNV 시퀀스 race 방지). 인덱스 `@@index([companyCode, createdAt])` 일괄 추가. 마스터(Client/Item/Warehouse) + 시스템 테이블(File/User/AuditLog) 은 미적용(공유). 자식 테이블(SalesItem/PurchaseItem/AsDispatchPart 등) 은 부모 propagate 로 채움.
- **v2.0.0 · 2026-05-02 (PM)**: 커밋 4룰 정착 — ① `src/lib/version.ts` 신설 + 사이드바 상단(TTS 로고 아래) 노출 ② 3개국어 동시 갱신 ③ 매뉴얼 변경이력 동기 ④ Chrome 검증 필수. 룰 위반 시 다음 작업에서 재실행 요청 가능.
- **2026-05-02 (AM)**: 본 보강판 발행.
- **2026-05-01**: 4축 진리표 30→34행, SUPPLIES itemType, 매입반품/폐기/재고조정/분해조립 콤보.
- **2026-04 후반**: ClientRuleOverride, 자동 PR DRAFT, AI 포탈 게시글, SNMP 6단계 워크플로 + PDF.
- **2026-04 중반**: NIIMBOT B21 라벨, QR 다중 스캔, 컬러 채널 배지.
- **2026-04 초반**: 적정율 4탭 + 부정 의심 알림, 거래처 포탈 자동 계정 발급.
