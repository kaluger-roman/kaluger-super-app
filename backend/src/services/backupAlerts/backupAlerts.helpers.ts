import { formatMoscowDateTime } from "../adminAlerts";
import type { AlertCheckResult } from "../adminAlerts";
import {
  MIN_RETENTION_DAYS,
  OFFSITE_STALE_HOURS,
  RESTORE_CHECK_STALE_HOURS,
  getBackupTime,
  stripPrismaParams,
} from "../backup";
import type { OffsiteStorageReport } from "../backup";
import {
  BYTES_PER_GIB,
  DISK_LOW_FREE_BYTES,
  DISK_LOW_FREE_RATIO,
  DISK_OK_FREE_BYTES,
  DISK_OK_FREE_RATIO,
  MS_PER_HOUR,
  REDACTED,
  SIZE_DROP_RATIO,
  SIZE_DROP_SAMPLE,
} from "./backupAlerts.constants";
import type { DiskSpace, SizeDrop, SizeDropFile } from "./backupAlerts.types";

export const active = (description: string, eventKey?: string): AlertCheckResult => ({
  active: true,
  description,
  eventKey,
});

export const isDiskSpaceLow = (
  { freeBytes, totalBytes }: DiskSpace,
  isActive: boolean
): boolean => {
  const freeRatio = totalBytes > 0 ? freeBytes / totalBytes : 0;
  if (freeBytes < DISK_LOW_FREE_BYTES || freeRatio < DISK_LOW_FREE_RATIO) return true;
  if (freeBytes > DISK_OK_FREE_BYTES && freeRatio > DISK_OK_FREE_RATIO) return false;
  return isActive;
};

export const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

// `undefined` = too few backups to compare, `null` = the newest one looks normal.
export const findSizeDrop = (files: SizeDropFile[]): SizeDrop | null | undefined => {
  if (files.length < SIZE_DROP_SAMPLE + 1) return undefined;

  const ordered = [...files].sort((a, b) => getBackupTime(a) - getBackupTime(b));
  const newest = ordered[ordered.length - 1];
  const medianMb = median(ordered.slice(-SIZE_DROP_SAMPLE - 1, -1).map((file) => file.sizeMb));

  return newest.sizeMb < SIZE_DROP_RATIO * medianMb ? { file: newest, medianMb } : null;
};

const formatDecimal = (value: number): string => value.toFixed(1).replace(".", ",");

export const formatGigabytes = (bytes: number): string =>
  `${formatDecimal(bytes / BYTES_PER_GIB)} ГБ`;

export const formatBackupSize = (megabytes: number): string =>
  megabytes < 1 ? `${Math.round(megabytes * 1024)} КБ` : `${formatDecimal(megabytes)} МБ`;

const formatFreePercent = ({ freeBytes, totalBytes }: DiskSpace): string =>
  `${Math.round((freeBytes / totalBytes) * 100)}%`;

const decodeOrKeep = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

// libpq echoes a conninfo string it cannot parse, so pg_dump's stderr may carry the URL.
export const getDatabaseSecrets = (databaseUrl: string): string[] => {
  if (!databaseUrl) return [];
  const secrets = [databaseUrl, stripPrismaParams(databaseUrl)];
  try {
    const { password } = new URL(databaseUrl);
    if (password) secrets.push(password, decodeOrKeep(password));
  } catch {
    // Not a URL: the raw string above is all there is to hide.
  }
  return [...new Set(secrets)].sort((a, b) => b.length - a.length);
};

export const redactSecrets = (text: string, secrets: string[]): string =>
  secrets.reduce((result, secret) => (secret ? result.split(secret).join(REDACTED) : result), text);

export const describeBackupOverdue = (
  lastBackupAt: Date | null,
  enabledChangedAt: Date,
  intervalHours: number
): string =>
  lastBackupAt
    ? `Последний бэкап: ${formatMoscowDateTime(lastBackupAt)}, при интервале ${intervalHours} ч.`
    : `Бэкапов ещё не было, автобэкапы включены ${formatMoscowDateTime(enabledChangedAt)}.`;

export const describeSizeDrop = ({ file, medianMb }: SizeDrop): string =>
  `Последний бэкап ${file.name}: ${formatBackupSize(file.sizeMb)}, медиана ${SIZE_DROP_SAMPLE} предыдущих: ${formatBackupSize(medianMb)}. Возможна потеря данных или битый дамп.`;

export const describeStorageLimit = (maxStorageMb: number): string =>
  `Бэкапы младше ${MIN_RETENTION_DAYS} дней занимают больше лимита ${maxStorageMb} МБ, удалять нечего. Увеличьте лимит.`;

export const describeDiskSpaceLow = (space: DiskSpace, backupsBytes: number): string =>
  `На сервере свободно ${formatGigabytes(space.freeBytes)} из ${formatGigabytes(space.totalBytes)} (${formatFreePercent(space)}), бэкапы занимают ${formatGigabytes(backupsBytes)}.`;

export const describeOffsiteDiskSpaceLow = (report: OffsiteStorageReport): string =>
  `На домашней машине свободно ${formatGigabytes(report.freeBytes)} из ${formatGigabytes(report.totalBytes)} (${formatFreePercent(report)}), копии занимают ${formatGigabytes(report.backupsBytes)}. Отчёт от ${formatMoscowDateTime(new Date(report.reportedAt))}.`;

export const describeOffsiteCapReached = (report: OffsiteStorageReport): string =>
  `Копии занимают ${formatGigabytes(report.backupsBytes)} при лимите ${formatGigabytes(report.capBytes)}: удаляются копии моложе 90 дней.`;

export const describeOffsiteStale = (lastSyncAt: string | null): string =>
  lastSyncAt
    ? `Последнее копирование: ${formatMoscowDateTime(new Date(lastSyncAt))}, больше ${OFFSITE_STALE_HOURS} часов назад.`
    : "Копирование ещё не выполнялось.";

export const describeRestoreCheckFailed = (error: string): string =>
  `Последняя проверка восстановления на домашней машине: ${error}.`;

export const describeRestoreCheckStale = (checkedAt: string | null): string =>
  checkedAt
    ? `Последняя проверка: ${formatMoscowDateTime(new Date(checkedAt))}, больше ${RESTORE_CHECK_STALE_HOURS} часов назад.`
    : "Проверка восстановления ещё не выполнялась.";

export const isOlderThanHours = (iso: string | null, hours: number, now: Date): boolean =>
  iso === null || now.getTime() - new Date(iso).getTime() > hours * MS_PER_HOUR;
