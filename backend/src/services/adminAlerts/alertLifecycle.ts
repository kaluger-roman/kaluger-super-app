import { Prisma } from "@prisma/client";
import type { AdminAlert } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { AdminAlertDto } from "../../types";
import { AdminAlertNotFoundError } from "../../utils";
import { ALERT_DESCRIPTION_MAX_LENGTH, ALERT_RETENTION_DAYS } from "./adminAlerts.constants";
import {
  compareAlerts,
  getNextOccurrences,
  getOpenEmailStatus,
  getResolveEmailStatus,
  getRetentionCutoff,
  toAlertDto,
  truncateText,
} from "./adminAlerts.helpers";
import type { AdminAlertDefinition, AlertCheckResult, AlertOccurrence } from "./adminAlerts.types";
import { getAdminSettings } from "./adminSettings";

export const findActiveAlert = (type: string): Promise<AdminAlert | null> =>
  prisma.adminAlert.findUnique({ where: { activeType: type } });

const refreshAlert = (
  alert: AdminAlert,
  description: string,
  eventKey: string | undefined,
  now: Date
) =>
  prisma.adminAlert.update({
    where: { id: alert.id },
    data: {
      description,
      lastSeenAt: now,
      occurrences: getNextOccurrences(alert, eventKey),
      eventKey: eventKey ?? alert.eventKey,
    },
  });

export const raiseAlert = async (
  definition: AdminAlertDefinition,
  occurrence: AlertOccurrence,
  now: Date
): Promise<AdminAlert> => {
  const description = truncateText(occurrence.description, ALERT_DESCRIPTION_MAX_LENGTH);
  const { eventKey } = occurrence;

  const active = await findActiveAlert(definition.type);
  if (active) return refreshAlert(active, description, eventKey, now);

  const settings = await getAdminSettings();
  try {
    return await prisma.adminAlert.create({
      data: {
        type: definition.type,
        activeType: definition.type,
        severity: definition.severity,
        title: definition.title,
        description,
        eventKey: eventKey ?? null,
        openedAt: now,
        lastSeenAt: now,
        openEmailStatus: getOpenEmailStatus(settings),
      },
    });
  } catch (err) {
    // A parallel check (cron and a backup attempt) opened the same type first.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await findActiveAlert(definition.type);
      if (winner) return refreshAlert(winner, description, eventKey, now);
    }
    throw err;
  }
};

export const resolveAlert = async (
  definition: AdminAlertDefinition,
  now: Date
): Promise<boolean> => {
  const active = await findActiveAlert(definition.type);
  if (!active) return false;

  const { count } = await prisma.adminAlert.updateMany({
    where: { id: active.id, activeType: definition.type },
    data: {
      activeType: null,
      resolvedAt: now,
      resolveEmailStatus: getResolveEmailStatus(active.openEmailStatus),
    },
  });
  return count > 0;
};

export const applyCheckResult = async (
  definition: AdminAlertDefinition,
  result: AlertCheckResult,
  now: Date
): Promise<void> => {
  if (result === null) return;
  if (result.active) {
    await raiseAlert(
      definition,
      { description: result.description, eventKey: result.eventKey },
      now
    );
    return;
  }
  await resolveAlert(definition, now);
};

export const listAlerts = async (): Promise<AdminAlertDto[]> => {
  const alerts = await prisma.adminAlert.findMany({
    where: {
      OR: [
        { resolvedAt: null },
        { resolvedAt: { gte: getRetentionCutoff(new Date(), ALERT_RETENTION_DAYS) } },
      ],
    },
  });
  return [...alerts].sort(compareAlerts).map(toAlertDto);
};

export const markAlertRead = async (id: string): Promise<void> => {
  const alert = await prisma.adminAlert.findUnique({ where: { id }, select: { id: true } });
  if (!alert) {
    throw new AdminAlertNotFoundError();
  }
  await prisma.adminAlert.updateMany({
    where: { id, resolvedAt: null, readAt: null },
    data: { readAt: new Date() },
  });
};

export const markAllAlertsRead = async (): Promise<number> => {
  const { count } = await prisma.adminAlert.updateMany({
    where: { resolvedAt: null, readAt: null },
    data: { readAt: new Date() },
  });
  return count;
};

export const deleteExpiredAlerts = async (now: Date): Promise<number> => {
  const { count } = await prisma.adminAlert.deleteMany({
    where: { resolvedAt: { lt: getRetentionCutoff(now, ALERT_RETENTION_DAYS) } },
  });
  return count;
};
