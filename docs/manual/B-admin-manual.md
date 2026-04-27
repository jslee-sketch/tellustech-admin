---
title: "Tellustech ERP — 관리자 매뉴얼"
subtitle: "ADMIN / MANAGER 전용"
author: "Tellustech IT 팀"
date: "2026-04"
lang: ko
---

# 머리말

> 본 문서는 ADMIN/MANAGER 권한 사용자가 ERP 의 **운영·정책 결정** 기능을 사용할 때 참고합니다.
> 일반 사용자 기능은 별책 **A — 사용설명서**, 고객사용 포탈은 별책 **C — 고객 포탈 가이드**를 참고하세요.

---

# 1부. 관리자 권한 개요

<!-- TODO
  - 권한 레벨: NONE / READ / WRITE
  - 사용자 역할: ADMIN / MANAGER / EMPLOYEE / CLIENT
  - allowedCompanies + 통합조회 모드
  - "권한 없음" 화면 vs "회사 외" 화면 구분
-->

---

# 2부. 권한관리 (`/admin/permissions`)

<!-- TODO — Phase 2 작업 동기화 후 작성
  - 31모듈 × 3레벨 매트릭스 UI
  - 사용자별 / 역할별 권한 부여
  - 회사별 권한 분리 (TV/VR)
  - 권한 변경 즉시 반영 vs 재로그인 필요 여부
-->

---

# 3부. 회계마감 (`/admin/closings`)

<!-- TODO
  - 월별 lock 정책 — 잠긴 월은 매출/매입/조정 등 변경 불가
  - 잠금 해제 절차 (대표 승인 필요 등)
  - 잠금 후 발견된 오류 처리 — 다음 월에 조정 전표
-->

---

# 4부. 휴지통 (`/admin/trash`)

<!-- TODO
  - soft-delete 대상 6개 모델
  - 복구 절차 / 영구삭제 정책
  - 보존 기간 / 자동 비우기 여부
-->

---

# 5부. 감사로그 (`/admin/audit-logs`)

<!-- TODO
  - 21모델 INSERT/UPDATE/DELETE 자동 기록
  - 검색·필터 (모듈/사용자/일자/회사)
  - before/after 비교 뷰
-->

---

# 6부. 호환매핑 (`/admin/item-compatibility`)

<!-- TODO
  - product ↔ consumable/part M:N 매핑
  - 등록 절차 — Excel 일괄 업로드
  - 포털 소모품 요청 화면이 이 매핑을 사용
-->

---

# 7부. 통계 깊이 보기 (`/stats`)

<!-- TODO
  - KPI 카드: 월매출/렌탈수익/AS건수/재고회전
  - SN별 누적 이익 / TCO 분석
  - 부서별·담당자별 실적
  - 엑셀 export
-->

---

# 8부. 시스템 운영

<!-- TODO
  - 일일 백업 / 시점 복원
  - Railway 인스턴스 관리·모니터링
  - 환경변수 관리·시크릿 로테이션
  - 배포·롤백
-->

---

# 9부. 부록

## 9.1 자동코드 표 (전체)

| 대상 | 형식 | 비고 |
|---|---|---|
| 거래처 | `CL-YYMMDD-###` | 일자별 일련번호 |
| 품목   | `ITM-YYMMDD-###` | 일자별 일련번호 |
| **사원** | **`TNV-###` (TV) / `VNV-###` (VR)** | **회사별 일련번호, YYMMDD 미포함** |
| IT계약 | `TLS-YYMMDD-###` / `VRT-YYMMDD-###` | |
| TM렌탈 | `TM-YYMMDD-###` | |
| AS전표 | `YY/MM/DD-##` | 슬래시 구분 |
| 평가   | `INC-YYMMDD-###` / `EVAL-YYMMDD-###` | |
| 입·퇴사 | `ONB-YYMMDD-###` / `OFF-YYMMDD-###` | |
| 연차   | `LV-YYMMDD-###` | |
| 비용   | `EXP-YYMMDD-###` | |
| 일정   | `SCH-YYMMDD-###` | |
| 라이선스 | `LIC-YYMMDD-###` | |

## 9.2 회사코드 정책

- `TV` (Tellustech Vina) / `VR` (Vietrental) 2개만 존재.
- 모든 업무 테이블에 `company_code` 필수, 자동 주입.
- 공유 마스터(`clients`, `items`, `warehouses`)는 회사코드 없음.

## 9.3 S/N 통합 기준키

- S/N 이 모듈 간 연결고리 — 설계 시 S/N 으로 조인 가능해야 함.
- 정책: IT 렌탈 = STRICT (자사 재고 SN 만 허용), 그 외 = LOOSE (외부/고객지급품 허용).

## 9.4 3언어 자동번역

- 자유서술 필드는 `*_vi/_en/_ko` 3컬럼 + `original_lang`.
- 저장 시 Claude API 가 나머지 2개 언어 자동 번역.
- 번역 수정은 관리자만 가능.

## 9.5 서명

- 모바일 손가락 서명 (canvas) 지원.
- `SignatureCanvas` / `SignatureModal` 컴포넌트.
