import { getErrorMessage } from "./adminAlerts.helpers";
import { dispatchAlertEmails } from "./alertEmails";
import { applyCheckResult, deleteExpiredAlerts, findActiveAlert } from "./alertLifecycle";
import type { AdminAlertDefinition } from "./adminAlerts.types";

// One failing check is logged and skipped: it must not hide the other problems (FR-006).
export const applyAlertChecks = async (
  definitions: AdminAlertDefinition[],
  now: Date
): Promise<void> => {
  for (const definition of definitions) {
    const { check } = definition;
    if (!check) continue;
    try {
      const activeAlert = await findActiveAlert(definition.type);
      const result = await check({ now, activeAlert });
      await applyCheckResult(definition, result, now);
    } catch (error) {
      console.error("Alert check failed:", {
        type: definition.type,
        message: getErrorMessage(error),
      });
    }
  }

  try {
    await deleteExpiredAlerts(now);
  } catch (error) {
    console.error("Expired alerts cleanup failed:", { message: getErrorMessage(error) });
  }
};

export const runAlertChecks = async (
  definitions: AdminAlertDefinition[],
  now: Date
): Promise<void> => {
  await applyAlertChecks(definitions, now);
  await dispatchAlertEmails();
};
