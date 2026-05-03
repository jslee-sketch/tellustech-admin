@AGENTS.md

# Tellustech ERP — 프로젝트 규칙

단일 기준 문서: `docs/CLAUDE_CODE_개발시작가이드.md`. 아래 규칙과 충돌 시 가이드가 우선.

## 0. 커밋 4룰 (사용자 정착 2026-05-02 — 위반 시 재작업)

매 변경/커밋마다 **4개 모두** 충족해야 PASS:

1. **버전 갱신**: `src/lib/version.ts` 의 `VERSION` + `BUILD_DATE` 즉시 갱신. 사이드바 상단(TTS 로고 아래) 자동 노출. 체계 = `v{MAJOR}.{MINOR}.{PATCH}`.
2. **3개국어 동시**: i18n 키는 vi/en/ko 모두 누락 0건. 매뉴얼은 `docs/manual/A-* + vi/A-*-VI + en/A-*-EN` (B 매뉴얼 동일) 동기 갱신.
3. **매뉴얼 변경이력 갱신**: 본 커밋 내용을 A 매뉴얼 부록 K(변경이력) + B 매뉴얼 변경이력에 **상세히** 추가. 버전 번호 + 날짜 + **2~5줄의 substantive bullet** (단순 "버전 업"이 아니라 무엇이 어떻게 바뀌었는지). 3개 언어 모두.
4. **Chrome 검증**: 타입체크·테스트만으로 PASS 인정 안 됨. Railway 배포 후 라이브 화면 확인까지 완료해야 함.

## 1. 회사코드(company_code) — 멀티컴퍼니 분리

- 회사코드는 `TV` (Tellustech Vina) 또는 `VR` (Vietrental) 두 가지뿐.
- 로그인 시 사용자가 선택 → 세션 전체에 고정 → 모든 쿼리에 `WHERE company_code = :session` **자동** 주입.
- `users.allowed_companies`: 일반=`["TV"]` 또는 `["VR"]`, 관리자/대표=`["TV","VR"]` (관리자는 통합 조회 모드 전환 가능).
- 고객 포탈은 `client_code` 기반, 회사코드 불필요.

**공유 마스터 (company_code 필드 없음)**: `clients`, `items`, `warehouses` — 이것만.

**완전 분리 (company_code 필수 + 인덱스)**: 직원·부서·IT계약·렌탈·AS·교정·매출·매입·급여·인센티브·재경·일정·라이선스 등 그 외 **전부**.

새 테이블을 만들 때 첫 질문: "이건 마스터인가, 업무 데이터인가?" 업무 데이터면 `company_code` 필수.

## 2. S/N(Serial Number) — 전체 시스템 통합 기준키

- S/N이 모듈 간 연결고리. 설계 시 S/N으로 조인 가능해야 함.
- **재고확인 정책**:
  - IT렌탈 → **엄격**: 자사 재고에 S/N이 있어야만 등록 허용.
  - TM렌탈 / 교정 / AS / 매출 / 매입 → **느슨**: 외부 렌탈·고객 지급품 등 재고에 없을 수 있음 → 없으면 경고만 띄우고 진행.
- 재고확인 모드는 `enum StockCheckMode { STRICT, LOOSE }`로 명시하고 UI/백엔드 모두에서 분기.

## 3. 자동 코드 생성 (공통 유틸)

모든 등록 화면은 코드/번호를 자동 생성. 패턴:

| 대상 | 형식 |
|---|---|
| 거래처 | `CL-YYMMDD-###` |
| 품목 | `ITM-YYMMDD-###` |
| 사원 | `TNV-###` (TV) / `VNV-###` (VR) |
| IT계약 | `TLS-YYMMDD-###` / `VRT-YYMMDD-###` |
| AS전표 | `YY/MM/DD-##` (예: `26/04/23-01`) |
| TM렌탈 | `TM-YYMMDD-###` |
| 평가 | `INC-YYMMDD-###` (사건) / `EVAL-YYMMDD-###` (정기) |
| 입사/퇴사 | `ONB-YYMMDD-###` / `OFF-YYMMDD-###` |
| 연차 | `LV-YYMMDD-###` |
| 비용 | `EXP-YYMMDD-###` |
| 일정 | `SCH-YYMMDD-###` |
| 라이선스 | `LIC-YYMMDD-###` |

구현은 `src/lib/code-generator.ts` 등 한 곳에 모으고, 순번은 회사코드·일자 스코프의 시퀀스로 관리.

## 4. AI 3언어 번역 (저장시점)

- 사용자는 베/영/한 아무 언어로 자유 입력.
- 저장 시 Claude API가 **나머지 2개 언어를 자동 번역** → 3개 언어 컬럼에 모두 저장.
- 스키마 관례: 자유서술 필드는 `content_vi`, `content_en`, `content_ko` 3컬럼 + `original_lang` (감지된 원문 언어).
- 조회 시 사용자 설정 언어 컬럼 즉시 표시 + "원문 보기" 토글.
- 적용 대상: AS 내역, 사건평가, 고객 요청, 메모, 채팅, 지연사유 등 **자유서술 필드 전체**.
- 번역 수정은 관리자만 가능.

**채팅** (WebSocket): 전송 시 동일 구조로 3언어 저장. 수신자 표시는 1/2/3개 언어 중 사용자 선택.

## 5. UI — 다크모드 기본

- Tailwind `dark:` 우선 설계. 루트에 `class="dark"` 기본 적용.
- 라이트모드는 옵션이지만, 첫 접근 시 다크로 보여야 함.
- 색상 토큰은 CSS 변수로 중앙 관리 (`src/app/globals.css`).

## 6. 감사 로그 (audit_log)

- 모든 업무 테이블의 INSERT/UPDATE/DELETE는 `audit_log`에 기록 (table, record_id, before, after, user_id, company_code).
- Prisma middleware 또는 공통 레포지토리 계층으로 일괄 처리. 모듈마다 개별 코드 중복 금지.

## 7. 자유 서술 = 번역 필드 / 단답 = 단일 필드

자유서술 필드를 Prisma 모델에 추가할 때는 반드시 3언어 컬럼으로 나누고, 단답(코드/숫자/enum)은 단일 컬럼으로.

## 8. 금지 / 주의

- `docs/` 폴더는 원본 산출물 — 편집 금지 (사용자 업로드 전용).
- 가이드에 명시되지 않은 폴더/모듈을 임의 추가하지 말 것. 가이드의 10모듈 구조에 먼저 매핑.
- `.env`는 커밋 금지 (`.gitignore`에 이미 포함).

## 9. 필드명 매핑 참고 (E2E에서 확인됨, 리팩토링 시 참조)

테스트 계획서·가이드 문서와 실제 API/스키마 간 필드명이 다른 지점. 새 모듈·클라이언트 추가할 때 실제 스키마 기준으로 작성할 것.

| 영역 | 계획/자연어 명칭 | **실제 API/스키마** |
|---|---|---|
| 세션 쿠키 | `tts-session` | `tts_session` (underscore) |
| Schedule | `name`, `repeatType` | `title`, `dueAt` (required) |
| License | `expiresAt`만 | `name` + `acquiredAt` + `expiresAt` 3종 required |
| InventoryTransaction | `type: "IN"/"OUT"/"TRANSFER"` | `txnType: "IN"/"OUT"/"TRANSFER"` (TRANSFER = External↔External 통과) |
| InventoryTransaction 사유 모델 | 16-value `reason` enum 단일 | **4축 진리표 — `(txnType × referenceModule × subKind × ownerType)`**. legacy `reason` 컬럼은 호환용으로만 자동 채움. 진리표 정의는 `src/lib/inventory-rules.ts` `BASE_RULES` 참조 |
| InventoryTransaction 신규 필드 | — | `referenceModule` (RENTAL/REPAIR/CALIB/DEMO/TRADE/CONSUMABLE), `subKind` (REQUEST/RETURN/PURCHASE/SALE/BORROW/LEND/OTHER/CONSUMABLE), `fromClientId`, `toClientId` |
| InventoryItem 자산 추적 | — | `ownerType` (COMPANY/EXTERNAL_CLIENT) + `ownerClientId` + `currentLocationClientId/SinceAt` (외부 위탁 위치) + `archivedAt` (반환·매각 후 비활성). EXTERNAL_CLIENT 자산은 라벨에 검은 [EX] 배지 |
| Purchase | `clientId` | `supplierId` |
| TmRental 자동코드 필드 | `contractNumber` | `rentalCode` (TM-YYMMDD-###) |
| Incident | `descriptionVi/En/Ko` | `contentVi/contentEn/contentKo` + 최소 한 언어 **50자 이상** + 작성자 empCode 필수 |
| Stock GET 쿼리파라미터 | `itemId=/warehouseId=` | `item=/warehouse=` |
| Stock 응답 | `quantity` | `{ stock: [{ ..., onHand }] }` |

## Phase 상태

- Phase 1~5 완료. 최근 추가된 모듈은 아래 부록 참조.

### 최근 추가 (2026-04 ~)

- **SNMP 자동수집** (Phase 1~3): Windows Agent (Node 18 + pkg 단일 exe), 토큰 인증, 사용량 확인서 6단계 워크플로 + PDF 생성, GitHub Releases 자동 업데이트.
- **소모품 적정율 분석**: `Item.expectedYield`, `ItContractEquipment.actualCoverage`, `YieldAnalysis`, `YieldConfig`, `YieldBadge` enum, `NotificationType.YIELD_FRAUD_SUSPECT`. `/admin/yield-analysis` 4탭 대시보드 + 검색 필터 + 계약별 그룹 펼치기. 매월 1일 02:00 KST `/api/jobs/yield-analysis-monthly` 자동 계산. 부정 의심(RED) 시 ADMIN 자동 알림 (3언어). 컬러 토너 공식: `MIN(sum_C, sum_M, sum_Y)` (1 페이지 = C+M+Y 동시 소모).
- **QR 라벨/스캔 개선**: 모바일 카메라 인식률 (qrbox 동적, focusMode continuous, fps 15), 품목 매핑 server fallback (`/api/master/items?q=`), 인쇄 시 사이드바 숨김 + 헤더(매입처·매입번호·매입일자·출력일자) 자동 출력, 스캔 사유 옵션 매입/매출/반품 차단.
- **사이드바·대시보드 재구성** (13그룹): 마스터·영업·렌탈·A/S·재고·인사·재경·회의·캘린더·메시징·**고객 포탈 운영(NEW)**·**통계(NEW)**·관리. SNMP/사용량확인서/적정율은 렌탈 그룹으로, 견적은 영업 그룹으로, 마감은 재경 그룹으로, 품목호환은 마스터 그룹으로 이동. 대시보드 12개 NavCard 가 사이드바와 1:1.
- **Cron**: `/api/jobs/portal-news-generate` (월요일 09:00 KST · async fire-and-forget · Promise.allSettled). `/api/jobs/yield-analysis-monthly` (매월 1일 02:00 KST).

### 최근 추가 (2026-05 ~)

- **재고사유 — 16-value enum → 4축 진리표** (Phase 1~2): `(txnType × referenceModule × subKind × ownerType)` 키로 `BASE_RULES` 20행 정의 (`src/lib/inventory-rules.ts`). 각 행이 `masterAction` (NEW/MOVE/ARCHIVE/TRANSFER_LOC/NONE) + `autoPurchaseCandidate` + `autoSalesCandidate` + `requireSerialNumber` + `setExternalLocation` + `externalAssetLabel` 결정. 시나리오 6/7/10/11 은 `ownerType` 별도 분기. `ClientRuleOverride` 테이블이 거래처별 예외 허용. legacy `reason` 컬럼은 `deriveLegacyReason()` 으로 자동 채움.
- **외부 자산 추적**: `InventoryItem.ownerType`/`ownerClientId`/`inboundReason`/`inboundAt`/`currentLocationClientId`/`currentLocationSinceAt`/`archivedAt` 추가. 외부 자산(고객 수리·교정·데모기 등)이 자사 창고에 입고되면 EXTERNAL_CLIENT 로 등록되어 매입금 미발생. 외부 위탁 시 `currentLocationClientId` 설정. 반환·매각 시 `archivedAt` 설정.
- **PayableReceivable 자동 DRAFT**: `referenceModule × subKind` 조합이 `autoPurchaseCandidate`/`autoSalesCandidate` 인 거래는 매입/매출 트랜잭션 직후 `PayableReceivable` 행을 `DRAFT` 상태(amount=0)로 자동 생성. `sourceInventoryTxnId` 로 역추적. 재경 담당자가 금액 확정 시 `OPEN` 으로 승급.
- **다행 입출고 등록 + 시나리오 콤보**: `/inventory/transactions/new` 가 카드 레이아웃으로 한 번에 100~수백 라인 처리 (`/api/inventory/transactions/bulk` · `prisma.$transaction({ timeout: 30_000 })`). reason 단일 드롭다운 → 22개 `txn.combo.*` 시나리오 콤보 (`COMBOS_BY_TYPE`). `referenceModule` + `subKind` 자동 매핑.
- **QR 다중 스캔 (Phase 2.8)**: `/inventory/scan` 이 스캐너 상시 가동 + 스캔 시마다 `/api/inventory/sn/[sn]/state` 호출하여 마스터 상태(`NEW` / `OWN_IN_STOCK` / `OWN_AT_EXTERNAL` / `EXTERNAL_IN_STOCK` / `EXTERNAL_AT_VENDOR` / `ARCHIVED`)에 따른 추천 시나리오 도출. 스캔 누적 → 1 이벤트로 `/api/inventory/transactions/bulk` 일괄 등록. 첫 스캔이 `txnType` + `comboKey` + 창고/거래처 자동 프리필.
- **QR 라벨 NIIMBOT B21 통합** (Phase 3): 3종(60×40/50×35/40×30) 규격 → **단일 70×50mm** (`LABEL_SPEC` 단일 상수). `@page size: 50mm 70mm; margin: 0;` + `page-break-after: always` 로 라벨 1장 = 1페이지. QR 데이터는 JSON `{itemCode, serialNumber, contractNumber}` 유지. `@media print { color: #000 !important; background: transparent !important; }` 로 다크모드 토큰 무력화.
- **컬러 채널 배지 in 라벨**: `Item.colorChannel` (BLACK/CYAN/MAGENTA/YELLOW/DRUM/FUSER/NONE) 이 라벨에 자동 표시 — itemCode 옆 작은 컬러 배지 (`K/C/M/Y/D/F`). `-webkit-print-color-adjust: exact` 로 컬러 전사지 사용 시 그대로 컬러 인쇄 (현재 흑백 전사지에서는 OS 가 grayscale 자동 변환되지만 글자는 식별 가능). 추가 입력 단계 없음 — 품목 등록 시 채널 지정만 하면 매입·재고·라벨이 일관 적용.
- **라벨 일괄 인쇄**: `/inventory/stock` S/N 탭 + `/master/items` 리스트에 체크박스 + `🏷 라벨 인쇄 (N장)` 헤더 버튼. 행별 🏷 아이콘은 항상 노출(모바일 대응). `/master/items/[id]` 단건 페이지에도 🏷 버튼. 라벨 페이지는 `?sns=SN1,SN2` / `?items=ITM1,ITM2` / `?purchaseId=...` / `?itemCode=&sn=` 4가지 프리필 모드 지원.
- **인벤토리 흐름 전수정비**: `src/lib/amendments.ts` (IT 계약 ADD/REPLACE/REMOVE), `src/lib/adjustments.ts` (매출/매입 RETURN·EXCHANGE), `src/app/api/sales|purchases/route.ts` (TRADE 강제 S/N + 마스터 매칭 + archive), `src/app/api/as-dispatches/[id]/parts/route.ts` (CONSUMABLE) 모두 `referenceModule`+`subKind` 작성. 단건 `/api/inventory/transactions` 도 `deriveRefModule()` + `deriveSubKind()` 헬퍼로 호환.
- **포탈 QR 스캔**: `/portal/as-request` 와 `/portal/supplies-request` 에 `<QrScanModal>` 정사각형 스캐너 추가 (88% qrbox · `aspect-square` · `max-w-md`). 스캐너 디코드 → 장비/품목 자동 매칭.
- **E2E 테스트 인프라**: `scripts/test-inv-e2e.ts` — 6 거래처/2 창고/5 품목/4 마스터 시드 + 23 시나리오 4 라운드 의존성 정렬 실행 + `BASE_RULES` masterAction + PR DRAFT 카운트 검증 + 교차검증. 결과 31/31 PASS.

### 추가 작업 (2026-05 후반)

- **TRANSFER 자사↔자사** + 외부↔외부 별도 행 5개 추가 (`TRANSFER|TRADE|OTHER|COMPANY` MOVE / `TRANSFER|*|OTHER|EXTERNAL_CLIENT` × 4 TRANSFER_LOC). bulk endpoint 가 `from/toWarehouseId` (Internal) 또는 `from/toClientId` (External) 둘 중 하나 모드 자동 분기 + 동일 endpoint 차단. `/inventory/transactions/new` TRANSFER 콤보 첫줄에 "내부재고이동". `/api/inventory/sn/[sn]/state` OWN_IN_STOCK 추천에 TRANSFER 추가.
- **매입 반품 + 폐기/스크랩 룰** (`OUT|TRADE|RETURN|COMPANY` ARCHIVE, `OUT|TRADE|OTHER|COMPANY` ARCHIVE). `/inventory/transactions/new` 의 OUT 콤보에 매입반품·폐기·매출 3종 명시 노출. OWN_IN_STOCK 추천에도 자동 포함.
- **비품 (SUPPLIES) itemType 추가**: 4번째 `ItemType.SUPPLIES` (A4용지·청소도구 등 수량 기반 관리). bulk endpoint 가 `itemType=SUPPLIES` 라인은 S/N 비필수로 자동 처리. `/master/items` 폼 + 리스트 필터 + `bulk-import` 모두 SUPPLIES 허용.
- **QR 인식률 개선**: 라벨 페이로드 JSON → S/N 단독 (또는 itemCode), `errorCorrectionLevel "M"`, `width 1024`, `image-rendering: pixelated`, canvas `imageSmoothingEnabled = false`. 화면 미리보기 50% → 100% 실제크기 전체 라벨. 외부 스캐너 앱과 인식률 동등.
- **스캐너 dedupe**: `/inventory/scan` 의 fps 15 콜백 폭주 차단 (`inflightSnRef` Set + 1.5s 쿨다운 + 800ms 녹색 플래시 + vibrate 60ms). `QrScanModal` 도 `decodedRef` 단발 가드 + 600ms 플래시 후 닫힘.
- **스캐너 시작 버튼 UX**: 카메라 영역 내부 중앙 큰 오버레이로 이동 (모바일에서 fold 위에 노출). 이모지 중복 제거.
- **카메라 입력 정규식 버그**: `text.replace(/[ -​-‏﻿]/g, "")` 가 U+0020-U+200B 범위로 해석되어 ASCII 전부 삭제 → `text.replace(/[​-‏﻿]/g, "")` 로 zero-width 만 제거.
- **라벨 50×70mm 세로형**: `@page size: 50mm 70mm; margin: 0;` + 정사각 QR 44mm 상단 + 정보 하단 (itemCode + 컬러배지 + EX/TLS / itemName / S/N / 위치). 배지 0.3mm 검정 테두리로 흑백 인쇄 시에도 식별. 모바일 PNG 다운로드 (200dpi canvas, imageSmoothingEnabled=false).
- **재고조정·분해·조립 4행 추가** (진리표 30 → 34행): `IN|TRADE|OTHER|COMPANY` (재고조정 발견 NEW), `OUT|TRADE|LOSS|COMPANY` (재고조정 유실 ARCHIVE), `OUT|TRADE|SPLIT|COMPANY` (분해 ARCHIVE), `IN|TRADE|ASSEMBLE|COMPANY` (조립 NEW). 새 SubKind: `LOSS / SPLIT / ASSEMBLE`. 별도 페이지 없이 `/inventory/transactions/new` 콤보 4종으로 통합 — 분해는 본체 라인 + 부품별 IN 라인 한 트랜잭션, 조립은 그 반대.

## 입출고 시나리오 가이드 (2026-05 기준 진리표 30행 정리)

사용자가 `/inventory/transactions/new` 또는 `/inventory/scan` 에서 입출고를 등록할 때, 다음 흐름으로 시나리오를 선택합니다.

### 1단계: 거래 유형 (`txnType`) 선택

| 유형 | 의미 | 헤더 입력 |
|---|---|---|
| **IN (입고)** | 자사 창고로 들여옴 (자사 매입·외주 의뢰 회수·고객 자산 입고 등) | `toWarehouseId` 필수 + 외부 자산이면 `clientId` |
| **OUT (출고)** | 자사 창고에서 나감 (매출·외주 의뢰·고객 반환·폐기·매입반품 등) | `fromWarehouseId` + `clientId` 필수 |
| **TRANSFER (이동)** | 위치만 이동 (자사창고↔자사창고 또는 외주↔외주) | 모드별 분기 (아래) |

### 2단계: 시나리오 콤보 선택 (`referenceModule × subKind`)

#### IN 콤보 (입고)

| 콤보 라벨 | 진리표 키 | masterAction | 자동 PR | 비고 |
|---|---|---|---|---|
| 렌탈 — 자사 회수 | `IN\|RENTAL\|RETURN\|COMPANY` | MOVE | — | 외부에 있던 자사 자산이 돌아옴 |
| 렌탈 — 외주에서 빌림 | `IN\|RENTAL\|BORROW\|EXTERNAL_CLIENT` | NEW | 매입후보 | 외부 자산 신규 등록 |
| 수리 — 고객 의뢰 | `IN\|REPAIR\|REQUEST\|EXTERNAL_CLIENT` | NEW | — | 고객 자산 입고 |
| 수리 — 외주수리 후 회수 (자사) | `IN\|REPAIR\|RETURN\|COMPANY` | MOVE | 매입후보 | 외주 수리비 청구 |
| 수리 — 외주수리 후 회수 (고객) | `IN\|REPAIR\|RETURN\|EXTERNAL_CLIENT` | MOVE | — | 고객 자산이 외부 수리 거쳐 우리에게 다시 옴 |
| 교정 — 고객 의뢰 | `IN\|CALIB\|REQUEST\|EXTERNAL_CLIENT` | NEW | — | 고객 자산 입고 |
| 교정 — 외부교정 후 회수 (자사) | `IN\|CALIB\|RETURN\|COMPANY` | MOVE | 매입후보 | 외부 교정비 |
| 교정 — 외부교정 후 회수 (고객) | `IN\|CALIB\|RETURN\|EXTERNAL_CLIENT` | MOVE | — | 고객 자산 |
| 데모 — 외부에서 빌림 | `IN\|DEMO\|BORROW\|EXTERNAL_CLIENT` | NEW | — | 외부 데모기 입고 |
| 데모 — 자사 데모 회수 | `IN\|DEMO\|RETURN\|COMPANY` | MOVE | — | 자사 데모기 복귀 |
| 매입 — 신규 | `IN\|TRADE\|PURCHASE\|COMPANY` | NEW | — | Purchase 모듈에서 자동 |
| 매출 반품 회수 | `IN\|TRADE\|RETURN\|COMPANY` | MOVE | — | 고객 환불 시 자사 창고 입고 |
| **재고조정 — 발견** | `IN\|TRADE\|OTHER\|COMPANY` | NEW | — | 실사 시 장부 외 실물 발견 |
| **조립 (Assemble)** | `IN\|TRADE\|ASSEMBLE\|COMPANY` | NEW | — | 본체 NEW + 부품 별도 라인 OUT/TRADE/OTHER |

#### OUT 콤보 (출고)

| 콤보 라벨 | 진리표 키 | masterAction | 자동 PR | 비고 |
|---|---|---|---|---|
| 렌탈 — 외주에 반납 | `OUT\|RENTAL\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | — | 빌렸던 외부 자산 반납 |
| 렌탈 — 자사 → 고객 | `OUT\|RENTAL\|LEND\|COMPANY` | TRANSFER_LOC | 매출후보 | 자사 자산 렌탈 출고 |
| 수리 — 자사 외주 의뢰 | `OUT\|REPAIR\|REQUEST\|COMPANY` | TRANSFER_LOC | — | 자사 자산을 외주처로 |
| 수리 — 고객자산 외주 위탁 | `OUT\|REPAIR\|REQUEST\|EXTERNAL_CLIENT` | TRANSFER_LOC | — | 고객 자산을 다시 외주로 |
| 수리 — 고객 반환 (수리비 청구) | `OUT\|REPAIR\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | 매출후보 | 수리 완료 |
| 교정 — 자사 외주 의뢰 | `OUT\|CALIB\|REQUEST\|COMPANY` | TRANSFER_LOC | — | |
| 교정 — 고객자산 외주 위탁 | `OUT\|CALIB\|REQUEST\|EXTERNAL_CLIENT` | TRANSFER_LOC | — | |
| 교정 — 고객 반환 (교정비 청구) | `OUT\|CALIB\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | 매출후보 | |
| 데모 — 자사 → 고객 | `OUT\|DEMO\|LEND\|COMPANY` | TRANSFER_LOC | — | |
| 데모 — 외부에 반환 | `OUT\|DEMO\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | — | |
| **매출 — 자사 자산 출고** | `OUT\|TRADE\|SALE\|COMPANY` | ARCHIVE | — | Sales 모듈에서 자동 |
| **매입 반품 — 공급처로 반환** | `OUT\|TRADE\|RETURN\|COMPANY` | ARCHIVE | — | 사 둔 자산을 supplier 에 반환 |
| **폐기 / 스크랩** | `OUT\|TRADE\|OTHER\|COMPANY` | ARCHIVE | — | IRREPARABLE 자산 처분 |
| **재고조정 — 유실** | `OUT\|TRADE\|LOSS\|COMPANY` | ARCHIVE | — | 실사 시 부재 발견 |
| **분해 (Split)** | `OUT\|TRADE\|SPLIT\|COMPANY` | ARCHIVE | — | 본체 archive + 부품 별도 라인 IN/TRADE/OTHER |
| 소모품 출고 (AS) | `OUT\|CONSUMABLE\|CONSUMABLE\|COMPANY` | NONE | — | AS 출동, S/N 비필수 |

#### TRANSFER 콤보 (이동)

| 콤보 라벨 | 진리표 키 | masterAction | 모드 | 입력 |
|---|---|---|---|---|
| **내부재고이동** (자사 ↔ 자사) | `TRANSFER\|TRADE\|OTHER\|COMPANY` | MOVE | Internal | `from/toWarehouseId` 둘 다 |
| 외부 ↔ 외부 (렌탈) | `TRANSFER\|RENTAL\|OTHER\|EXTERNAL_CLIENT` | TRANSFER_LOC | External | `from/toClientId` 둘 다 |
| 외부 ↔ 외부 (수리) | `TRANSFER\|REPAIR\|OTHER\|EXTERNAL_CLIENT` | TRANSFER_LOC | External | 〃 |
| 외부 ↔ 외부 (교정) | `TRANSFER\|CALIB\|OTHER\|EXTERNAL_CLIENT` | TRANSFER_LOC | External | 〃 |
| 외부 ↔ 외부 (데모) | `TRANSFER\|DEMO\|OTHER\|EXTERNAL_CLIENT` | TRANSFER_LOC | External | 〃 |

### 3단계: itemType 별 S/N 처리

- **PRODUCT / CONSUMABLE / PART** → S/N 필수 (CONSUMABLE 출고 sub-kind=`CONSUMABLE` 만 예외)
- **SUPPLIES** → 모든 흐름에서 S/N 비필수 (수량 기반)

### 4단계: QR 스캔 흐름의 자동 추천

`/inventory/scan` 에서 S/N 을 스캔하면 `/api/inventory/sn/[sn]/state` 가 마스터 상태에 따라 적합한 시나리오를 자동 추천:

| 마스터 상태 | 의미 | 추천 시나리오 |
|---|---|---|
| **NEW** | DB 에 마스터 없음 (신규 S/N) | IN/RENTAL/BORROW, IN/REPAIR/REQUEST, IN/CALIB/REQUEST, IN/DEMO/BORROW, IN/TRADE/PURCHASE |
| **OWN_IN_STOCK** | 자사 자산이 자사 창고에 있음 | OUT/RENTAL/LEND, OUT/REPAIR/REQUEST, OUT/CALIB/REQUEST, OUT/DEMO/LEND, **OUT/TRADE/SALE**, **OUT/TRADE/RETURN (매입반품)**, **OUT/TRADE/OTHER (폐기)**, **OUT/TRADE/LOSS (유실)**, **OUT/TRADE/SPLIT (분해)**, **TRANSFER/TRADE/OTHER (내부이동)** |
| **OWN_AT_EXTERNAL** | 자사 자산이 외부 위탁 중 | IN/RENTAL/RETURN, IN/REPAIR/RETURN, IN/CALIB/RETURN, IN/DEMO/RETURN |
| **EXTERNAL_IN_STOCK** | 고객 자산이 자사 창고 보관 | OUT/REPAIR/RETURN, OUT/CALIB/RETURN, OUT/RENTAL/RETURN, OUT/DEMO/RETURN, OUT/REPAIR/REQUEST, OUT/CALIB/REQUEST |
| **EXTERNAL_AT_VENDOR** | 고객 자산이 외주에 위탁 중 | IN/REPAIR/RETURN, IN/CALIB/RETURN |
| **ARCHIVED** | 비활성 (반환·매각·폐기 완료) | (추천 없음) |

### 향후 미구현 항목

- **법인 간 이관 (TV ↔ VR)** — 거래처 매입/매출 로직으로 처리 (별도 워크플로 불필요 — 사용자 결정).
- **재고조정 / 분해·조립** — 별도 페이지 신설 없이 `/inventory/transactions/new` 의 IN/OUT 콤보로 통합 처리. 단순 워크플로 우선.
  - 재고조정 발견 = `IN/TRADE/OTHER` (NEW), 유실 = `OUT/TRADE/LOSS` (ARCHIVE)
  - 분해 = `OUT/TRADE/SPLIT` (본체 archive) + 부품별 `IN/TRADE/OTHER` 라인 추가
  - 조립 = `IN/TRADE/ASSEMBLE` (본체 NEW) + 부품별 `OUT/TRADE/OTHER` 라인 추가
- **부모-자식 자산 추적 (분해/조립)** — 향후 `InventoryItem.parentSerialNumber` 칼럼 추가로 본체 ↔ 부품 관계 영속화 가능. 현재는 트랜잭션 노트로 수동 추적.
