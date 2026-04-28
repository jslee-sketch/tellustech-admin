---
title: "Tellustech ERP — 사용설명서"
subtitle: "사내 직원용 (사원·대리·매니저)"
author: "Tellustech IT 팀"
date: "2026-04"
lang: ko
---

# 머리말

> **본 문서의 위치**
> 이 문서는 사내 직원이 일상적으로 사용하는 모든 모듈의 사용법을 다룹니다.
> 관리자 전용 기능(권한관리·회계마감·휴지통·감사로그·호환매핑·통계 깊이 분석)은 별책 **B — 관리자 매뉴얼**을 참고하세요.
> 고객사가 사용하는 포탈은 별책 **C — 고객 포탈 가이드**가 따로 있습니다.

본 ERP 는 **Tellustech Vina (TV)** 와 **Vietrental (VR)** 두 법인을 단일 시스템에서 운영합니다.
모든 화면은 **한국어 / Tiếng Việt / English** 3개 언어와 **다크 / 라이트** 두 테마를 지원합니다.

---

# 1부. 시작하기

## 1.1 ERP 접속과 로그인

브라우저(Chrome / Edge / Safari) 에서 안내된 ERP 주소로 접속합니다.

```
https://tellustech-admin-production.up.railway.app
```

> 정확한 도메인은 IT 팀에 확인하세요. 고객 포탈은 다른 도메인을 사용합니다.

로그인 화면에서 다음 4개 항목을 입력합니다.

| 항목 | 예시 / 선택 |
|---|---|
| **회사코드** | `TV` (Tellustech Vina) 또는 `VR` (Vietrental) |
| **아이디** | (IT 팀 발급) |
| **비밀번호** | (IT 팀 발급) |
| **언어** | Tiếng Việt / 한국어 / English |

> **회사코드는 세션 전체에 고정**됩니다. 다른 회사 데이터를 보려면 로그아웃 후 다시 로그인하거나, 권한이 있다면 사이드바 회사 picker(§1.4)로 전환합니다.

## 1.2 첫 로그인 후 해야 할 일

1. **비밀번호 변경** — IT 팀이 발급한 임시 비밀번호는 즉시 본인이 기억할 수 있는 값으로 바꿉니다.
2. **본인 정보 확인** — `직원 (👤)` 메뉴에서 본인 카드가 본인 부서·법인 아래에 등록돼 있는지 확인합니다. 누락되어 있으면 인사 담당자에게 등록을 요청합니다.
3. **언어·테마 선택** — 사이드바 상단 국기 3개 중 하나를 눌러 표시 언어를, 사이드바 하단 ☀ / 🌙 버튼으로 테마를 결정합니다. 두 설정은 모두 사용자 단위로 저장됩니다.

## 1.3 언어 전환과 다크모드

- **언어**: 사이드바 상단의 둥근 SVG 국기 3개 (🇻🇳 / 🇺🇸 / 🇰🇷). 활성된 언어는 발광 테두리로 강조됩니다. 누르면 즉시 페이지가 새로고침되며 메뉴·라벨·메시지가 바뀝니다.
- **다크 / 라이트 모드**: 사이드바 하단 `☀ Light` / `🌙 Dark` 토글. 기본은 다크입니다. 선택은 브라우저(`localStorage`) 에 저장돼 다음 접속에도 유지됩니다.

> 자유서술 입력(AS 증상·평가·사건 등)은 한 언어로만 작성하면 시스템이 나머지 두 언어로 자동 번역해 보관합니다(§A 부록 C 참조).

## 1.4 화면 구성 (사이드바·메인)

화면은 좌측 **사이드바**와 우측 **메인 영역** 2단 구성입니다.

### 사이드바 — 위에서부터

1. **로고 / 접기 토글** — `TTS` 로고 + `‹ / ›` 버튼. 접기 모드에서는 아이콘만 남습니다.
2. **언어 선택** — 둥근 SVG 국기 3개 (VI / EN / KO).
3. **회사 picker** — `allowedCompanies` 가 2개 이상인 사용자에게만 노출. `TV` / `VR` / `ALL`(통합조회) 중 한 개를 누르면 페이지가 다시 로드되며 모든 화면이 해당 회사 데이터로 필터됩니다.
4. **🏠 홈** — 대시보드.
5. **모듈 그룹 (10개)** — 각 그룹 헤더는 작은 주황색 막대 + 그룹명으로 구분됩니다. 그룹 내부에 각 모듈 메뉴 항목이 들어 있습니다.
   - 마스터 / 영업 / 렌탈 / AS / 재고 / 인사 / 재경 / 회의 / 캘린더 / 메시징
   - 관리자 권한이 있으면 **관리자** 그룹이 한 줄 더 보입니다 (감사로그·권한·호환매핑·회계마감·휴지통·**포탈 포인트·포탈 배너·견적 요청·고객 의견·포탈 게시글·서베이·업체 추천**·통계).
6. **테마 토글** — 하단의 ☀ / 🌙.

> **권한 가림**: 권한 레벨이 `HIDDEN` 인 모듈은 사이드바에서 자동으로 숨겨집니다. 같은 화면이라도 사용자별로 보이는 메뉴 수가 다를 수 있습니다.

### 메인 영역

- **상단**: 페이지 헤더(브레드크럼 + 제목), 우상단 `[신규]` / `[저장]` 등 액션 버튼.
- **본문**: 검색 바, 필터, 데이터 테이블, 또는 입력 폼.
- **데이터 테이블**: 컬럼 헤더로 정렬, 검색 바로 회사 스코프 안에서 필터링.

---

# 2부. 마스터 모듈

마스터는 모듈 간 공통 참조 데이터를 등록하는 모듈입니다. **공유 마스터**(거래처·품목·창고)는 회사코드가 없어 두 법인이 동일 데이터를 참조하고, 그 외(직원·부서·프로젝트·일정·라이선스)는 회사별로 분리 저장됩니다.

## 2.1 거래처 (`/master/clients`)

귀사가 거래하는 모든 회사를 등록합니다. **공유 마스터** — TV / VR 모두 동일한 거래처를 봅니다.

### 등록 — 입력값별 영향도

`[신규]` 버튼 → 다음 항목 입력.

| 필드 | **이 값이 시스템에서 하는 일** |
|---|---|
| **거래처코드** | 자동 생성 `CL-YYMMDD-###` (수정 불가). 모든 모듈의 외래키 |
| **회사명 (VI/EN/KO)** | 한 언어 입력 시 저장 시점에 Claude API 가 나머지 2개 언어 자동 번역 → `companyNameVi/En/Ko` 3컬럼 모두 채움 |
| **세무코드 (Mã số thuế)** | `taxCode` (베트남 사업자번호). 세금계산서 발행 키 |
| **주소·전화·이메일·담당자** | 자유 입력. AS 알림·디스패치 자동 추천에 사용 |
| **결제 조건 (paymentTerms)** | 일수 (예: 30). 매출 등록 시 미수금 만기일 = 매출일 + 이 값. 비우면 30일 기본 |
| **수금 상태** | `NORMAL` / `WARNING` / `BLOCKED` — 자동 계산 (재경 모듈), 관리자만 수동 변경 가능 |

### 검색·자동완성 콤보박스

매출·매입·렌탈·AS 등 거래처를 선택하는 모든 화면에서 **자동검색 콤보박스**(`거래처코드` 또는 `회사명` 부분 일치) 가 사용됩니다. 드롭다운에 보이지 않는 거래처는 `+ 거래처 등록` 링크로 새 탭에서 즉시 등록할 수 있습니다.

### 수금 상태 배지

- 🟢 `NORMAL` — 정상.
- 🟡 `WARNING` — 미수금 임계 초과 — 신규 거래 시 경고만 표시.
- 🔴 `BLOCKED` — 신규 매출·AS 접수 자동 차단. 재경 담당자가 결제 확인 후 해제합니다.

## 2.2 품목 (`/master/items`)

판매·임대·소모하는 모든 품목을 등록합니다. **공유 마스터**.

### 품목 유형

| 코드 | 의미 | 용도 |
|---|---|---|
| `PRODUCT` | 본품·완제품 | 매출·렌탈 대상 (예: 프린터, 계측기) |
| `CONSUMABLE` | 소모품 | 정기 출고되는 품목 (예: 토너, 잉크) |
| `PART` | 부품 | AS·교정 시 교체용 (예: 드럼 유닛) |

### 등록 — 입력값별 영향도

| 필드 | **이 값이 시스템에서 하는 일** |
|---|---|
| **품목코드** | 자동 생성 `ITM-YYMMDD-###` (수정 불가). 모든 재고·매출·매입 라인의 외래키 |
| **품목명 (영문 only)** | `Item.name`. **영문만 허용** (베트남 라벨·QR 시스템 호환). 비영문 입력 시 `english_only` 거절 |
| **단위 (unit)** | `EA`, `BOX`, `LIT` 등 자유 |
| **카테고리 (category)** | 분류용 자유 입력. 검색 키로 활용 |
| **유형 (itemType)** | `PRODUCT` / `CONSUMABLE` / `PART` — 호환매핑·디스패치 부품 자동 정렬·통계 분리의 기준 |

### 호환 매핑

`PRODUCT` 와 `CONSUMABLE` / `PART` 의 호환 관계는 별도 화면(`/admin/item-compatibility`)에서 등록합니다. 이 매핑은 **고객 포탈의 소모품 요청 화면**에서 자동 필터로 사용됩니다. 매핑은 관리자 전용 — 책 B 6부 참조.

## 2.3 창고 (`/master/warehouses`)

재고 보관 위치를 등록합니다. **공유 마스터**.

| 필드 | 비고 |
|---|---|
| **창고코드** | 자유 입력 (예: `WH-HCM-01`) |
| **창고명** | 자유 입력 |
| **유형** | `INTERNAL` (자사) 또는 `EXTERNAL` (고객·외부 보관) |

> `EXTERNAL` 창고는 입출고 화면에서 **거래처 선택**과 함께 표시됩니다. 외부 임대·점검 중인 장비를 추적할 때 사용합니다.

## 2.4 직원 (`/master/employees`)

법인별로 분리되는 인사 마스터입니다.

### 등록 — 입력값별 영향도

| 필드 | **이 값이 시스템에서 하는 일** |
|---|---|
| **회사** | `Employee.companyCode` (TV/VR). 사원코드 prefix 결정 + 부서 옵션 필터링 |
| **부서** | `departmentId`. 선택한 회사 소속 부서만 옵션에 노출 (회사 변경 시 자동 리셋) |
| **사원코드** | 자동 생성 — `TNV-###` (TV) / `VNV-###` (VR). **회사별 일련번호, YYMMDD 미포함** — 1년 내내 동일 카운터 |
| **이름 (VI/EN/KO)** | 한 언어 입력 시 자동 3언어 번역 (이름은 음역이라 어색할 수 있어 직접 입력 권장) |
| **직위·이메일·전화·입사일** | 기본 정보. 통계·연락처 표시 |
| **신분증 번호·사진** | `idCardNumber/idCardPhotoUrl`. 인사 컴플라이언스 |
| **급여·보험번호** | `salary/insuranceNumber`. 급여 모듈에서 직접 참조 (권한 가림 대상) |
| **계약 정보** | `contractType/contractStart/contractEnd`. 만료 임박 시 알림 |
| **상태 (status)** | ACTIVE / ON_LEAVE / TERMINATED — 활성 직원 옵션 필터의 기준 |

### 저장 시 일어나는 일

1. **사원코드 발급** — 회사별 카운터 +1 → `TNV-001` / `VNV-001` 식.
2. **3언어 이름 번역** (이름 칸 한 개만 입력 시).
3. **유효성 검증** — 회사·부서 매칭 (다른 회사 부서 선택 시 거절).

> **삭제**: 다른 모듈에서 참조 중인 직원은 삭제할 수 없습니다(`employee_has_dependent_rows`). 상태를 `TERMINATED` 로 변경하세요.

## 2.5 부서 (`/master/departments`)

회사별 부서·지사를 등록합니다.

| 필드 | 비고 |
|---|---|
| **부서코드** | 자유 입력 (예: `DEPT-SALES`) |
| **부서명 (VI/EN/KO)** | 자동 번역 적용 |
| **회사** | TV 또는 VR |

부서를 삭제하려면 먼저 그 부서 소속 직원이 0명이어야 합니다.

## 2.6 프로젝트 (`/master/projects`)

매출·매입을 묶는 프로젝트 단위를 등록합니다. 회사별로 분리.

| 필드 | 비고 |
|---|---|
| **프로젝트코드** | 자유 입력 |
| **프로젝트명** | 자유 입력 |
| **유형 (salesType)** | `TRADE`(상거래), `MAINTENANCE`(유지보수), `RENTAL`(렌탈), `CALIBRATION`(교정), `REPAIR`(수리), `OTHER` |

> 매출 등록 시 `CALIBRATION` 유형 프로젝트의 매출 라인은 **교정 성적서 발급 대상**으로 자동 인식됩니다 — 고객 포탈에서 다운로드 가능.

## 2.7 일정 (`/master/schedules`) · 캘린더 (`/calendar`)

회사·개인 일정을 등록하고 캘린더에 표시합니다.

### 일정 등록

| 필드 | 비고 |
|---|---|
| **일정코드** | 자동 생성 `SCH-YYMMDD-###` |
| **제목 (title)** | 필수 |
| **마감일시 (dueAt)** | 필수 |
| **담당자** | 활성 직원에서 선택 |
| **반복** | 일/주/월 패턴 (선택) |

### 캘린더

월·주·일 보기 전환. 일정 카드를 누르면 상세 보기. CFM(컨펌) 상태로 회의록·계약 등 외부 모듈과 연동될 수 있습니다.

## 2.8 라이선스 (`/master/licenses`)

소프트웨어·자격증·인증서 만료 관리.

| 필드 | 필수 |
|---|---|
| **이름 (name)** | ✓ |
| **취득일 (acquiredAt)** | ✓ |
| **만료일 (expiresAt)** | ✓ |
| **부여 대상** | 직원 또는 자산(SN) |
| **메모** | 자유 |

만료 임박 항목은 대시보드 알림으로 노출됩니다.

> **호환매핑**(`/admin/item-compatibility`)은 관리자 전용입니다. **책 B — 6부**를 참고하세요.

---

# 3부. 영업 (매출 / 매입)

매출과 매입은 같은 구조로 만들어졌습니다. 차이는 **거래 상대(거래처 / 공급처)** 와 **재고 흐름 방향(출고 / 입고)** 뿐입니다.

## 3.1 매출 (`/sales`)

### 신규 등록 흐름

`[+ 신규]` 버튼 → `/sales/new` 진입.

### 입력값별 데이터 영향도

| 입력 | 출처/형식 | **이 값이 시스템에서 하는 일** |
|---|---|---|
| **거래처** | ClientCombobox | `Sales.clientId` 저장 → 결제조건(`paymentTerms`)으로 미수금 만기일 자동 계산. `BLOCKED` 거래처는 `client_blocked` 거절 (관리자 강제 승인 필요) |
| **프로젝트** | Select (회사 스코프) | `Sales.projectId` 저장. 그 프로젝트의 `salesType` 으로 폼 분기 + 라인 처리 분기 |
| **영업담당자** | Select 직원 (선택) | `Sales.salesEmployeeId` 저장. 통계 화면 「영업담당자 실적」에 집계 |
| **사용기간 (헤더)** | date 두 칸 (`MAINTENANCE`/`RENTAL` 시 필수) | `Sales.usagePeriodStart/End` 저장 + 라인이 비어 있으면 라인 기간으로 자동 복사 |
| **창고** | Select (`TRADE` 시 필수) | `Sales.warehouseId` 저장. **TRADE 일 때만** 라인 1개당 재고 OUT 트랜잭션이 자동 생성됨 |
| **통화** | VND/USD/KRW/JPY/CNY | `Sales.currency` 저장. VND 외에는 환율 입력 필수 |
| **환율** | 숫자 (VND 는 자동 1.0) | `Sales.fxRate` 저장. 통계·미수금 합산 시 VND 환산 사용 |
| **품목 (라인)** | ItemCombobox | `SalesItem.itemId`. 라인 1행 = 1품목 |
| **S/N (라인)** | SerialCombobox | `SalesItem.serialNumber`. **TRADE 일 때 3가지 검증**: ① 마지막 트랜잭션이 OUT 이면 `serial_already_sold` 거절 ② 활성 IT/TM 계약에 등록된 SN 이면 `serial_in_active_contract` 거절 ③ 둘 다 통과해야 OUT 트랜잭션 생성 |
| **수량 (라인)** | 양수 | `SalesItem.quantity`. 라인 합계 = 수량 × 단가 |
| **단가 (라인)** | 0 이상 | `SalesItem.unitPrice` |
| **시작/종료일 (라인)** | date (`MAINTENANCE`/`RENTAL` 시) | `SalesItem.startDate/endDate`. 비어 있으면 헤더 기간 자동 복사 |
| **메모** | 자유 텍스트 | `Sales.note` |

### `salesType` 분기 한눈에

| salesType | 사용기간 | 창고 | 추가 항목 | 비고 |
|---|:-:|:-:|---|---|
| `TRADE` (상거래) | – | ✓ | – | 일반 매출 — 출고 처리 |
| `MAINTENANCE` (유지보수) | ✓ | – | – | 기간 입력, 재고 미차감 |
| `RENTAL` (렌탈) | ✓ | – | – | TM/IT 모듈에서 별도 관리하는 것이 일반적 |
| `CALIBRATION` (교정) | – | – | 성적서번호·발급일·PDF | 라인이 **고객 포탈 다운로드 대상** |
| `REPAIR` (수리) | – | – | – | AS 와 별개 단발성 수리 매출 |
| `OTHER` | – | – | – | 위 분류에 안 맞는 매출 |

### 자동번호와 결제조건

저장 시 매출번호가 `SLS-YYMMDD-###` 형식으로 자동 발급됩니다. 거래처 마스터의 결제 조건(예: 30일)이 헤더 안내문에 표시되며, 미수금/만기 계산의 기준이 됩니다.

### 합계 표시

라인 합계가 화면 우하단에 통화별로 누적 표시됩니다. 비-VND 통화일 때는 환율을 곱한 **VND 환산값**이 함께 보입니다.

### 매출 리스트 — 적정율 컬럼 (NEW)

`/sales` 매출 리스트의 마지막 컬럼에 **적정율 뱃지**가 표시됩니다.

- 표시 형식: `B/W 🟢 90%  C 🟢 90%` (B/W = 흑백, C = 컬러)
- **RENTAL 프로젝트 매출에만** 표시 — TRADE/MAINTENANCE/CALIBRATION 등은 "—"
- 같은 거래처의 IT 계약 장비들 중 **가장 우려되는** (적정율 최저) 값 기준
- 클릭 시 `/admin/yield-analysis` 로 이동해 상세 확인
- 두 개의 뱃지가 보이는 것은 **버그가 아니라** 흑백·컬러 두 적정율을 동시에 보여주는 것

### 저장 시 한 트랜잭션으로 일어나는 일

「매출 등록」 버튼 클릭 → 다음이 모두 한 DB 트랜잭션으로 실행됩니다 (실패 시 전체 롤백).

1. **매출번호 발급** — `SLS-YYMMDD-###` (그 날의 일련번호 + 1).
2. **`Sales` 행 생성** — 헤더 정보 + `totalAmount` (라인 합계).
3. **`SalesItem` 라인 생성** — 라인 수만큼 일괄 INSERT.
4. **재고 OUT 자동 생성** (TRADE + warehouseId 있을 때만) — 각 라인별 `InventoryTransaction(txnType=OUT, fromWarehouseId=선택창고, reason=SALE)` 자동 INSERT.
5. **미수금 자동 생성** — `PayableReceivable(kind=RECEIVABLE, status=OPEN, amount=totalAmount, dueDate=오늘+paymentTerms)`. 거래처 결제조건이 없으면 30일 기본.
6. **거래처 receivableStatus 재계산** — 누적 미수금이 임계 초과 시 `WARNING` / `BLOCKED` 자동 전환.
7. **감사로그 4건 이상** — Sales · SalesItem(N) · InventoryTransaction(N) · PayableReceivable INSERT 모두 기록.

## 3.2 매입 (`/purchases`)

매출과 동일한 폼 구조이며, **거래처 → 공급처** 로 라벨만 달라집니다.

### 입력값별 데이터 영향도 — 매출과의 차이

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **공급처** | `Purchase.supplierId` (매출의 `clientId` 대신) → 결제조건으로 **미지급 만기일** 계산 |
| **창고 (TRADE 시)** | 라인별로 재고 **IN** 트랜잭션 자동 생성 (매출은 OUT) |
| **나머지** | 매출과 동일 — 프로젝트·기간·통화·환율·품목 라인·메모 |

- 자동번호: `PUR-YYMMDD-###`
- 사용기간·창고 분기 규칙은 매출과 동일.

### 저장 시 일어나는 일 — 매출과의 차이

| 단계 | 매출 | 매입 |
|---|---|---|
| **재고 트랜잭션** | OUT (출고, reason=SALE) | IN (입고, reason=PURCHASE) |
| **PR 자동 생성** | `RECEIVABLE` (미수금) | `PAYABLE` (미지급금) |
| **재계산되는 거래처 상태** | `Client.receivableStatus` | (공급처에는 미적용) |

> 사용기간이 있는 매입(`MAINTENANCE` / `RENTAL`)은 **비용 자동 안분(allocations)** 대상으로 활용됩니다 — 라인 기간만큼 월별 비용 분산.

## 3.3 자동검색 콤보박스 — 거래처 / 품목 / S/N

매출·매입을 포함한 모든 입력 화면의 거래처·품목·S/N 필드는 **서버 검색 자동완성 콤보박스**입니다.

| 콤보박스 | 검색 키 | API |
|---|---|---|
| **거래처** | `거래처코드` 또는 `회사명` 부분 일치 | `/api/master/clients?q=` |
| **품목** | `품목코드` 또는 `품목명` 부분 일치 | `/api/master/items?q=` |
| **S/N** | `serialNumber` 부분 일치 (회사 스코프 자동) | `/api/inventory/sn/search?q=` |

### 사용 팁

- 입력 220ms 후에 서버에 요청 — 천 건 단위 데이터에서도 즉시 반응합니다.
- S/N 콤보박스는 자유 입력도 허용합니다. 재고에 없는 SN(외부 장비·고객 지급품)도 그대로 입력해 사용할 수 있습니다.
- 드롭다운 결과에 원하는 항목이 없으면 새 탭에서 등록 후 다시 검색할 수 있습니다 (거래처·품목 콤보박스 하단 `+ 등록` 링크 활용).

## 3.4 수정·환불 (Adjustments)

매출·매입을 등록한 뒤 **반품·교환·단가 조정**이 필요할 때는 상세 화면의 **수정 / Adjustments** 탭을 사용합니다.

| 유형 | 의미 | 재고 영향 |
|---|---|---|
| `RETURN` | 반품 | 라인의 S/N 단위로 입고 처리 |
| `EXCHANGE` | 교환 | 한 라인을 회수하고 다른 SN을 출고 |
| `PRICE_ADJUST` | 단가 조정 | 재고 영향 없음, 정산 금액만 변경 |

> **정책**: items 1행 = S/N 1개 = 수량 1. 여러 SN을 한꺼번에 처리하려면 라인을 추가하세요.

조정마다 `adjustCode` 가 자동 부여되고 회계마감(잠금) 정책의 영향을 받습니다 — 잠긴 월에 속한 매출의 조정은 차단됩니다(책 B 3부).

---

# 4부. 렌탈

ERP 의 렌탈은 두 가지 모듈로 분리됩니다.

| 모듈 | 대상 | 자동번호 | 청구 단위 |
|---|---|---|---|
| **IT 계약** (`/rental/it-contracts`) | 프린터·복합기 등 IT 장비 | `TLS-YYMMDD-###` (TV) / `VRT-YYMMDD-###` (VR) | 월 정액 + 카운터 사용량 |
| **TM 렌탈** (`/rental/tm-rentals`) | 계측기 등 단발/단기 렌탈 | `TM-YYMMDD-###` | 일/월 단가 |

## 4.1 IT 계약 (`/rental/it-contracts`)

### 신규 계약 등록

### 입력값별 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **거래처** (ClientCombobox, 필수) | `ItContract.clientId`. 존재 검증 후 저장. 회사 분리는 거래처가 아닌 **세션 회사코드** 로 결정됨 |
| **설치 주소** | `ItContract.installationAddress` (자유). 디스패치 출발지 자동 추천에 사용 |
| **시작/종료일** | `startDate/endDate` 둘 다 필수. `endDate < startDate` 면 거절 |
| **보증금·설치비·배송비·추가서비스비** | `deposit/installationFee/deliveryFee/additionalServiceFee` 4컬럼. 청구 화면에서 별도 라인으로 표시 |
| **통화** | VND/USD/KRW/JPY/CNY → `currency` |
| **환율** | `fxRate` (소수 6자리). 비-VND 시 환산 기준 |
| **계약/기술/재경 담당자** 3종 | 이름·전화·내선·이메일 12개 컬럼. 거래처 측 연락처. AS 자동 알림에 사용 |

### 저장 시 일어나는 일

1. **회사 prefix 결정** — 세션 `companyCode` 가 TV → `TLS-`, VR → `VRT-`.
2. **계약번호 발급** — `TLS-YYMMDD-###` 또는 `VRT-YYMMDD-###`.
3. **`ItContract` 행 생성** — 상태 `DRAFT` (장비 추가는 DRAFT 단계가 안전 — 자유롭게 추가/제거 가능).
4. **상세 페이지로 이동** — 장비 등록·청구 탭이 노출됨.

### 회사 분리 정책 (조회 시)

- 일반 사용자: 본인 세션 회사 prefix 만 보임 (`TLS-` 또는 `VRT-`).
- ADMIN/MANAGER: 양사 모두 보임. `?company=TV|VR` 파라미터로 명시 필터 가능.

### 장비 등록 (DRAFT → ACTIVE 전제)

상세 페이지의 `[+ 장비 추가]` 버튼으로 등록 — 입력값별 영향도:

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **S/N** (SerialCombobox, 필수) | `ItContractEquipment.serialNumber`. **STRICT 정책**: 자사 재고(`InventoryItem`)에 있는 SN 만 허용 → 외부 장비 IT 계약 등록 차단 |
| **품목** (ItemCombobox, 필수) | `itemId`. 호환 매핑(`ItemCompatibility`) 의 키 — 등록한 품목에 호환 소모품이 매핑되어 있어야 고객 포탈에서 소모품 요청 가능 |
| **월 정액 (monthlyBaseFee)** | 청구 화면의 월별 기본료. SN 별로 다를 수 있음 |
| **카운터 (흑백/컬러)** | 시작 카운터 (보통 0 또는 검침값). 다음 청구 시 차이값으로 사용량 계산 |
| **설치일 (installedAt)** | 자동 = 등록 시각. 변경 가능 |

### 장비 등록 시 일어나는 일

1. **`ItContractEquipment` 행 생성** — `removedAt = null` (활성).
2. **재고 OUT 트랜잭션 자동 생성** — 그 SN 이 재고에서 차감 (`reason=RENTAL`).
3. **SN 검색 자동 매칭** — 입출고 화면의 활성계약 자동 감지에 즉시 반영.
4. **고객 포탈 「내 IT 계약」 갱신** — 장비 수가 즉시 +1.

### 장비 표 — 적정율 카드 (NEW)

장비 목록 표에 다음 컬럼이 추가됩니다.

| 컬럼 | 설명 |
|---|---|
| **실제 상밀도 (%)** | 인라인 입력 (1~100). 기본 5. 사진/그래픽 다출력 고객은 10~15% 등으로 조정. 변경 시 즉시 저장 (PATCH) |
| **적정율** | 마지막 계산 결과 — `B/W 🟢 90% · C 🟢 90%` 형식. 미계산 시 "재계산" 안내 |
| 액션 | 📊 (단일 장비 6개월 재계산) / 수정 / 삭제 |

📊 버튼은 즉시 `/api/yield-analysis/calculate` 를 호출해 단일 장비를 6개월 기간으로 재계산하고 결과를 셀에 반영합니다. 자동 cron 이 매월 1일 02:00 KST 일괄 계산하므로, 정상 운영 시 수동 재계산은 거의 불필요합니다.

> 적정율 시스템 전체 설명은 **B 매뉴얼 13부**.

### 상태 흐름

```
DRAFT → ACTIVE → COMPLETED / CANCELED
```

- `DRAFT` — 장비를 자유롭게 추가/제거.
- `ACTIVE` — 장비 변경은 **Amendments** 로만 가능 (이력 보존).
- `COMPLETED` — 계약 종료. 모든 장비 회수.
- `CANCELED` — 중도 해지.

### 월별 청구 — 입력값별 영향도

상세 페이지의 **청구 / Billing** 탭에서 `[+ 청구 추가]`:

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **장비 SN** (Select — 그 계약의 등록 SN 만) | `ItMonthlyBilling.serialNumber` (장비 라인과 매칭) |
| **청구 월** (`YYYY-MM`) | `billingMonth`. 같은 SN+월 중복 등록 차단 |
| **흑백/컬러 카운터** | `counterBw/counterColor`. 직전 월 카운터와의 차이로 사용량 계산 |
| **청구 방법 (billingMethod)** | `COUNTER` (사용량) / `FIXED` (월 정액) — 계산식 분기 |

### 청구 등록 시 일어나는 일

1. **`ItMonthlyBilling` 행 생성** — 사용량 자동 계산 → `computedAmount` 채움.
2. **고객 포탈 「사용량 컨펌」 화면 즉시 노출** — 본인 거래처라면 그 줄이 보임.
3. **고객 서명 대기 상태** — `customerSignature = null`. 컨펌 후 미수금 자동 생성 (책 C 5.5 참조).

## 4.2 TM 렌탈 (`/rental/tm-rentals`)

### 신규 등록 — 입력값별 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **거래처** (ClientCombobox, 필수) | `TmRental.clientId` |
| **렌탈 기간 (헤더)** | `startDate/endDate`. 라인 기간이 비어 있으면 자동 복사 |
| **장비 라인 - S/N** (SerialCombobox) | `TmRentalItem.serialNumber`. **LOOSE 정책** — 자사 재고에 없어도 등록 가능 (외부 임대 장비 허용, 경고만) |
| **장비 라인 - 품목** | `TmRentalItem.itemId` |
| **장비 라인 - 일/월 단가** | `TmRentalItem.salesPrice`. 청구 계산의 기준 |
| **장비 라인 - 시작/종료일** | 라인 단위 기간. 헤더 기간 안에 들어와야 함 |
| **통화/환율** | `currency/fxRate`. 매출과 동일 |

자동번호 `TM-YYMMDD-###` 가 발급됩니다.

### 저장 시 일어나는 일

1. **`TmRental` + `TmRentalItem` 일괄 생성** — 한 트랜잭션.
2. **재고 OUT 자동** — 자사 재고 SN 인 경우만 (LOOSE — 외부 SN 은 트랜잭션 미생성, 추적만).
3. **고객 포탈 「내 IT 계약」 카드** 에 노출 (TM 도 함께 표시).
4. **활성 SN 검색에 즉시 반영** — 입출고 화면 onBlur 자동 감지에 포함.

### 청구

라인별 (종료일 − 시작일) × 단가 계산. 헤더 기간에서 부분 회수가 발생하면 **Amendments** 로 라인 종료일을 단축합니다 (다음 절).

## 4.3 장비 등록 / 교체 / 회수 — Amendments

`ACTIVE` 상태 계약·렌탈의 장비를 변경할 때 사용합니다. **수동 입력**과 **입출고 자동 트리거** 두 경로가 있습니다.

### 수동 Amendment — 입력값별 영향도

상세 페이지 **수정/이력 / Amendments** 탭 → `[+ 신규 Amendment]`:

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **종류 (type)** | `ADD_EQUIPMENT` / `REMOVE_EQUIPMENT` / `REPLACE_EQUIPMENT` / `FEE_CHANGE` — 라인 액션 결정 |
| **출처 (source)** | `MANUAL` (수동) / `INVENTORY_TXN` (입출고 자동) — 추적용 |
| **발효일 (effectiveDate)** | 변경 적용일. 청구 계산 분기점 |
| **창고 (warehouseId)** | 회수/교체 시 입고 창고 |
| **라인 - action** | `ADD` / `REMOVE` / `REPLACE_OUT` / `REPLACE_IN` — REPLACE 시 OUT+IN 한 Amendment 에 두 줄 |
| **라인 - S/N + itemId** | 대상 장비 식별 |
| **라인 - monthlyBaseFee/salesPrice** | REPLACE_IN 또는 FEE_CHANGE 시 신규 단가 |

### Amendment 저장 시 일어나는 일

1. **`Amendment` + `AmendmentItem` 행 생성**.
2. **장비 마스터 갱신** — REMOVE 시 `removedAt = effectiveDate`, ADD/REPLACE_IN 시 새 장비 행 생성.
3. **재고 트랜잭션 자동** — IN/OUT 자동 (창고 지정된 경우만).
4. **이력 보존** — Amendment 자체는 절대 삭제 안 됨 (감사 목적).

### 입출고 자동 트리거

`/inventory/transactions/new` 에서 S/N 입력 후 onBlur → 시스템이 해당 S/N 의 활성 IT/TM 계약을 즉시 조회. 계약이 발견되면 모달이 열려 다음 3가지 의도 중 선택을 요청합니다.

| 의도 | 결과 |
|---|---|
| **회수 (RECOVER)** | 자동으로 `REMOVE_EQUIPMENT` Amendment 생성 |
| **교체 (REPLACE)** | 신규 SN 입력 → `REPLACE_EQUIPMENT` Amendment 생성 |
| **일반 이동 (NORMAL)** | Amendment 미생성, 단순 입출고로만 처리 |

이 트리거 덕분에 현장에서 입출고만 처리해도 계약 이력이 자동 갱신됩니다.

## 4.4 청구·정산

- **IT 계약**: 매월 청구 등록 → 고객 포탈에서 사용자가 컨펌(✍️ 서명) → 미수금 자동 생성 (재경 모듈).
- **TM 렌탈**: 헤더/라인 기간 기반 자동 계산 → 정산일에 매출 자동 생성 옵션.

미수금 정지(`BLOCKED`) 상태 거래처는 신규 청구는 발행되지만 신규 매출·AS 접수는 차단됩니다.

---

# 5부. AS (애프터서비스)

AS 모듈은 **티켓**(접수)과 **디스패치**(현장 출동) 두 단계로 구성됩니다.

| 모듈 | 경로 | 역할 |
|---|---|---|
| AS 티켓 | `/as/tickets` | 고객 요청 접수·증상 기록 |
| AS 디스패치 | `/as/dispatches` | 출동 일정·부품 사용·서명 |

자동 접수번호: `YY/MM/DD-##` (예: `26/04/27-01`).

## 5.1 티켓 접수 (`/as/tickets`)

### 신규 접수 — `[+ 신규]` → `/as/tickets/new`

### 입력값별 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **고객사** (ClientCombobox, 필수) | `AsTicket.clientId` 저장. `BLOCKED` 거래처는 신규 접수 자체 차단 (빨간 경고). `WARNING` 은 노란 경고만 |
| **장비 / 품목** (ItemCombobox, 선택) | `AsTicket.itemId` — 어떤 품목 모델인지 — 통계·매칭 부품 자동 추천에 사용 |
| **S/N** (SerialCombobox, 선택) | `AsTicket.serialNumber` — **LOOSE 정책**: 자사 재고에 없어도 입력 가능 (외부 장비). 디스패치 생성 시 이 SN 이 「대상 장비 SN」 으로 자동 전파 |
| **AS 담당자** (직원 Select, 선택) | `AsTicket.assignedToId`. 비우면 `RECEIVED` 그대로 + 미배정 표시 |
| **원문 언어** (VI/KO/EN) | `AsTicket.originalLang` 저장. 자동 번역 시 원본으로 인식할 언어 |
| **증상 (VI/KO/EN)** 3칸 중 ≥1 | 한 칸만 채우면 저장 시 나머지 2개 언어 자동 번역 → `symptomVi/En/Ko` 3컬럼에 모두 채움. 모든 칸 비워 저장하면 `invalid_input` |
| **사진** (다중 업로드) | 파일이 먼저 `/api/files` (category=`PHOTO`) 에 업로드되어 fileId 발급 → 티켓에 `photoIds` 배열로 연결 |

### 저장 시 일어나는 일

1. **티켓번호 발급** — `YY/MM/DD-NN` (그 날의 일련번호 + 1).
2. **`AsTicket` 행 생성** — 상태 `RECEIVED`, `kind = AS_REQUEST`, 접수일시 자동.
3. **3언어 번역 보관** — Claude API 가 입력 안 된 두 언어 칸을 자동 채움.
4. **사내 알림** — 담당자 미배정이면 AS 팀 전체, 배정됐으면 그 직원에게 알림.
5. **고객 알림** — 고객 포탈 「내 요청 현황」 표에 즉시 노출.

### 4단계 워크플로

```
RECEIVED → IN_PROGRESS → DISPATCHED → COMPLETED
                                     └→ CANCELED (어디서나 취소 가능)
```

| 상태 | 의미 | 변경 트리거 |
|---|---|---|
| `RECEIVED` | 접수, 담당자 배정 대기 | 자동 (신규 등록) |
| `IN_PROGRESS` | 담당자 배정·확인 중 | 수동 변경 또는 디스패치 등록 시 자동 |
| `DISPATCHED` | 현장 출동 등록됨 | 디스패치 생성 시 자동 |
| `COMPLETED` | 작업 완료, 고객 확인 대기 | 디스패치 완료 + 서명 |
| `CANCELED` | 취소 (이력 보존) | 수동 |

### 티켓 검색

리스트 화면 상단의 상태 필터(드롭다운) + 검색바(접수번호·고객·SN). 회사 스코프 안에서 자동 필터.

## 5.2 디스패치 (`/as/dispatches`)

티켓에 대해 실제 출동을 기록하는 화면입니다.

### 디스패치 생성 — 티켓 상세의 `[+ 디스패치 등록]` 버튼

### 입력값별 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **출동 직원** | `AsDispatch.dispatchEmployeeId`. 통계·KPI 「담당자별 처리 건수」 집계 |
| **운송 방법** (자유) | `AsDispatch.transportMethod` |
| **출발지·도착지 주소** | `AsDispatch.originAddress/destinationAddress`. **양쪽 주소가 모두 채워지면** 서버가 Google Distance Matrix API 를 자동 호출해 거리(km) 자동 계산 |
| **계측 사진 (택시미터 OCR)** | `meterPhotoUrl`. OCR 로 km 추출 → `meterOcrKm`. Google 거리와 비교해 `distanceMatch` (true/false) 자동 판정 → 운송비 정산 검증 |
| **운송비** | `AsDispatch.transportCost`. 출동총비용에 합산 |
| **영수증 파일** | `receiptFileId`. 회계 증빙 |
| **출발/도착/완료 시각** | `departedAt/arrivedAt/completedAt`. SLA 계산 |
| **대상 장비 SN** | 명시값 우선, 비우면 **티켓의 SN 이 자동 propagate**. 부품 등록 시 기본값으로 사용 |
| **메모** | `AsDispatch.note` (자유) |

### 저장 시 일어나는 일

1. **`AsDispatch` 행 생성** — 위 입력값 + 거리 자동 계산 결과.
2. **티켓 상태 자동 전환** — 티켓이 `RECEIVED` / `IN_PROGRESS` 였으면 → `DISPATCHED`. (이미 `COMPLETED`/`CANCELED` 면 `ticket_not_dispatchable` 거절)
3. **부품 사용 등록 가능** — 디스패치 상세 페이지에서 부품 추가 가능 (다음 절).

### 부품·소모품 사용 등록

디스패치 상세 페이지의 **부품 / Parts** 섹션 — 입력값별 영향도:

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **대상 장비 SN** (필수) | `AsPart.targetEquipmentSN` — 어떤 장비에 부품이 들어갔는지 추적. 통계 「SN별 누적 부품원가」 집계의 키 |
| **출고 창고** (필수) | 부품 출고 원천 — 자동 생성될 `InventoryTransaction.fromWarehouseId` |
| **품목** (ItemCombobox) | `AsPart.itemId`. PART/CONSUMABLE 우선 정렬 |
| **부품 SN** (선택) | `AsPart.serialNumber`. 부품 자체에 SN 이 있을 때만 |
| **수량** | `AsPart.quantity`. 1 이상 정수 권장 |
| **메모** | `AsPart.note` (자유) |

### 「부품 추가」 버튼이 한 트랜잭션으로 하는 일

1. **`AsPart` 행 생성** — 라인 1개.
2. **품목 단가 자동 조회** → `AsPart.unitCost` (재고 평균 단가 기준).
3. **합계 계산** → `AsPart.totalCost` = 단가 × 수량.
4. **재고 OUT 자동 생성** — `InventoryTransaction(txnType=OUT, reason=CONSUMABLE_OUT, fromWarehouseId=출고창고, targetEquipmentSN=대상SN)`.
5. **재고 부족 시 거절** — `insufficient_stock` 에러 → 화면에 「재고 부족 — 상세」 표시.
6. **출동총비용 갱신** — 디스패치 헤더의 「부품원가 합계」 가 즉시 다시 계산됨.

### 비용 합계

| 항목 | 합산 |
|---|---|
| **부품원가** | 라인 합계 |
| **운송비** | 헤더값 |
| **출동총비용** | 부품원가 + 운송비 |

### 완료·서명

완료 처리(`COMPLETED`) 시 모바일 손가락 서명을 받습니다 (현장에서 고객 확인). 서명이 저장되면 티켓 상태가 `COMPLETED` 가 되고 고객 포탈 「내 요청 현황」에 **확인** 버튼이 활성화됩니다.

## 5.3 사진과 첨부

티켓·디스패치 둘 다 사진 첨부 가능. 한 장당 최대 사이즈는 시스템 설정에 따릅니다(보통 10MB). 업로드된 사진은 `/api/files/{id}` 로 다운로드.

## 5.4 BLOCKED 정책

거래처가 `BLOCKED` 상태이면 신규 티켓 생성 자체가 차단됩니다. 결제 확인 후 자동 해제 또는 재경 담당자가 수동 해제(책 B 8부).

---

# 6부. 재고

재고 모듈은 4개 화면으로 구성됩니다.

| 화면 | 경로 | 용도 |
|---|---|---|
| **재고 현황** | `/inventory/stock` | 품목·창고별 보유 수량 + S/N 단위 상세 |
| **입출고** | `/inventory/transactions` | IN/OUT/TRANSFER 등록 |
| **QR 스캔** | `/inventory/scan` | 카메라로 QR 읽고 즉시 입출고 |
| **QR 라벨** | `/inventory/labels` | A4 시트로 QR 라벨 인쇄 |

추가로 자산성 장비는 **감가상각**(`/inventory/depreciation`) 에서 별도 관리합니다.

## 6.1 재고 현황 (`/inventory/stock`)

### 품목·창고별 보유 수량

상단 필터(품목·창고) → 즉시 합계 표시. URL 쿼리 파라미터는 `item=` / `warehouse=`. 응답은 `{ stock: [{ ..., onHand }] }` 형식.

### S/N 단위 상세 (InventoryItem)

각 행을 펼치면 그 품목의 모든 SN 이 상태별로 표시됩니다.

| 상태 | 의미 |
|---|---|
| `NORMAL` | 정상 — 즉시 출고 가능 |
| `NEEDS_REPAIR` | 수리 필요 |
| `PARTS_USED` | 부품 사용됨 (분해 등) |
| `IRREPARABLE` | 폐기 대상 |

상태 변경은 같은 화면에서 즉시 가능하고, 변경 사유는 InventoryRemark 로 자동 기록됩니다.

## 6.2 입출고 등록 (`/inventory/transactions/new`)

3가지 거래 유형을 한 화면에서 처리합니다.

### 입력값별 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **거래 유형 (txnType)** | `IN` / `OUT` / `TRANSFER` — `InventoryTransaction.txnType`. 이 값에 따라 출발/도착 창고 필수 여부와 사유 옵션이 결정됨 |
| **사유 (reason)** | 유형별 제한된 enum (다음 표). `InventoryTransaction.reason`. 통계 「사유별 회전」 집계 |
| **수량 (quantity)** | 양수. `InventoryTransaction.quantity` |
| **품목 (itemId)** | ItemCombobox 필수. `InventoryTransaction.itemId` |
| **S/N** | SerialCombobox + 입력 후 onBlur 시 **활성 IT/TM 계약 자동 검색**. 발견되면 모달로 RECOVER/REPLACE/NORMAL 선택 → `Amendment` 자동 생성 가능 |
| **출발/도착 Scope** (TRANSFER 전용) | INTERNAL/EXTERNAL — INTERNAL 은 자사 창고 선택, EXTERNAL 은 거래처 선택으로 폼 분기 |
| **출발/도착 창고** | 자사 창고 (INTERNAL Scope 시) → `from/toWarehouseId` |
| **출발/도착 거래처** | EXTERNAL Scope 시 → `clientId` 단일 컬럼에 압축 저장 (한 트랜잭션에 한쪽만 EXTERNAL 가능) |
| **납품처** (OUT 전용) | OUT 의 클라이언트 → `clientId` |
| **대상 장비 SN** (`CONSUMABLE_OUT` 시 필수) | `targetEquipmentSN`. 어떤 장비에 소모품이 들어갔는지 추적 |
| **메모** | `note` (자유) |

### 거래 유형별 (3가지)

| 유형 | 설명 | 필수 입력 |
|---|---|---|
| **IN** | 입고 — 도착 창고로 들어옴 | toWarehouseId |
| **OUT** | 출고 — 출발 창고에서 나감 | fromWarehouseId + clientId |
| **TRANSFER** | 이동 — 출발↔도착 창고 간 | from/to (Scope 별로 창고 또는 거래처) |

### 사유 (`reason`) — 유형별로 제한

| 유형 | 가능한 사유 |
|---|---|
| **IN** | `OTHER_IN` |
| **OUT** | `CONSUMABLE_OUT` (소모품 출고) |
| **TRANSFER** | `CALIBRATION` (교정 보냄) · `REPAIR` (수리 보냄) · `RENTAL` (임대 보냄) · `DEMO` (시연 보냄) |

> **A안 정책**: 매입·매출·매입반품 사유는 별도 모듈(매입·매출·Adjustments) 에서만 자동 생성됩니다. 입출고 폼에서 수동 등록하지 않습니다.

### TRANSFER — INTERNAL ↔ EXTERNAL

TRANSFER 출발/도착의 **Scope** 를 각각 INTERNAL/EXTERNAL 로 선택합니다.

- 양쪽 모두 INTERNAL → 자사 창고 간 이동
- 한쪽이 EXTERNAL → 그쪽은 창고 대신 **거래처** 선택 (외부 임대·수리)
- 양쪽 모두 EXTERNAL → 비정상 (한쪽은 INTERNAL 이어야 함)

### S/N 활성계약 자동 감지 — 상세 흐름

S/N 칸에서 포커스를 떠나는 순간(onBlur):

1. API `GET /api/inventory/sn/{sn}/active-contracts` 호출.
2. 활성 IT 계약(`itContractEquipment.removedAt = null`) + 진행중 TM 렌탈(`endDate >= 오늘`) 검색.
3. 결과 0건 → `snIntent = NORMAL` 자동 설정, 진행 가능.
4. 결과 ≥1건 → 모달이 열리고 3가지 의도 중 선택:

| 의도 | 저장 시 자동 생성 |
|---|---|
| **회수 (RECOVER)** | `Amendment(type=REMOVE_EQUIPMENT)` + `items[REMOVE]` |
| **교체 (REPLACE)** | 신규 SN 추가 입력 → `Amendment(type=REPLACE_EQUIPMENT)` + `items[REPLACE_OUT, REPLACE_IN]` |
| **일반 이동 (NORMAL)** | Amendment 미생성, 단순 입출고만 |

따라서 입출고 1건만 등록해도 계약 이력이 자동 갱신됩니다.

### 저장 시 일어나는 일

1. **`InventoryTransaction` 행 생성** — 입력값 + `companyCode` 자동.
2. **`InventoryItem` 갱신** (S/N 단위 마스터) — 위치(현재 창고) 자동 업데이트.
3. **활성계약 의도가 RECOVER/REPLACE 면 Amendment 자동 생성** — 위 표 참조.
4. **잠금 검사** — 회계마감된 월의 트랜잭션은 사후 수정 차단(책 B 3부).

## 6.3 QR 스캔 (`/inventory/scan`)

휴대폰·태블릿 카메라로 QR 라벨을 읽어 즉시 입출고합니다.

### 사용 흐름

1. **카메라 시작** 버튼 → 권한 허용 → 사각 영역에 QR 정렬.
2. 디코딩 성공 시 자동으로 폼이 채워집니다 (JSON 형식의 QR 이면 itemCode + serialNumber 자동 매핑).
3. 거래 유형(IN/OUT/TRANSFER) + 사유 + 창고/거래처 선택 → 저장.

### QR 데이터 형식

본 시스템에서 발행한 QR 은 `{"itemCode":"...", "serialNumber":"...", "contractNumber":"..."}` JSON 입니다. 일반 바코드/문자열도 인식되며, 이 경우 SN 필드에 raw 값이 채워집니다.

## 6.4 QR 라벨 (`/inventory/labels`)

A4 시트에 QR 라벨을 인쇄합니다.

### 라벨 사이즈 3종

| 크기 | 용도 |
|---|---|
| `LARGE` | 사무기 본체용 — 회사명·품목명·SN 동시 표기 |
| `MEDIUM` | 일반용 |
| `SMALL` | 부품·소모품용 — 코드만 |

### 등록·인쇄

1. 사이즈 선택 → 시트 한 장당 매수가 자동 계산됨.
2. **품목**(ItemCombobox) + **SN**(SerialCombobox, 선택) + **부수** 입력 → `[+ 추가]`.
3. 추가된 행이 누적 표시됨. 행을 삭제하거나 수량 조정 가능.
4. **인쇄 / Print** 버튼 → 브라우저 인쇄 다이얼로그. 사이드바·UI 가 모두 숨겨지고 라벨 시트만 출력됩니다.

### 인쇄 헤더 — 매입 연계 시 자동 출력 (NEW)

매입 상세 → "라벨 인쇄" 진입 시 (URL `?purchaseId=` 자동 부착) 시트 상단에 다음 정보가 자동 헤더로 출력됩니다.

- **매입처** (Supplier 회사명)
- **매입번호** (PUR-YYMMDD-### 자동 부착 코드)
- **매입일자** (해당 매입 등록일)
- **출력일자** (현재 일자)
- **총 라벨 수 / 라벨 사이즈**

직접 `/inventory/labels` 진입 (매입 연계 없이) 시에는 헤더의 "—" 로 표시됩니다.

### QR 디코드 정책 (NEW)

스캔 화면 (`/inventory/scan`) 의 자동 매핑 흐름:

1. **JSON 형식** (구버전 라벨): `itemCode` 키 발견 시 자동 매핑.
2. **itemCode 패턴** (`ITM-YYMMDD-###`): 서버 fallback (`/api/master/items?q=`) 으로 itemId 자동 채움. 클라이언트 prop 의 top 500 범위 밖이어도 매핑.
3. **그 외 (S/N)**: `/api/inventory/sn/search` 로 InventoryItem 조회 → itemId 자동 채움.
4. 모바일 카메라 디코드 결과의 zero-width / BOM / 제어문자는 자동 제거.

### 스캔 화면 사유 옵션 — 매입/매출/매입반품 차단

QR 스캔 화면은 다음 사유만 허용:
- **IN**: `OTHER_IN` (기타입고)
- **OUT**: `CONSUMABLE_OUT` (소모품출고)
- **TRANSFER**: `CALIBRATION` / `REPAIR` / `RENTAL` / `DEMO`

매입(PURCHASE) · 매출(SALE) · 매입반품(RETURN_IN) 은 **매입·매출 모듈을 통해서만** 생성 가능 (감사·전표 일관성). API 가 동일 정책으로 차단합니다.

## 6.5 감가상각 (`/inventory/depreciation`)

자산성 장비(IT 본체 등)의 월별 감가상각을 자동 계산합니다.

### 자산 등록

| 항목 | 비고 |
|---|---|
| **품목·SN** | ItemCombobox + SerialCombobox |
| **취득일·취득가** | 필수 |
| **사용연수 (개월)** | 기본 60 |
| **방법** | `STRAIGHT_LINE` (정액) 또는 `DECLINING_BALANCE` (정률) |

### 결과 보기

상단 검색바(SN/품목코드/품목명) → 자산별 **최신 월 장부가**가 표 형태로 표시됩니다. 월별 이력은 별도 API 호출.

---

# 7부. 인사

<!-- TODO 다음 라운드 -->

---

# 7부. 인사

인사 모듈은 5개 화면으로 구성됩니다. 모두 회사별로 분리되며, 자유서술 입력은 **자동 3언어 번역** 대상입니다.

| 화면 | 경로 | 자동코드 |
|---|---|---|
| 입사 | `/hr/onboarding` | `ONB-YYMMDD-###` |
| 퇴사 | `/hr/offboarding` | `OFF-YYMMDD-###` |
| 사건평가 | `/hr/incidents` | `INC-YYMMDD-###` |
| 정기평가 | `/hr/evaluations` | `EVAL-YYMMDD-###` |
| 연차 | `/hr/leave` | `LV-YYMMDD-###` |

> 급여(`/hr/payroll`)·인센티브(`/hr/incentives`)는 권한이 부여된 인사담당자에게만 노출됩니다. 메뉴가 보이지 않으면 권한 가림 상태입니다.

## 7.1 입사 (`/hr/onboarding`)

신규 입사자 오리엔테이션·계약·자산 지급을 한 곳에서 관리.

| 섹션 | 내용 |
|---|---|
| **기본정보** | 입사자(직원 마스터에서 선택) · 입사일 · 직무 |
| **계약** | 계약 종류·시작·종료 (직원 마스터의 contract* 와 동기화) |
| **자산 지급** | 노트북·모니터 등 SN 단위로 지급 기록 — 재고에서 OUT 처리 |
| **체크리스트** | IT 계정·보안교육·복지카드 등 항목별 완료 표시 |

저장 시 `ONB-YYMMDD-###` 자동 발급.

## 7.2 퇴사 (`/hr/offboarding`)

| 섹션 | 내용 |
|---|---|
| **기본정보** | 퇴사자 · 퇴사일 · 사유 (3언어 자동 번역 대상) |
| **자산 회수** | 입사 시 지급 자산 SN 별로 회수 기록 — 재고 IN 처리 |
| **계정 비활성화** | 시스템·이메일·VPN 등 항목별 |
| **인수인계** | 후임자 + 인수인계 메모 |

처리 완료 시 직원 마스터 상태가 `TERMINATED` 로 자동 변경됩니다.

## 7.3 사건평가 (`/hr/incidents`)

특정 사건(징계·표창·근태 등)이 발생할 때마다 작성합니다.

### 입력값별 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **대상자** (Select 활성 직원) | `Incident.subjectEmployeeId`. 그 직원의 누적 사건 이력에 추가됨 — 정기평가 AI 보조의 입력 자료 |
| **사건 일자** (필수) | `occurredAt`. 시계열 분석 키 |
| **종류 (kind)** | DISCIPLINARY · COMMENDATION · ATTENDANCE · OTHER — 종류별 통계 분리 |
| **원문 언어** | `originalLang` (VI/KO/EN) |
| **내용 (contentVi/En/Ko)** | 한 언어 입력 — Claude API 가 나머지 2개 자동 번역. **최소 50자 이상** 검증 (짧은 내용 거절). 작성자 사원코드 필수 |
| **첨부** | `Incident.attachmentFileId` (선택). 증빙 파일 |

### 저장 시 일어나는 일

1. **`Incident` 행 생성** — `INC-YYMMDD-###` 자동 발급.
2. **3언어 번역 보관** — 작성자가 한 언어만 입력해도 3컬럼 모두 채움.
3. **AI 평가 자료에 누적** — 정기평가 시 자동 컨텍스트로 사용.
4. **표시는 사용자 언어 우선**, 「원문 보기」 토글 제공.

## 7.4 정기평가 (`/hr/evaluations`)

분기/반기/연간 정기평가.

| 섹션 | 내용 |
|---|---|
| **기본정보** | 대상자 · 평가기간 · 평가자 |
| **항목별 점수** | 직무 역량·태도·성과 등 (가중치 적용) |
| **종합 의견** | 자유서술 (3언어 자동 번역) |
| **AI 보조** | `/hr/evaluations/ai` — 사건평가 누적 데이터를 기반으로 초안 생성 |

저장 시 `EVAL-YYMMDD-###` 자동 발급.

## 7.5 연차 (`/hr/leave`)

### 입력값별 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **신청자** | `Leave.employeeId`. 본인 자동, 관리자만 대리 가능 |
| **종류** (kind) | ANNUAL · HALF · SICK · OTHER — 잔여 연차 계산 분기 |
| **시작/종료일** | `startDate/endDate`. 일수 자동 계산 (반차는 0.5) |
| **사유** | 자유 텍스트 (3언어 자동 번역) |

### 저장 시 일어나는 일

1. **`Leave` 행 생성** — `LV-YYMMDD-###` + 상태 `PENDING`.
2. **부서장 알림** — 승인 대기 알림 발송.
3. **승인 후** → 직원 잔여 연차에서 자동 차감, 캘린더에 자동 표시.
4. **거절 후** → 사유 첨부 + 신청자 알림.

---

# 8부. 재경

재경 모듈은 두 화면으로 구성됩니다.

| 화면 | 경로 | 역할 |
|---|---|---|
| 미수금 / 미지급금 | `/finance/payables` | 매출/매입 자동 연동되는 채권·채무 관리 |
| 비용 | `/finance/expenses` | 일반 운영비, 매출/매입 연결 비용 |

## 8.1 미수금 / 미지급금 (`/finance/payables`)

매출 등록 시 자동으로 **미수금**(`RECEIVABLE`) 레코드가, 매입 등록 시 자동으로 **미지급금**(`PAYABLE`) 레코드가 생성됩니다.

### 리스트 화면 (NEW — 검색 + 정렬 + 잔여일 + 변경일)

상단에 **미결제 합계 (VND)** 카드. 표는 다음 컬럼.

#### 검색 필터 영역
- **구분** select: 전체 / 미수금(RECEIVABLE) / 미지급금(PAYABLE)
- **상태** select: 전체 / OPEN / PARTIAL / PAID / 연체(OVERDUE)
- **전표번호** 텍스트: 부분 일치 (Sales/Purchase/Expense 코드 모두)
- **거래처** ClientCombobox (서버 검색)
- **기간(발행)** 시작일 ~ 종료일 (`createdAt` 기준)
- **기간(예정일)** 시작일 ~ 종료일 (`dueDate` 기준)
- [검색] / [초기화] 버튼

#### 컬럼

| 컬럼 | 의미 | 정렬 |
|---|---|---|
| **구분** | RECEIVABLE → 「미수금」 / PAYABLE → 「미지급금」 (3언어 풀네임) | — |
| **상태** | `OPEN` · `PARTIAL` · `PAID` · OVERDUE 합성 | — |
| **전표** | 원본 매출/매입/비용 번호 | — |
| **거래처** | `BLOCKED` 인 거래처는 이름 옆에 빨간 배지 | — |
| **금액** | VND | ▲▼ |
| **입금/지급** | 누적 결제액 | — |
| **잔액** | `amount - paidAmount` | ▲▼ |
| **예정일** | `dueDate` (최초 발행 시 결제조건으로 셋팅, 이후 불변) | ▲▼ |
| **변경일** | `revisedDueDate ?? dueDate` (상세에서 수정한 새 만기) | ▲▼ |
| **잔여일** | `오늘 - 변경일`. 색상: 음수=초록(남음), 0=노랑(오늘), 양수=빨강(연체). PAID 면 빈칸 | ▲▼ |

기본 정렬: **잔여일 내림차순** (연체 큰 것이 위).

> **예정일 vs 변경일**: 최초 발행 시 자동 셋팅된 결제 예정일은 `dueDate` (불변). 상세에서 만기 협상 결과를 입력하면 `revisedDueDate` 에 저장. 잔여일·연체 판정은 변경일 기준.

### 상세 화면 — 입력값별 영향도

`/finance/payables/[id]` — 두 섹션 + 입력 영향도:

#### 연락 이력 (PrContactLog) 추가

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **일자** | `PrContactLog.contactDate` |
| **연락 방법** | `method` — PHONE/EMAIL/VISIT/CHAT |
| **연락 내용 (3언어 중 1)** | `contactNoteVi/En/Ko` — 한 언어 입력 시 자동 번역 |
| **고객 응답 (3언어 중 1)** | `responseVi/En/Ko` — 동일 |

#### 결제 이력 (PrPayment) 추가

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **결제 금액** | `PrPayment.amount`. PR 의 `paidAmount` 자동 누적 |
| **결제 일자** | `paidAt` |
| **결제 방법** | `method` — BANK/CASH/CARD/OTHER |
| **메모** | 자유 |

#### 결제 등록 시 자동 일어나는 일

1. **PR `paidAmount` 갱신** = SUM(PrPayment.amount).
2. **PR `status` 자동 전환** — `paidAmount = 0` → `OPEN`, `0 < paidAmount < amount` → `PARTIAL`, `paidAmount >= amount` → `PAID`, `dueDate < 오늘` → `OVERDUE`.
3. **거래처 `receivableStatus` 재계산** — 누적 미수금 변화에 따라 `NORMAL` ↔ `WARNING` ↔ `BLOCKED` 자동 전환.
4. **회계마감 잠금 검사** — 잠긴 월 PR 의 결제 등록은 차단(책 B 3부).

### 엑셀 다운로드

상단 우측 `[엑셀]` 버튼으로 현재 필터 결과를 .xlsx 로 받습니다.

## 8.2 비용 (`/finance/expenses`)

일반 운영 비용을 등록하고 매출/매입에 안분(allocations) 합니다.

### 신규 등록 — 입력값별 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **자동코드** | `EXP-YYMMDD-###` (자동 발급) |
| **비용 종류 (expenseType)** | `GENERAL` / `PURCHASE` / `SALES` / `TRANSPORT` — `SALES`/`PURCHASE` 선택 시 연결 매출/매입 ID 가 필수가 됨 |
| **금액·통화·환율** | `amount/currency/fxRate`. 통계는 VND 환산값 사용 |
| **발생일** | `incurredAt`. 회계마감(잠금) 월 판단 기준 |
| **연결 매출/매입** | `SALES` 시 `linkedSalesId`, `PURCHASE` 시 `linkedPurchaseId` 필수. 매출/매입 상세에서 「관련 비용」 으로 노출 |
| **메모** | `note` (자유) |

### 저장 시 일어나는 일

1. **`Expense` 행 생성**.
2. **연결 매출/매입의 손익 재계산** — 즉시 통계에 반영.
3. **회계마감 검사** — `incurredAt` 이 잠긴 월이면 신규 등록도 차단.

### Allocations (안분)

한 비용을 여러 매출/매입 또는 부서·프로젝트에 비율 배분합니다. 비용 상세 페이지의 **안분 / Allocations** 탭에서 라인 단위로 등록.

회계마감(잠금) 정책의 영향을 받습니다 — 잠긴 월에 속한 비용 수정·삭제는 차단(책 B 3부).

---

# 9부. 회의 / 캘린더 / 메시징

## 9.1 주간보고 / 회의록 (`/weekly-report`)

주간 단위 업무 보고와 회의 기록을 통합 관리.

### 화면 구성 — 2개 패널

| 패널 | 내용 |
|---|---|
| **Tasks** | 진행 중 업무 — 지시사항/내용 (3언어), 담당자, 상태 |
| **Backlog** | 누적 미결 업무 + 거래처별 이력 |

### Tasks — 입력값별 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **지시사항 (instructionVi/En/Ko)** | 한 언어 입력 시 자동 3언어 번역. `WeeklyReportTask.instruction*` 컬럼 |
| **내용 (contentVi/En/Ko)** | 동일 패턴. 진행 결과·상세 보고 |
| **담당자** | `ownerEmployeeId`. 통계 「업무 처리량」 집계 |
| **상태** | TODO/IN_PROGRESS/DONE — 캘린더·대시보드 미결 카운트 분기 |

표시는 사용자 언어 → VI → KO → EN 순으로 가용한 언어를 자동 선택해 보여 줍니다 (`pick3` 함수).

### Backlog — 입력값별 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **거래처** (ClientCombobox) | `Backlog.clientId`. 거래처별 미결 업무 누적 |
| **업무 이력** (3언어 자동 번역) | 거래처별 누적 — 영업·AS 화면에서 「최근 미결 업무」 섹션으로 자동 노출 |

## 9.2 캘린더 (`/calendar`)

월·주·일 보기 전환. `/master/schedules` 에 등록된 일정과 회사 공통 이벤트가 모두 표시됩니다. 일정 카드 클릭 → 상세 보기 / 수정.

## 9.3 채팅 (`/chat`)

WebSocket 기반 실시간 메시징.

### 메시지 입력 — 데이터 영향도

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **메시지 본문** (한 언어 입력) | 전송 시 Claude API 가 자동으로 3언어 컬럼(`contentVi/En/Ko`) 모두 채움 |
| **첨부 파일** (선택) | `/api/files` 업로드 → `messageFiles` 연결 |
| **수신자 (DM)** | 회사 스코프 내 직원만 검색 가능 — 관리자 ALL 모드에서 양사 가능 |

### 표시 옵션

수신자는 화면에서 1/2/3개 언어 표시를 선택할 수 있습니다 (예: KO 만 / KO+VI / KO+VI+EN). 베트남측 동료가 한국어로 보낸 메시지를 베트남어로 즉시 읽을 수 있습니다.

### 새 채팅 (`/chat/new`)

| 입력 | **이 값이 시스템에서 하는 일** |
|---|---|
| **상대** (단일/다수) | DM 또는 그룹 채팅. 첫 메시지 전송 시 `ChatRoom` 자동 생성 |
| **방 이름** (그룹만) | `ChatRoom.name`. 자유 |

---

# 10부. 통계 (열람용)

> 일반 사원에게는 **보기 권한**만 부여됩니다. 분석 도구로 활용하세요. 깊이 있는 KPI/SN별 이익 분석은 관리자가 별책 **B — 7부**에서 다룹니다.

`/stats` 메뉴는 4개 탭으로 구성됩니다.

| 탭 | 내용 |
|---|---|
| **매출 / 영업** | 월별 매출 추이, 거래처/프로젝트별 합계, 영업담당자 실적 |
| **렌탈 / AS** | 활성 IT/TM 계약 수, 월별 청구·정산, AS 처리 시간(SLA) |
| **재고 / 인사** | 품목별 회전, 부서별 인원, 평가 점수 분포 |
| **재경** | 미수금 잔액 추이, 비용 카테고리별 합계, 통화 환산 요약 |

### 사용 팁

- 모든 차트는 **회사 스코프**가 자동 적용됩니다 (TV/VR 분리 또는 통합조회).
- 표 우상단의 `[엑셀]` 버튼으로 raw 데이터를 .xlsx 로 받을 수 있습니다.
- 상세 분석(SN 별 이익·TCO 등)은 관리자 권한이 필요하며 별책 B 7부 참조.

---

# 부록 A — 자동코드 표 (요약)

| 대상 | 형식 | 비고 |
|---|---|---|
| 거래처 | `CL-YYMMDD-###` | 일자별 일련번호 |
| 품목   | `ITM-YYMMDD-###` | 일자별 일련번호 |
| 사원   | `TNV-###` (TV) / `VNV-###` (VR) | **회사별 일련번호, YYMMDD 미포함** |
| IT계약 | `TLS-YYMMDD-###` / `VRT-YYMMDD-###` | |
| TM렌탈 | `TM-YYMMDD-###` | |
| AS전표 | `YY/MM/DD-##` | 슬래시 구분 |
| 평가   | `INC-YYMMDD-###` (사건) / `EVAL-YYMMDD-###` (정기) | |
| 입·퇴사 | `ONB-YYMMDD-###` / `OFF-YYMMDD-###` | |
| 연차   | `LV-YYMMDD-###` | |
| 비용   | `EXP-YYMMDD-###` | |
| 일정   | `SCH-YYMMDD-###` | |
| 라이선스 | `LIC-YYMMDD-###` | |

---

# 부록 B — 회사코드 정책 (요약)

- 회사코드는 `TV` 또는 `VR` 두 가지뿐.
- 로그인 시 선택 → 세션 전체 고정 → 모든 쿼리에 자동 주입.
- `allowedCompanies` 가 둘 이상인 사용자(주로 ADMIN/MANAGER)는 사이드바 회사 picker 로 통합조회(`ALL`) 모드 전환 가능.
- 공유 마스터(`clients`, `items`, `warehouses`)에는 회사코드 없음 — 두 법인이 같은 데이터를 봅니다.
- 그 외 업무 데이터는 모두 회사코드 필수 — 인덱스로 강제.

---

# 부록 C — 3언어 자동번역 (요약)

자유서술 필드(AS 증상·사건평가·메모·요청 등)는 모두 **3언어 컬럼 + originalLang** 형태로 저장됩니다.

- 사용자가 한 언어로만 입력 → 저장 시 Claude API 가 나머지 2개 언어를 자동 번역.
- 표시는 사이드바에서 선택한 언어로 즉시 보여 주고, 「원문 보기」 토글로 다른 언어를 확인.
- 번역 결과 수정은 관리자만 가능.
- 사람 이름·고유명사도 동일하게 처리되지만 음역이 어색할 수 있음 — 필요 시 직접 입력 권장.
