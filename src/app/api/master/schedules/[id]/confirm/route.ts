import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { badRequest, notFound, ok, serverError, trimNonEmpty } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

type RouteContext = { params: Promise<{ id: string }> };

// CFM 버튼 — 대상 직원이 업무 완료 후 호출 → ScheduleConfirmation 기록 + 보고자에게 알림

export async function POST(request: Request, context: RouteContext) {
  return withSessionContext(async (session) => {
    const { id } = await context.params;
    if (!session.empCode) return badRequest("author_not_employee");

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: { reporters: { select: { id: true } } },
    });
    if (!schedule) return notFound();

    const employee = await prisma.employee.findUnique({
      where: { companyCode_employeeCode: { companyCode: session.companyCode, employeeCode: session.empCode } },
      select: { id: true },
    });
    if (!employee) return badRequest("employee_not_found");

    let body: unknown = {};
    try { body = await request.json(); } catch { /* body optional */ }
    const note = trimNonEmpty((body as Record<string, unknown>)?.note);

    const now = new Date();
    const status = now > schedule.dueAt ? "LATE" : "ON_TIME";
    const confirmation = await prisma.scheduleConfirmation.create({
      data: {
        scheduleId: id,
        employeeId: employee.id,
        confirmedAt: now,
        status,
        note,
      },
    });

    // 보고자들에게 알림
    for (const reporter of schedule.reporters) {
      // reporter.id 는 employee id — 해당 employee 와 연결된 user 찾기
      const u = await prisma.user.findFirst({ where: { employeeId: reporter.id }, select: { id: true } });
      if (u) {
        await createNotification({
          userId: u.id,
          companyCode: session.companyCode,
          type: "SCHEDULE_DUE",
          title: { ko: `일정 CFM: ${schedule.title}`, vi: `Xác nhận: ${schedule.title}` },
          body: { ko: `${status === "LATE" ? "지연" : "정시"} 완료 보고${note ? ` · ${note}` : ""}` },
          linkUrl: `/master/schedules`,
        });
      }
    }

    return ok({ confirmation });
  });
}
