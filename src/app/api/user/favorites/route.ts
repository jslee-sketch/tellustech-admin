// 사이드바 즐겨찾기 — 사용자별 서버 저장 (User.sidebarFavorites).
// localStorage 에서 마이그레이션. 브라우저/PC 바뀌어도 유지.

import { withSessionContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-utils";

export async function GET() {
  return withSessionContext(async (session) => {
    try {
      const u = await prisma.user.findUnique({ where: { id: session.sub }, select: { sidebarFavorites: true } });
      return ok({ favorites: u?.sidebarFavorites ?? [] });
    } catch (e) { return serverError(e); }
  });
}

export async function PUT(request: Request) {
  return withSessionContext(async (session) => {
    try {
      const body = (await request.json()) as { favorites?: unknown };
      if (!Array.isArray(body.favorites)) return badRequest("invalid_input");
      const list = body.favorites.filter((x): x is string => typeof x === "string" && x.startsWith("/")).slice(0, 50);
      await prisma.user.update({ where: { id: session.sub }, data: { sidebarFavorites: list } });
      return ok({ favorites: list });
    } catch (e) { return serverError(e); }
  });
}
