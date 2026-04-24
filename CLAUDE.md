@AGENTS.md

# Tellustech ERP — 프로젝트 규칙

단일 기준 문서: `docs/CLAUDE_CODE_개발시작가이드.md`. 아래 규칙과 충돌 시 가이드가 우선.

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
| InventoryTransaction | `type: "IN"/"OUT"` | `txnType: "IN"/"OUT"` |
| InventoryTransaction reason | `"SALE"` 포함 가정 | REASONS = PURCHASE/CALIBRATION/REPAIR/RENTAL/DEMO/RETURN/**CONSUMABLE_OUT** (SALE 없음) |
| Purchase | `clientId` | `supplierId` |
| TmRental 자동코드 필드 | `contractNumber` | `rentalCode` (TM-YYMMDD-###) |
| Incident | `descriptionVi/En/Ko` | `contentVi/contentEn/contentKo` + 최소 한 언어 **50자 이상** + 작성자 empCode 필수 |
| Stock GET 쿼리파라미터 | `itemId=/warehouseId=` | `item=/warehouse=` |
| Stock 응답 | `quantity` | `{ stock: [{ ..., onHand }] }` |

## Phase 상태

- Phase 1-1 완료: Next.js + Prisma + 인증 의존성 세팅.
- Phase 1-2 진행 중: Prisma 스키마 / DB 생성.
- Phase 1-3 이후는 가이드 참조.
