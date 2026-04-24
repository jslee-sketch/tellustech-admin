import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { guessCategory, saveUploadedFile } from "@/lib/files";

// POST /api/files — multipart/form-data 업로드
// 필드:
//   file (required)      : 업로드 파일
//   category (optional)  : PDF | PHOTO | SIGNATURE | RECEIPT | OTHER (자동 판별 기본)
// 응답:
//   { id, storedPath, sizeBytes, compressed, category }

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    const form = await request.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }

    const categoryInput = form.get("category");
    const category =
      typeof categoryInput === "string" && categoryInput.length > 0
        ? (categoryInput as ReturnType<typeof guessCategory>)
        : guessCategory(file.type || "application/octet-stream");

    const stored = await saveUploadedFile(file);

    const record = await prisma.file.create({
      data: {
        uploaderId: session.sub,
        category,
        originalName: file.name,
        storedPath: stored.storedPath,
        mimeType: file.type || null,
        sizeBytes: stored.sizeBytes,
        compressed: stored.compressed,
      },
    });

    return NextResponse.json({
      id: record.id,
      storedPath: record.storedPath,
      sizeBytes: record.sizeBytes,
      compressed: record.compressed,
      category: record.category,
    });
  });
}
