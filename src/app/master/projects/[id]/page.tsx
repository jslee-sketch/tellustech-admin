import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { ProjectForm } from "../project-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const L = session.language;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();
  if (!session.allowedCompanies.includes(project.companyCode)) notFound();

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/master/projects"
            className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline"
          >
            {t("page.projects.back", L)}
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">
            {t("page.projects.detail", L)}
            <span className="ml-3 font-mono text-[14px] text-[color:var(--tts-primary)]">
              {project.projectCode}
            </span>
          </h1>
        </div>
        <Card>
          <ProjectForm
            mode="edit"
            initial={{
              id: project.id,
              projectCode: project.projectCode,
              name: project.name,
              salesType: project.salesType,
              companyCode: project.companyCode,
            }}
            allowedCompanies={session.allowedCompanies}
          />
        </Card>
      </div>
    </main>
  );
}
