import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import {
  badRequest,
  handleFieldError,
  isRecordNotFoundError,
  notFound,
  ok,
  requireString,
  serverError,
  trimNonEmpty,
} from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id: clientId, contactId } = await context.params;
    const existing = await prisma.clientContact.findUnique({ where: { id: contactId } });
    if (!existing || existing.clientId !== clientId) return notFound();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("invalid_body");
    }
    const p = body as Record<string, unknown>;

    try {
      const data: Record<string, unknown> = {};
      if (p.name !== undefined) data.name = requireString(p.name, "name");
      if (p.position !== undefined) data.position = trimNonEmpty(p.position);
      if (p.phone !== undefined) data.phone = trimNonEmpty(p.phone);
      if (p.email !== undefined) data.email = trimNonEmpty(p.email);

      if (p.isPrimary !== undefined) {
        const isPrimary = Boolean(p.isPrimary);
        const updated = await prisma.$transaction(async (tx) => {
          if (isPrimary) {
            await tx.clientContact.updateMany({
              where: { clientId, isPrimary: true, id: { not: contactId } },
              data: { isPrimary: false },
            });
          }
          return tx.clientContact.update({
            where: { id: contactId },
            data: { ...data, isPrimary },
          });
        });
        return ok({ contact: updated });
      }

      if (Object.keys(data).length === 0) return ok({ contact: existing });
      const updated = await prisma.clientContact.update({ where: { id: contactId }, data });
      return ok({ contact: updated });
    } catch (err) {
      const handled = handleFieldError(err);
      if (handled) return handled;
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}

export async function DELETE(_r: Request, context: RouteContext) {
  return withSessionContext(async () => {
    const { id: clientId, contactId } = await context.params;
    const existing = await prisma.clientContact.findUnique({ where: { id: contactId } });
    if (!existing || existing.clientId !== clientId) return notFound();

    try {
      await prisma.clientContact.delete({ where: { id: contactId } });
      return ok({ ok: true });
    } catch (err) {
      if (isRecordNotFoundError(err)) return notFound();
      return serverError(err);
    }
  });
}
