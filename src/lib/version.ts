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

export const VERSION = "v2.9.4";
export const BUILD_DATE = "2026-05-04";
export const VERSION_NOTE = "입출고 등록 로직 재구성 (S/N 우선 입력 → 품목 자동 매핑 + 마스터 상태 배지) + 라인 default 빈 배열 + 라인별 itemId/sn/qty 필수 검증 + 정책 D (archived resurrect) + 정책 E (외부 archived 재입고/이동 OK·출고 NG) + 정책 H (입고창고 폴백 toWh→client) + 서버 S/N-품목 일치 검증 (Bulk API)";
