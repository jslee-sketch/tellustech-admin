import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companyScope } from "@/lib/api-utils";
import { t } from "@/lib/i18n";
import { ProjectsClient } from "./projects-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await getSession();
  const L = session.language;
  const projects = await prisma.project.findMany({
    where: companyScope(session),
    orderBy: { projectCode: "asc" },
  });

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            TELLUSTECH ERP
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            {t("page.projects.title", L)}
            <span className="ml-3 rounded bg-[color:var(--tts-primary-dim)] px-2 py-0.5 text-[12px] text-[color:var(--tts-primary)]">
              {session.companyCode}
            </span>
          </h1>
        </div>
        <ProjectsClient
          lang={L}
          initialData={projects.map((p) => ({
            id: p.id,
            projectCode: p.projectCode,
            name: p.name,
            salesType: p.salesType,
          }))}
        />
      </div>
    </main>
  );
}
