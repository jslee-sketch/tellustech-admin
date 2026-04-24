import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import type { FileCategory } from "@/generated/prisma/client";

// 로컬 파일 저장소 — ./uploads/YYYY/MM/<uuid>.<ext>
// Phase 1-5 에선 로컬만. 프로덕션 이관 시 S3 어댑터로 교체 예정.
// PDF 업로드는 pdf-lib 로 한 번 파싱·재저장(object streams) 하여 기본 압축 효과.
// Ghostscript 수준의 압축(50~80%)은 추후 서버 의존성 추가해 래핑 예정.

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export type StoredFile = {
  storedPath: string;      // uploads 루트 기준 상대경로 — DB 에 저장
  absolutePath: string;    // 서버 파일시스템 절대경로
  sizeBytes: number;
  compressed: boolean;
};

export function guessCategory(mimeType: string): FileCategory {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "PHOTO";
  return "OTHER";
}

export async function saveUploadedFile(file: File): Promise<StoredFile> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const isPdf = file.type === "application/pdf";

  let finalBytes = bytes;
  let compressed = false;
  if (isPdf) {
    try {
      const doc = await PDFDocument.load(bytes, { updateMetadata: false });
      const saved = await doc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });
      // object streams 재저장으로 작아진 경우만 교체
      if (saved.byteLength < bytes.byteLength) {
        finalBytes = Buffer.from(saved);
        compressed = true;
      }
    } catch (err) {
      // 손상/암호화된 PDF 는 압축 생략하고 원본 저장
      console.warn("[files] PDF compress skipped:", err);
    }
  }

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dirRel = path.join(yyyy, mm);
  const dirAbs = path.join(UPLOAD_ROOT, dirRel);
  await fs.mkdir(dirAbs, { recursive: true });

  const ext = path.extname(file.name).toLowerCase().slice(0, 8) || "";
  const fileName = `${randomUUID()}${ext}`;
  const relPath = path.join(dirRel, fileName).replaceAll("\\", "/");
  const absPath = path.join(dirAbs, fileName);

  await fs.writeFile(absPath, finalBytes);
  return {
    storedPath: relPath,
    absolutePath: absPath,
    sizeBytes: finalBytes.byteLength,
    compressed,
  };
}

export function resolveStoredPath(storedPath: string): string {
  // 경로 이스케이프 방지 — 저장된 경로를 항상 UPLOAD_ROOT 하위로 고정
  const abs = path.resolve(UPLOAD_ROOT, storedPath);
  if (!abs.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid stored path");
  }
  return abs;
}
