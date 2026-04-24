import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, handleFieldError, ok, optionalEnum, requireEnum, serverError, trimNonEmpty } from "@/lib/api-utils";
import type { ChatRoomType } from "@/generated/prisma/client";

const TYPES: readonly ChatRoomType[] = ["DIRECT", "GROUP"] as const;

export async function GET() {
  return withSessionContext(async (session) => {
    const rooms = await prisma.chatRoom.findMany({
      where: { members: { some: { userId: session.sub } } },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true, members: true } }, members: { include: { user: { select: { id: true, username: true } } } } },
    });
    return ok({ rooms });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const p = body as Record<string, unknown>;
    try {
      const type = requireEnum(p.type, TYPES, "type");
      const name = trimNonEmpty(p.name);
      const memberIds = Array.isArray(p.memberIds) ? (p.memberIds as string[]).filter((x) => typeof x === "string") : [];
      // 생성자는 항상 멤버
      const allMembers = Array.from(new Set([session.sub, ...memberIds]));
      if (type === "DIRECT" && allMembers.length !== 2) {
        return badRequest("invalid_input", { field: "memberIds", reason: "direct_requires_2" });
      }
      const room = await prisma.chatRoom.create({
        data: {
          type,
          name,
          companyCode: type === "GROUP" ? session.companyCode : null,
          members: { create: allMembers.map((userId) => ({ userId })) },
        },
      });
      return ok({ room }, { status: 201 });
    } catch (err) {
      const h = handleFieldError(err); if (h) return h;
      return serverError(err);
    }
  });
}
