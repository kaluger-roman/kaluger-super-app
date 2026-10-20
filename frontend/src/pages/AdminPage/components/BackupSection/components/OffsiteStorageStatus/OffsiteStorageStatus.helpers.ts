import { formatDateTime } from "@shared";
import type { RestoreCheckCounts, RestoreCheckResult } from "@shared";

import {
  HOUR_MS,
  LESSONS_FORMS,
  OFFSITE_STALE_HOURS,
  RESTORE_CHECK_STALE_HOURS,
  STUDENTS_FORMS,
  USERS_FORMS,
} from "./OffsiteStorageStatus.constants";
import type { BackupStatusLineData } from "../BackupStatusLine";

const pluralize = (count: number, [one, few, many]: [string, string, string]): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count}\u00a0${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count}\u00a0${few}`;
  return `${count}\u00a0${many}`;
};

const isOlderThanHours = (isoDate: string, hours: number, now: number): boolean =>
  now - new Date(isoDate).getTime() > hours * HOUR_MS;

const formatRestoreCounts = ({ users, students, lessons }: RestoreCheckCounts): string =>
  [
    pluralize(users, USERS_FORMS),
    pluralize(students, STUDENTS_FORMS),
    pluralize(lessons, LESSONS_FORMS),
  ].join(", ");

export const getOffsiteSyncLine = (
  lastSyncAt: string | null,
  now: number
): BackupStatusLineData => {
  if (!lastSyncAt) {
    return { text: "Резервное хранилище: копирование ещё не выполнялось", isWarning: true };
  }
  const prefix = `Резервное хранилище: ${formatDateTime(lastSyncAt)}`;
  if (isOlderThanHours(lastSyncAt, OFFSITE_STALE_HOURS, now)) {
    return {
      text: `${prefix} — давно не обновлялось (больше ${OFFSITE_STALE_HOURS} часов)`,
      isWarning: true,
    };
  }
  return { text: prefix, isWarning: false };
};

export const getRestoreCheckLine = (
  check: RestoreCheckResult | null,
  now: number
): BackupStatusLineData => {
  if (!check) {
    return { text: "Проверка восстановления: ещё не выполнялась", isWarning: true };
  }
  const prefix = `Проверка восстановления: ${formatDateTime(check.checkedAt)}`;
  if (check.status === "error") {
    return { text: `${prefix} — ошибка: ${check.error}`, isWarning: true };
  }
  const success = `${prefix} — успешно (${formatRestoreCounts(check.counts)})`;
  if (isOlderThanHours(check.checkedAt, RESTORE_CHECK_STALE_HOURS, now)) {
    return {
      text: `${success}, но это было больше ${RESTORE_CHECK_STALE_HOURS} часов назад`,
      isWarning: true,
    };
  }
  return { text: success, isWarning: false };
};
