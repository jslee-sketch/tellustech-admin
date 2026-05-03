// 회계 — 계정과목표 (ChartOfAccount) CRUD
import { NextResponse } from "next/server";
import { withSessionContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-utils";

const TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;

export async function GET(request: Request) {
  return withSessionContext(async () => {
    try {
      const u = new URL(request.url);
      const type = u.searchParams.get("type");
      const onlyActive = u.searchParams.get("active") !== "false";
      const accounts = await prisma.chartOfAccount.findMany({
        where: {
          ...(type && (TYPES as readonly string[]).includes(type) ? { type: type as never } : {}),
          ...(onlyActive ? { isActive: true } : {}),
        },
        orderBy: [{ code: "asc" }],
      });
      return ok({ accounts });
    } catch (e) { return serverError(e); }
  });
}

export async function POST(request: Request) {
  return withSessionContext(async () => {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      const code = String(body.code ?? "").trim();
      const nameVi = String(body.nameVi ?? "").trim();
      const nameEn = String(body.nameEn ?? "").trim();
      const nameKo = String(body.nameKo ?? "").trim();
      const type = String(body.type ?? "");
      if (!code || !nameVi || !(TYPES as readonly string[]).includes(type)) return badRequest("invalid_input");
      const created = await prisma.chartOfAccount.create({
        data: {
          code, nameVi, nameEn, nameKo,
          type: type as never,
          parentCode: body.parentCode ? String(body.parentCode) : null,
          level: Number(body.level ?? 1),
          isLeaf: body.isLeaf !== false,
          standard: (body.standard as never) ?? "VAS",
        },
      });
      return ok({ account: created }, { status: 201 });
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") return NextResponse.json({ error: "duplicate_code" }, { status: 409 });
      return serverError(e);
    }
  });
}
