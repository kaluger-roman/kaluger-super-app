import type { AdminAlert } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { sendAdminEmail } from "../email";
import {
  EMAIL_ERROR_MAX_LENGTH,
  MAX_EMAIL_ATTEMPTS,
  RETRYABLE_EMAIL_STATUSES,
} from "./adminAlerts.constants";
import {
  buildAlertEmail,
  getEmailRecipient,
  getEmailState,
  getErrorMessage,
  getRetryableEmailWhere,
  isOpenLetterDue,
  isResolveLetterDue,
  toEmailUpdate,
  truncateText,
} from "./adminAlerts.helpers";
import type { AlertEmailKind } from "./adminAlerts.types";
import { getAdminSettings, getAdminUrl } from "./adminSettings";

const attemptEmail = async (alert: AdminAlert, kind: AlertEmailKind): Promise<void> => {
  const recipient = getEmailRecipient(await getAdminSettings(), alert, kind);

  if (recipient.status !== "pending") {
    await prisma.adminAlert.updateMany({
      where: getRetryableEmailWhere(alert.id, kind),
      data: toEmailUpdate(kind, { status: recipient.status }),
    });
    return;
  }

  const { attempts } = getEmailState(alert, kind);
  const claim = await prisma.adminAlert.updateMany({
    where: getRetryableEmailWhere(alert.id, kind, attempts),
    data: toEmailUpdate(kind, { attempts: attempts + 1 }),
  });
  if (claim.count === 0) return;

  // Only Resend's answer decides sent/failed: a failing status write is not a delivery error.
  let sendError: unknown = null;
  try {
    await sendAdminEmail({ to: recipient.to, ...buildAlertEmail(alert, kind, getAdminUrl()) });
  } catch (error) {
    sendError = error;
  }

  await prisma.adminAlert.update({
    where: { id: alert.id },
    data: toEmailUpdate(
      kind,
      sendError === null
        ? { status: "sent", error: null }
        : {
            status: "failed",
            error: truncateText(getErrorMessage(sendError), EMAIL_ERROR_MAX_LENGTH),
          }
    ),
  });
};

const attemptSafely = async (alert: AdminAlert, kind: AlertEmailKind): Promise<void> => {
  try {
    await attemptEmail(alert, kind);
  } catch (error) {
    console.error("Alert email dispatch failed:", {
      alertId: alert.id,
      kind,
      message: getErrorMessage(error),
    });
  }
};

// Episodes go in the order they opened, and within one the open letter goes first: a
// «[Решено]» of an earlier episode never lands after the problem letter of a later one.
const dispatchOnce = async (): Promise<void> => {
  const retryable = { in: [...RETRYABLE_EMAIL_STATUSES] };
  const alerts = await prisma.adminAlert.findMany({
    where: {
      OR: [
        { openEmailStatus: retryable, openEmailAttempts: { lt: MAX_EMAIL_ATTEMPTS } },
        { resolveEmailStatus: retryable, resolveEmailAttempts: { lt: MAX_EMAIL_ATTEMPTS } },
      ],
    },
    orderBy: { openedAt: "asc" },
  });

  for (const alert of alerts) {
    let current: AdminAlert | null = alert;
    if (isOpenLetterDue(alert)) {
      await attemptSafely(alert, "open");
      current = await prisma.adminAlert.findUnique({ where: { id: alert.id } });
    }
    if (current && isResolveLetterDue(current)) {
      await attemptSafely(current, "resolve");
    }
  }
};

// One process (pm2 fork): runs are chained, so a cron run and a backup attempt never
// send the same letter twice. A caller waits for the runs queued before it.
let dispatchQueue: Promise<void> = Promise.resolve();

export const dispatchAlertEmails = (): Promise<void> => {
  const run = dispatchQueue.then(dispatchOnce);
  dispatchQueue = run.catch(() => undefined);
  return run;
};
