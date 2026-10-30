import {
  applyAlertChecks,
  dispatchAlertEmails,
  getErrorMessage,
  raiseAlert,
  resolveAlert,
} from "../adminAlerts";
import { createManualBackup, runBackupJob } from "../backup";
import type { BackupJobOutcome } from "../backup";
import { sendLettersInBackground } from "./alertLetters";
import { getDatabaseSecrets, redactSecrets } from "./backupAlerts.helpers";
import { BACKUP_FAILED_ALERT, PROD_BACKUP_DEFINITIONS } from "./definitions";

// Alert bookkeeping never masks the backup result: its own errors are only logged.
const recordBackupFailure = async (error: unknown): Promise<void> => {
  try {
    const now = new Date();
    await raiseAlert(
      BACKUP_FAILED_ALERT,
      {
        description: redactSecrets(
          getErrorMessage(error),
          getDatabaseSecrets(process.env.DATABASE_URL ?? "")
        ),
        eventKey: now.toISOString(),
      },
      now
    );
  } catch (alertError) {
    console.error("Backup failure alert failed:", { message: getErrorMessage(alertError) });
  }
};

const recordBackupSuccess = async (): Promise<void> => {
  try {
    const now = new Date();
    await resolveAlert(BACKUP_FAILED_ALERT, now);
    await applyAlertChecks(PROD_BACKUP_DEFINITIONS, now);
  } catch (alertError) {
    console.error("Backup success alert update failed:", { message: getErrorMessage(alertError) });
  }
};

const dispatchLetters = async (): Promise<void> => {
  try {
    await dispatchAlertEmails();
  } catch (error) {
    console.error("Alert letters dispatch failed:", { message: getErrorMessage(error) });
  }
};

export const runBackupJobWithAlerts = async (): Promise<BackupJobOutcome> => {
  let outcome: BackupJobOutcome;
  try {
    outcome = await runBackupJob();
  } catch (error) {
    await recordBackupFailure(error);
    await dispatchLetters();
    throw error;
  }

  if (outcome.status === "created") {
    await recordBackupSuccess();
    await dispatchLetters();
  }
  return outcome;
};

export const createManualBackupWithAlerts = async (): ReturnType<typeof createManualBackup> => {
  let result: Awaited<ReturnType<typeof createManualBackup>>;
  try {
    result = await createManualBackup();
  } catch (error) {
    await recordBackupFailure(error);
    sendLettersInBackground();
    throw error;
  }

  await recordBackupSuccess();
  sendLettersInBackground();
  return result;
};
