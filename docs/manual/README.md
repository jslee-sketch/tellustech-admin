# Tellustech ERP — 사용설명서 (3권 구성)

본 폴더는 ERP 사용자/관리자/고객포탈 매뉴얼의 **단일 진본**(source of truth)입니다.
원본은 Markdown 으로 작성·검토하고, Pandoc 으로 `.docx` + `.pdf` 를 동시 빌드합니다.

## 3권 구조

| 책 | 대상 | 분량 | 파일 |
|---|---|---|---|
| 📕 A — 사용설명서 | 일반 사원/대리/매니저 | 50~60p | `A-employee-manual.md` |
| 📗 B — 관리자 매뉴얼 | ADMIN / MANAGER | 15~20p | `B-admin-manual.md` |
| 📘 C — 고객 포탈 가이드 | 고객사 담당자 | 5~8p | `C-portal-guide.md` |

## 디렉터리

```
docs/manual/
├── README.md                  ← 이 파일
├── A-employee-manual.md
├── B-admin-manual.md
├── C-portal-guide.md
├── assets/                    ← 스크린샷 (Phase 2 잠금/체크박스 완료 후 일괄 캡처)
└── build.sh                   ← Pandoc 빌드 스크립트
```

## 빌드

전제: Pandoc + xelatex + Noto Sans CJK KR 폰트 설치.

```bash
bash docs/manual/build.sh
```

→ `dist/` 에 `A-사용설명서.docx`, `A-사용설명서.pdf`, `B-관리자매뉴얼.{docx,pdf}`, `C-고객포탈가이드.{docx,pdf}` 6개 파일 생성.
빌드 산출물(`dist/`)은 `.gitignore` 처리.

## 검토자 워크플로우

1. **작성**: `.md` 파일 git 커밋
2. **빌드**: `bash build.sh` → `.docx/.pdf` 자동 생성
3. **전달**: `.docx` 파일을 검토자에게 (Track Changes 사용 가능)
4. **반영**: 원본 `.md` 수정 → 재빌드

## 진행 순서 권고

C(고객포탈, 5~8p) → A(사내, 50~60p) → B(관리자, 15~20p) → 부록 순.
가벼운 책부터 형식·톤을 확정하고 본권으로 확장합니다.

## 동기화 포인트

- Phase 2 (잠금/회계마감/휴지통/감사로그/체크박스 권한) 진행 중인 다른 창 작업과
  관리자편(책 B) 내용이 직접 연동됩니다. B 부 1~5부는 그쪽 정책이 굳어진 후 작성.
- 스크린샷은 Phase 2 UI 변경이 끝난 후 일괄 캡처 → `assets/` 에 배치.
