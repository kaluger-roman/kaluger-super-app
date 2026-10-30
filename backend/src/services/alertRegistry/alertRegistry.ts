import { runAlertChecks } from "../adminAlerts";
import type { AdminAlertDefinition } from "../adminAlerts";
import { BACKUP_ALERT_DEFINITIONS } from "../backupAlerts";

// A new alert source adds its definitions here; tables, API and UI stay as they are.
export const ALERT_DEFINITIONS: AdminAlertDefinition[] = [...BACKUP_ALERT_DEFINITIONS];

export const runScheduledAlertChecks = (): Promise<void> =>
  runAlertChecks(ALERT_DEFINITIONS, new Date());
