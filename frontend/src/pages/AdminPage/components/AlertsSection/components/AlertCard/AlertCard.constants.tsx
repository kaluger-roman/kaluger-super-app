import type { ReactElement } from "react";

import { ErrorOutline, WarningAmberOutlined } from "@mui/icons-material";

import type { AdminAlertSeverity } from "@shared";

export const SEVERITY_LABELS: Record<AdminAlertSeverity, string> = {
  critical: "Критично",
  warning: "Предупреждение",
};

export const SEVERITY_CHIP_COLORS: Record<AdminAlertSeverity, "error" | "warning"> = {
  critical: "error",
  warning: "warning",
};

export const SEVERITY_ICONS: Record<AdminAlertSeverity, ReactElement> = {
  critical: <ErrorOutline />,
  warning: <WarningAmberOutlined />,
};

export const TIMES_FORMS: [string, string, string] = ["раз", "раза", "раз"];
