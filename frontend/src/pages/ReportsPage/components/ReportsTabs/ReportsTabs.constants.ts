import type { ReportsTab } from "../../model";

export const REPORTS_TABS: { value: ReportsTab; label: string }[] = [
  { value: "summary", label: "Сводка" },
  { value: "history", label: "История поступлений" },
];

export const REPORTS_TABS_ID = "reports-tabs";
