import { formatDateTime, pluralize } from "@shared";
import type { RestoreCheckCounts, RestoreCheckResult } from "@shared";

import {
  HOUR_MS,
  HOURS_FORMS,
  LESSONS_FORMS,
  STUDENTS_FORMS,
  USERS_FORMS,
} from "./OffsiteStorageStatus.constants";
import type { BackupStatusLineData } from "../BackupStatusLine";

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
  staleHours: number,
  now: number
): BackupStatusLineData => {
  if (!lastSyncAt) {
    return { text: "Резервное хранилище: копирование ещё не выполнялось", isWarning: true };
  }
  const prefix = `Резервное хранилище: ${formatDateTime(lastSyncAt)}`;
  if (isOlderThanHours(lastSyncAt, staleHours, now)) {
    return {
      text: `${prefix} — давно не обновлялось (больше ${pluralize(staleHours, HOURS_FORMS)})`,
      isWarning: true,
    };
  }
  return { text: prefix, isWarning: false };
};

export const getRestoreCheckLine = (
  check: RestoreCheckResult | null,
  staleHours: number,
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
  if (isOlderThanHours(check.checkedAt, staleHours, now)) {
    return {
      text: `${success}, но это было больше ${pluralize(staleHours, HOURS_FORMS)} назад`,
      isWarning: true,
    };
  }
  return { text: success, isWarning: false };
};
