import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }> };

export default async function ScheduleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const L = session.language;
  const r = await prisma.schedule.findUnique({
    where: { id },
    include: {
      targets: { select: { employeeCode: true, nameVi: true } },
      reporters: { select: { employeeCode: true, nameVi: true } },
      confirmations: { include: { employee: { select: { employeeCode: true, nameVi: true } } }, orderBy: { confirmedAt: "desc" } },
    },
  });
  if (!r) notFound();

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/master/schedules" className="text-[11px] font-bold tracking-[0.15em] text-[color:var(--tts-accent)] hover:underline">{t("page.schedules.back", L)}</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-extrabold">
            <span className="font-mono text-[18px] text-[color:var(--tts-primary)]">{r.scheduleCode}</span>
            <span className="text-[16px]">{r.title}</span>
          </h1>
        </div>
        <Card title={t("section.scheduleOverview", L)}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <dt className="text-[color:var(--tts-sub)]">{t("field.scheduleDue", L)}</dt><dd className="font-mono">{r.dueAt.toISOString().slice(0, 16).replace("T", " ")}</dd>
            <dt className="text-[color:var(--tts-sub)]">{t("field.scheduleRepeat", L)}</dt><dd className="font-mono">{r.repeatCron ?? "-"}</dd>
            <dt className="text-[color:var(--tts-sub)]">{t("field.alertBefore", L)}</dt><dd>{r.alertBeforeHours ?? "-"}</dd>
            <dt className="text-[color:var(--tts-sub)]">{t("field.relatedModule", L)}</dt><dd>{r.relatedModule ?? "-"}</dd>
          </dl>
        </Card>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card title={t("label.targetsCount", L).replace("{count}", String(r.targets.length))}>
            <ul className="space-y-1 text-[12px]">{r.targets.map((tg) => <li key={tg.employeeCode}><span className="font-mono text-[color:var(--tts-accent)]">{tg.employeeCode}</span> · {tg.nameVi}</li>)}</ul>
          </Card>
          <Card title={t("label.reportersCount", L).replace("{count}", String(r.reporters.length))}>
            <ul className="space-y-1 text-[12px]">{r.reporters.map((tg) => <li key={tg.employeeCode}><span className="font-mono text-[color:var(--tts-accent)]">{tg.employeeCode}</span> · {tg.nameVi}</li>)}</ul>
          </Card>
        </div>
        <div className="mt-4">
          <Card title={t("label.confirmsCount", L).replace("{count}", String(r.confirmations.length))}>
            <table className="w-full text-[12px]"><thead><tr className="border-b border-[color:var(--tts-border)] text-[color:var(--tts-sub)]"><th className="py-2 text-left">{t("th.dateTime", L)}</th><th className="py-2 text-left">{t("th.employee", L)}</th><th className="py-2 text-left">{t("th.statusTh", L)}</th><th className="py-2 text-left">{t("th.memo", L)}</th></tr></thead><tbody>
              {r.confirmations.map((c) => (
                <tr key={c.id} className="border-b border-[color:var(--tts-border)]/50"><td className="py-2 font-mono">{c.confirmedAt.toISOString().slice(0, 16).replace("T", " ")}</td><td className="py-2">{c.employee.employeeCode} · {c.employee.nameVi}</td><td className="py-2">{c.status}</td><td className="py-2">{c.note ?? ""}</td></tr>
              ))}
            </tbody></table>
          </Card>
        </div>
      </div>
    </main>
  );
}
