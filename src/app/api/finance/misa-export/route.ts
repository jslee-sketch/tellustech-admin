import { withSessionContext } from "@/lib/session";
import { buildMisaExport } from "@/lib/misa-export";

// GET /api/finance/misa-export?year=2026&month=4 — 해당 월 매출/매입/비용 엑셀 다운로드

export async function GET(request: Request) {
  return withSessionContext(async () => {
    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
    const month = Number(url.searchParams.get("month") ?? new Date().getMonth() + 1);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return new Response("Bad Request", { status: 400 });
    }
    const buf = await buildMisaExport({ year, month });
    // Node Buffer → Uint8Array 로 캐스팅 (Response BodyInit 호환).
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="MISA-export-${year}-${String(month).padStart(2, "0")}.xlsx"`,
      },
    });
  });
}
