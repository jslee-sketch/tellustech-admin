import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { ALL_MODULES, getAllPermissions } from "@/lib/permissions";
import type { PermissionLevel, PermissionModule } from "@/generated/prisma/client";

const LEVELS: readonly PermissionLevel[] = ["HIDDEN", "VIEW", "WRITE"] as const;

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/users/[id]/permissions
//   → { permissions: { [module]: 'HIDDEN' | 'VIEW' | 'WRITE' } }
// PUT /api/admin/users/[id]/permissions
//   body: { permissions: { [module]: level } } — upsert each pair, drop missing keys
// ADMIN/MANAGER 전용.

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return badRequest("forbidden");
    const { id } = await context.params;
    const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!user) return badRequest("not_found");
    const perms = await getAllPermissions(id, user.role);
    return ok({ permissions: perms });
  });
}

export async function PUT(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return badRequest("forbidden");
    const { id } = await context.params;
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as { permissions?: Record<string, string> };
    if (!p?.permissions || typeof p.permissions !== "object") return badRequest("invalid_input");

    try {
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (!target) return badRequest("not_found");
      // Upsert each entry
      for (const [k, v] of Object.entries(p.permissions)) {
        if (!ALL_MODULES.includes(k as PermissionModule)) continue;
        if (!LEVELS.includes(v as PermissionLevel)) continue;
        await prisma.userPermission.upsert({
          where: { userId_module: { userId: id, module: k as PermissionModule } },
          create: { userId: id, module: k as PermissionModule, level: v as PermissionLevel },
          update: { level: v as PermissionLevel },
        });
      }
      const final = await getAllPermissions(id, target.role);
      return ok({ permissions: final });
    } catch (err) {
      return serverError(err);
    }
  });
}
