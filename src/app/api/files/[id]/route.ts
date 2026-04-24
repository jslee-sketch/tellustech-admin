import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { resolveStoredPath } from "@/lib/files";

// GET /api/files/[id] — 파일 다운로드
// Phase 1-5: 인증된 세션이면 조회 허용. 추후 ACL(거래처/계약 연결 확인)로 강화 예정.

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const abs = resolveStoredPath(file.storedPath);
    try {
      const s = await stat(abs);
      if (!s.isFile()) throw new Error("not a file");
    } catch {
      return NextResponse.json({ error: "file_missing_on_disk" }, { status: 410 });
    }

    const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": file.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`,
        "Content-Length": String(file.sizeBytes ?? 0),
        "Cache-Control": "private, no-store",
      },
    });
  });
}
