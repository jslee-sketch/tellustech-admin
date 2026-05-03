#!/usr/bin/env bash
# Tellustech ERP 사용설명서 빌드 스크립트
# 전제: pandoc, xelatex (TeX Live or MiKTeX), Noto Sans CJK KR 폰트 설치
#
# 출력: dist/ 폴더에 .docx + .pdf 동시 생성

set -euo pipefail
cd "$(dirname "$0")"

OUT="../../dist/manual"
mkdir -p "$OUT"

# 한·중·일 폰트 (필요 시 시스템 가용 폰트로 교체)
CJK_FONT="Noto Sans CJK KR"

build_one() {
  local src="$1"     # 예: A-employee-manual.md
  local stem="$2"    # 예: A-사용설명서

  echo "▶ Building $stem ..."

  # .docx
  pandoc "$src" \
    --from=markdown \
    --to=docx \
    --toc --toc-depth=2 \
    -o "$OUT/${stem}.docx"

  # .pdf (xelatex + CJK)
  pandoc "$src" \
    --from=markdown \
    --pdf-engine=xelatex \
    --toc --toc-depth=2 \
    -V mainfont="$CJK_FONT" \
    -V CJKmainfont="$CJK_FONT" \
    -V geometry:margin=20mm \
    -o "$OUT/${stem}.pdf"

  echo "  ✓ $OUT/${stem}.docx"
  echo "  ✓ $OUT/${stem}.pdf"
}

build_one "A-employee-manual.md" "A-사용설명서"
build_one "B-admin-manual.md"     "B-관리자매뉴얼"
build_one "C-portal-guide.md"     "C-고객포탈가이드"

echo ""
echo "✅ All manuals built into $OUT"
