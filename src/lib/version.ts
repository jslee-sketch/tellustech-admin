// ============================================================
// Tellustech ERP — Build Version
//
// 룰 (사용자 정착 2026-05-02):
//  ① 모든 변경사항/커밋마다 이 파일의 VERSION + BUILD_DATE 갱신.
//  ② 사이드바 상단에 즉시 노출.
//  ③ 매뉴얼 (A/B + 3언어) 변경이력 동기 갱신.
//  ④ Chrome 검증 통과해야 PASS.
//
// 버전 체계: vMAJOR.MINOR.PATCH
//   MAJOR = 큰 모델·아키텍처 변경 (예: 16-value enum → 4축 진리표)
//   MINOR = 신규 모듈·진리표 행 추가 (예: SUPPLIES itemType, TRANSFER Internal)
//   PATCH = 버그픽스·UI 개선·i18n·문서 업데이트
// ============================================================

export const VERSION = "v2.9.2";
export const BUILD_DATE = "2026-05-04";
export const VERSION_NOTE = "재무제표 누적(YTD) 모드 + 자금관리 5화면 UX 보강 (정렬·기간·검색·페이징) + 입출금 확인모달 + CF/TB/IS/BS 회계연도 1월부터 누적 + 거래처수익성 정렬·검색·페이징 + 자금현황판 월별추이 폴백·기간선택 + 비용 페이징·날짜필터 + 입출금내역 분리화면 + 대시보드 100시드 KPI 3종 + 레이아웃 <script> → next/script (hydration 오류 해소)";
