"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui";
import { BacklogPanel, type BacklogRow } from "./backlog-panel";
import { TasksPanel, type TaskRow } from "./tasks-panel";
import { t, type Lang } from "@/lib/i18n";

type Option = { id: string; label: string };

export function WeeklyReportShell({
  backlogs,
  tasks,
  clients,
  employees,
  canConfirm,
  lang,
}: {
  backlogs: BacklogRow[];
  tasks: TaskRow[];
  clients: Option[];
  employees: Option[];
  canConfirm: boolean;
  lang: Lang;
}) {
  const [active, setActive] = useState("backlog");
  const tabs = [
    { key: "backlog", label: t("tab.backlogCount", lang).replace("{count}", String(backlogs.length)) },
    { key: "task", label: t("tab.taskCount", lang).replace("{count}", String(tasks.length)) },
  ];
  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      {active === "backlog" && (
        <BacklogPanel rows={backlogs} clients={clients} employees={employees} canConfirm={canConfirm} lang={lang} />
      )}
      {active === "task" && (
        <TasksPanel rows={tasks} employees={employees} canConfirm={canConfirm} lang={lang} />
      )}
    </div>
  );
}
