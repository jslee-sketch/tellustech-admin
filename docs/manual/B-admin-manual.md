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

## 2.3 부여·해제 절차

1. 좌측에서 사용자 선택 → 현재 권한이 우측 표에 즉시 표시됩니다.
2. 모듈별 라디오(`HIDDEN` / `VIEW` / `WRITE`) 변경.
3. 하단 **저장** 버튼 → API `PUT /api/admin/permissions/{userId}` 로 일괄 반영.
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

## 3.2 마감 절차

1. 화면 상단의 **대상 월 (YYYY-MM)** 입력 (기본값: 현재 월).
2. **마감 (lock)** 버튼 → 확인 모달 → 진행.
3. 결과 표시: `잠금 완료: 매출 N / 매입 N / 비용 N / PR N`.

## 3.3 마감 해제 (ADMIN 전용)

마감 후 오류가 발견된 경우만 사용. 권한이 `MANAGER` 인 경우 해제 버튼이 보이지 않습니다.

1. 동일 화면에서 대상 월 입력.
2. **마감 해제 (unlock)** 버튼 → 확인 → 진행.
3. 결과 표시: `해제 완료: 매출 N / 매입 N / 비용 N / PR N`.

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

## 4.2 복구 절차

1. 카테고리(거래처/품목/...) 별 카드에서 행을 확인.
2. 행 우측 **복구** 버튼 → 확인 모달 → API `POST /api/admin/restore/{model}/{id}` 호출.
3. 성공 시 페이지 자동 새로고침. 해당 행이 `deletedAt=null` 로 복원되어 정상 모듈에 다시 노출됩니다.

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

## 5.3 검색·필터

- **회사 / 사용자 / 테이블 / 동작 / 일자** 5종 필터.
- 표 우상단의 페이지네이션 — 한 화면 50건 단위.
- 엑셀 다운로드는 별도 권한이 필요합니다 (대용량 우려).

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

## 6.2 등록 절차

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

## 8.3 환경변수 목록 (운영)

| 키 | 용도 |
|---|---|
| `DATABASE_URL` | PostgreSQL 접속 문자열 (두 인스턴스 동일) |
| `JWT_SECRET` | 세션 토큰 서명 (두 인스턴스 동일해야 양쪽 인식) |
| `ANTHROPIC_API_KEY` | 3언어 자동 번역 |
| `NODE_ENV` | `production` |
| `PORTAL_MODE` | 포탈 인스턴스에만 `true` |

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
