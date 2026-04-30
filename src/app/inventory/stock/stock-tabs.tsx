"use client";

import { useState, type ReactNode } from "react";
import { Tabs, type TabDef } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";

export function StockTabs({
  lang,
  realtime,
  bySerial,
}: {
  lang: Lang;
  realtime: ReactNode;
  bySerial: ReactNode;
}) {
  const [active, setActive] = useState<string>("realtime");
  const tabs: TabDef[] = [
    { key: "realtime", label: t("stock.tab.realtime", lang), icon: "📊" },
    { key: "bySerial", label: t("stock.tab.bySerial", lang), icon: "🏷️" },
  ];
  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      <div style={{ display: active === "realtime" ? "block" : "none" }}>{realtime}</div>
      <div style={{ display: active === "bySerial" ? "block" : "none" }}>{bySerial}</div>
    </div>
  );
}
