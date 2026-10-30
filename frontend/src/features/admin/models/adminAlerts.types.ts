import type { AdminAlert } from "@shared";

export type AlertsFilter = "active" | "all";

export type AlertsLoad = { alerts: AdminAlert[]; readRequests: number };
