# TELLUSTECH ERP — 개발 문서 패키지

## 사용법
docs 폴더를 Claude Code 프로젝트 루트에 복사 후:
```
docs/CLAUDE_CODE_개발시작가이드.md를 읽고, Phase 1-1부터 시작해줘.
```

## 파일 구조
```
docs/
├── README.md
├── CLAUDE_CODE_개발시작가이드.md   ← 핵심 (이것부터 읽기)
├── planning/
│   ├── 텔러스테크_ERP_기획서_v2.3_최종본_한국어.docx
│   ├── Tellustech_ERP_KeHoach_v2.3_BanCuoi_TiengViet.docx
│   ├── 텔러스테크_ERP_기획서_v2.3_추가사항.docx
│   └── Tellustech_ERP_BoSung_v2.3_TiengViet.docx
├── db/
│   └── 텔러스테크_ERP_DB스키마정의서_v2.3.docx
└── ui-prototypes/
    ├── erp-input-forms.jsx          ← 21개 입력폼
    ├── module1-master-data.jsx      ← 기초등록 결과화면
    ├── module2-rental.jsx           ← 렌탈 결과화면
    ├── module3-5-inventory-cal-as.jsx  ← 재고+교정+AS 결과화면
    └── module6-9-sales-hr-contract.jsx ← 매출+매입+인사+IT계약 결과화면
```

## 핵심 기억사항
- 회사코드(TV/VR) 로그인 시 선택 (ECOUNT 방식)
- 마스터데이터(거래처/품목/창고)만 공유, 나머지 전부 company_code 분리
- S/N이 전체 시스템 통합 기준키
- IT렌탈 S/N = 엄격 재고확인, 나머지 = 느슨 확인
- AS접수 → 목록에서 출동버튼 → 출동등록 (연결 흐름)
- 입출고는 바코드 스캔 방식 (별도 입력폼 없음)
- 저장 시 AI 3개 언어 자동번역 (모든 자유서술 필드)
- 채팅: WebSocket + AI번역 + 1/2/3개 언어 표시 선택
- 모든 등록화면 코드 자동생성
- IT계약/TM렌탈/교정 → 매출 자동반영 버튼
- 매출/매입 저장 → 미수금/미지급 자동생성
- IT계약 S/N + TM품목 + 교정장비 + 매출매입품목 = 수백개+엑셀업로드
- 품목 ≠ 재고 (품목에 바코드/자산정보 없음)
- 44개 DB 테이블
