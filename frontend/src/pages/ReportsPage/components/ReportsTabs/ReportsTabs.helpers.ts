import { REPORTS_TABS_ID } from "./ReportsTabs.constants";
import type { ReportsTab } from "../../model";

export const scrollToReportsTabs = (): void => {
  document.getElementById(REPORTS_TABS_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export const getReportsTabId = (tab: ReportsTab): string => `reports-tab-${tab}`;

export const getReportsTabPanelId = (tab: ReportsTab): string => `reports-tabpanel-${tab}`;
