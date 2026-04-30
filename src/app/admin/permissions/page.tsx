import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { PermissionsClient } from "./permissions-client";

export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  const session = await getSession();
  if (session.role !== "ADMIN" && session.role !== "MANAGER") redirect("/");
  const users = await prisma.user.findMany({
    where: { role: { notIn: ["CLIENT"] } },
    orderBy: { username: "asc" },
    select: {
      id: true, username: true, role: true,
      employee: { select: { employeeCode: true, nameVi: true, nameKo: true } },
    },
  });
  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-2xl font-extrabold">{t("page.permissions.title", session.language)}</h1>
        <PermissionsClient
          lang={session.language}
          users={users.map(u => ({
            id: u.id, username: u.username, role: u.role,
            empCode: u.employee?.employeeCode ?? null,
            name: u.employee?.nameKo ?? u.employee?.nameVi ?? u.username,
          }))}
        />
      </div>
    </main>
  );
}
