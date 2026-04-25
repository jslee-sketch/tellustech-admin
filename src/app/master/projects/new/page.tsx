import Link from "next/link";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { ProjectForm } from "../project-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const session = await getSession();
  const L = session.language;
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
          <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--tts-text)]">{t("page.projects.new", L)}</h1>
        </div>
        <Card>
          <ProjectForm
            mode="create"
            lang={L}
            initial={{
              projectCode: "",
              name: "",
              salesType: "",
              companyCode: session.companyCode,
            }}
            allowedCompanies={session.allowedCompanies}
          />
        </Card>
      </div>
    </main>
  );
}
