"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui";
import { BacklogPanel, type BacklogRow } from "./backlog-panel";
import { TasksPanel, type TaskRow } from "./tasks-panel";

type Option = { id: string; label: string };

export function WeeklyReportShell({
  backlogs,
  tasks,
  clients,
  employees,
  canConfirm,
}: {
  backlogs: BacklogRow[];
  tasks: TaskRow[];
  clients: Option[];
  employees: Option[];
  canConfirm: boolean;
}) {
  const [active, setActive] = useState("backlog");
  const tabs = [
    { key: "backlog", label: `📊 Backlog (${backlogs.length})` },
    { key: "task", label: `📝 업무진행 (${tasks.length})` },
  ];
  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      {active === "backlog" && (
        <BacklogPanel rows={backlogs} clients={clients} employees={employees} canConfirm={canConfirm} />
      )}
      {active === "task" && (
        <TasksPanel rows={tasks} employees={employees} canConfirm={canConfirm} />
      )}
    </div>
  );
}
