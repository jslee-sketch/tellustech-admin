import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// CJK 폰트 로더 — Noto Sans CJK KR 한 폰트로 한국어/베트남어/영문/숫자 모두 커버.
// PDF 생성 시 이 헬퍼로 doc 에 폰트 임베드 후 사용.
//
// 폰트 파일은 public/fonts/NotoSansCJKkr-Regular.otf 위치.
// fontkit 등록은 1회 — 같은 doc 인스턴스에 여러 번 임베드해도 안전.

let cachedFontBytes: Uint8Array | null = null;

async function loadFontBytes(): Promise<Uint8Array> {
  if (cachedFontBytes) return cachedFontBytes;
  const filePath = path.join(process.cwd(), "public", "fonts", "NotoSansCJKkr-Regular.otf");
  const buf = await readFile(filePath);
  cachedFontBytes = new Uint8Array(buf);
  return cachedFontBytes;
}

export async function embedCjkFont(doc: PDFDocument) {
  doc.registerFontkit(fontkit);
  const bytes = await loadFontBytes();
  return doc.embedFont(bytes, { subset: true });
}
