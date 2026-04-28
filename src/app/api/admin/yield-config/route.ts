import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-utils";

const DEFAULT = {
  thresholdBlue: 120,
  thresholdGreen: 80,
  thresholdYellow: 50,
  thresholdOrange: 30,
  fraudAlertThreshold: 30,
};

async function ensureConfig() {
  const existing = await prisma.yieldConfig.findFirst();
  if (existing) return existing;
  return prisma.yieldConfig.create({ data: { id: "default", ...DEFAULT } });
}

export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN") return forbidden("admin_only");
    const cfg = await ensureConfig();
    return ok({ config: cfg });
  });
}

function parseInt0(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= 1000 ? n : null;
}

export async function PUT(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN") return forbidden("admin_only");
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;

    const blue = parseInt0(p.thresholdBlue);
    const green = parseInt0(p.thresholdGreen);
    const yellow = parseInt0(p.thresholdYellow);
    const orange = parseInt0(p.thresholdOrange);
    const fraud = parseInt0(p.fraudAlertThreshold);
    if (blue === null || green === null || yellow === null || orange === null || fraud === null) {
      return badRequest("invalid_input", { field: "thresholds", reason: "required_int_0_to_1000" });
    }
    // 단조성 검증 — blue > green > yellow > orange
    if (!(blue > green && green > yellow && yellow > orange && orange > 0)) {
      return badRequest("invalid_input", { field: "thresholds", reason: "must_be_descending" });
    }

    try {
      const cfg = await ensureConfig();
      const updated = await prisma.yieldConfig.update({
        where: { id: cfg.id },
        data: { thresholdBlue: blue, thresholdGreen: green, thresholdYellow: yellow, thresholdOrange: orange, fraudAlertThreshold: fraud },
      });
      return ok({ config: updated });
    } catch (err) {
      return serverError(err);
    }
  });
}
