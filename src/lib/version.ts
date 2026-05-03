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

export const VERSION = "v2.9.1";
export const BUILD_DATE = "2026-05-04";
export const VERSION_NOTE = "100 시나리오 E2E 시드 + 재무제표 4종 보강 (TB 30 계정·5111/5113/5117 매출 분리·VAT 분개·비용 6423~6429 세분화·211 유형자산·차입·자본금) + 클라이언트 5 버그 수정 (j.data 이중래퍼/URL query/cache:no-store/CF 투자·재무 섹션/프린트 색상 강제) + 정합성 11/11 + Chrome 7화면 PASS";
