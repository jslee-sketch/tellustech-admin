import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-utils";

export async function GET() {
  return withSessionContext(async (session) => {
    if (session.role === "CLIENT") return forbidden();
    const items = await prisma.snmpModelOid.findMany({ orderBy: { deviceModel: "asc" } });
    return ok({ items });
  });
}

export async function POST(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    let body: any;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const deviceModel = String(body?.deviceModel ?? "").trim();
    const brand = String(body?.brand ?? "").trim();
    const modelName = String(body?.modelName ?? "").trim();
    const oidTotal = String(body?.oidTotal ?? "").trim();
    if (!deviceModel || !brand || !modelName || !oidTotal) return badRequest("required_fields");
    try {
      const created = await prisma.snmpModelOid.create({
        data: {
          deviceModel, brand, modelName, oidTotal,
          oidBw: String(body?.oidBw ?? "") || null,
          oidColor: String(body?.oidColor ?? "") || null,
          oidSerial: String(body?.oidSerial ?? "") || null,
          isMonoOnly: Boolean(body?.isMonoOnly ?? false),
        },
      });
      return ok({ model: created }, { status: 201 });
    } catch (e) { return serverError(e); }
  });
}

export async function PUT(request: Request) {
  return withSessionContext(async (session) => {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") return forbidden();
    let body: any;
    try { body = await request.json(); } catch { return badRequest("invalid_body"); }
    const id = String(body?.id ?? "").trim();
    if (!id) return badRequest("id_required");
    try {
      const updated = await prisma.snmpModelOid.update({
        where: { id },
        data: {
          brand: body?.brand !== undefined ? String(body.brand) : undefined,
          modelName: body?.modelName !== undefined ? String(body.modelName) : undefined,
          oidTotal: body?.oidTotal !== undefined ? String(body.oidTotal) : undefined,
          oidBw: body?.oidBw !== undefined ? (String(body.oidBw) || null) : undefined,
          oidColor: body?.oidColor !== undefined ? (String(body.oidColor) || null) : undefined,
          oidSerial: body?.oidSerial !== undefined ? (String(body.oidSerial) || null) : undefined,
          isMonoOnly: body?.isMonoOnly !== undefined ? Boolean(body.isMonoOnly) : undefined,
        },
      });
      return ok({ model: updated });
    } catch (e) { return serverError(e); }
  });
}
