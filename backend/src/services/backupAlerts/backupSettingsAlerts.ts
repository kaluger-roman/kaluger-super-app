import { applyAlertChecks, getErrorMessage } from "../adminAlerts";
import { updateBackupSettings } from "../backup";
import { sendLettersInBackground } from "./alertLetters";
import { BACKUP_SETTINGS_DEFINITIONS } from "./definitions";

export const updateBackupSettingsWithAlerts = async (
  data: Parameters<typeof updateBackupSettings>[0]
): ReturnType<typeof updateBackupSettings> => {
  const settings = await updateBackupSettings(data);
  try {
    await applyAlertChecks(BACKUP_SETTINGS_DEFINITIONS, new Date());
  } catch (alertError) {
    console.error("Backup settings alert update failed:", {
      message: getErrorMessage(alertError),
    });
  }
  sendLettersInBackground();
  return settings;
};
