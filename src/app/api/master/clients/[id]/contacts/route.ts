import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  handleFieldError,
  notFound,
  ok,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";

// 거래처 담당자 CRUD (1:N). 중첩 리소스.
// GET 리스트 / POST 생성

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const client = await prisma.client.findUnique({ where: { id }, select: { id: true } });
    if (!client) return notFound();
    const contacts = await prisma.clientContact.findMany({
      where: { clientId: id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return ok({ contacts });
  });
}

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id } = await context.params;
    const client = await prisma.client.findUnique({ where: { id }, select: { id: true } });
    if (!client) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const name = requireString(p.name, "name");
      const isPrimary = Boolean(p.isPrimary);

      const created = await prisma.$transaction(async (tx) => {
        if (isPrimary) {
          await tx.clientContact.updateMany({
            where: { clientId: id, isPrimary: true },
            data: { isPrimary: false },
          });
        }
        return tx.clientContact.create({
          data: {
            clientId: id,
            name,
            position: trimNonEmpty(p.position),
            phone: trimNonEmpty(p.phone),
            email: trimNonEmpty(p.email),
            isPrimary,
          },
        });
      });
      return ok({ contact: created }, { status: 201 });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      return serverError(err);
    }
  });
}
