import fs from "fs";
import path from "path";
import type { BackupRestoreCheck, BackupRestoreCheckCounts } from "../../types";

import {
  BACKUP_FILE_EXTENSION,
  BACKUP_FILE_NAME_REGEX,
  BACKUP_TMP_SUFFIX,
  DAY_MS,
  ISO_UTC_SECONDS_REGEX,
  MIN_RETENTION_DAYS,
  RESTORE_CHECK_ERROR_MESSAGES,
  STALE_TMP_MAX_AGE_MS,
  UNKNOWN_RESTORE_CHECK_ERROR,
} from "./backup.constants";
import type { BackupRetentionCandidate } from "./backup.types";

// Prisma supports `?schema=...` in DATABASE_URL, but pg_dump rejects it.
export const stripPrismaParams = (databaseUrl: string): string => {
  try {
    const url = new URL(databaseUrl);
    url.searchParams.delete("schema");
    url.searchParams.delete("connection_limit");
    url.searchParams.delete("pool_timeout");
    url.searchParams.delete("pgbouncer");
    return url.toString();
  } catch {
    return databaseUrl;
  }
};

export const parseBackupTimestamp = (name: string): Date | null => {
  const match = BACKUP_FILE_NAME_REGEX.exec(name);
  if (!match) return null;

  const [year, month, day, hours, minutes, seconds] = match.slice(1, 7).map(Number);
  const millis = match[7] ? Number(match[7]) : 0;
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, millis));

  const isSameCalendarValue =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hours &&
    date.getUTCMinutes() === minutes &&
    date.getUTCSeconds() === seconds;

  return isSameCalendarValue ? date : null;
};

const getBackupTime = (file: BackupRetentionCandidate): number =>
  (parseBackupTimestamp(file.name) ?? file.createdAt).getTime();

export const selectBackupsToDelete = <T extends BackupRetentionCandidate>(
  files: T[],
  maxStorageMb: number,
  now: Date
): T[] => {
  const cutoff = now.getTime() - MIN_RETENTION_DAYS * DAY_MS;
  const candidates = files
    .map((file) => ({ file, time: getBackupTime(file) }))
    .filter(({ time }) => time < cutoff)
    .sort((a, b) => a.time - b.time);

  let totalMb = files.reduce((sum, file) => sum + file.sizeMb, 0);
  const toDelete: T[] = [];

  for (const { file } of candidates) {
    if (totalMb <= maxStorageMb || files.length - toDelete.length <= 1) break;
    toDelete.push(file);
    totalMb -= file.sizeMb;
  }

  return toDelete;
};

// Compares what would remain after a cleanup run, rounded like the
// `totalSizeMb` the admin sees, so old files that cleanup will still remove
// do not raise the "younger than 30 days" warning.
export const isStorageLimitExceeded = <T extends BackupRetentionCandidate>(
  files: T[],
  maxStorageMb: number,
  now: Date
): boolean => {
  const deletable = new Set(selectBackupsToDelete(files, maxStorageMb, now));
  const remainingMb = files
    .filter((file) => !deletable.has(file))
    .reduce((sum, file) => sum + file.sizeMb, 0);
  return Math.round(remainingMb * 100) / 100 > maxStorageMb;
};

export const removeIfExists = (filePath: string): void => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Orphans of a dump killed mid-write (pm2 restart, OOM): they never become backups.
export const removeStaleTmpFiles = (dir: string, now: Date): void => {
  const tmpExtension = `${BACKUP_FILE_EXTENSION}${BACKUP_TMP_SUFFIX}`;

  fs.readdirSync(dir)
    .filter((name) => name.endsWith(tmpExtension))
    .map((name) => path.join(dir, name))
    .filter((filePath) => now.getTime() - fs.statSync(filePath).mtimeMs > STALE_TMP_MAX_AGE_MS)
    .forEach((filePath) => fs.unlinkSync(filePath));
};

const parseIsoUtcSeconds = (value: unknown): string | null => {
  if (typeof value !== "string" || !ISO_UTC_SECONDS_REGEX.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace(".000Z", "Z") === value ? value : null;
};

export const parseLastPull = (content: string): string | null => parseIsoUtcSeconds(content.trim());

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const parseCounts = (value: unknown): BackupRestoreCheckCounts | null => {
  if (!isRecord(value)) return null;
  const { users, students, lessons } = value;
  if (!isCount(users) || !isCount(students) || !isCount(lessons)) return null;
  return { users, students, lessons };
};

const getRestoreCheckErrorMessage = (reason: unknown): string =>
  typeof reason === "string" && Object.hasOwn(RESTORE_CHECK_ERROR_MESSAGES, reason)
    ? RESTORE_CHECK_ERROR_MESSAGES[reason]
    : UNKNOWN_RESTORE_CHECK_ERROR;

const parseJson = (content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
};

export const parseRestoreCheck = (content: string): BackupRestoreCheck | null => {
  const data = parseJson(content);
  if (!isRecord(data)) return null;

  const checkedAt = parseIsoUtcSeconds(data.checkedAt);
  if (!checkedAt) return null;

  const { fileName } = data;
  if (fileName !== null && (typeof fileName !== "string" || !parseBackupTimestamp(fileName))) {
    return null;
  }

  if (data.status === "success") {
    const counts = parseCounts(data.counts);
    return counts ? { checkedAt, fileName, status: "success", counts } : null;
  }

  if (data.status === "error") {
    return {
      checkedAt,
      fileName,
      status: "error",
      error: getRestoreCheckErrorMessage(data.reason),
    };
  }

  return null;
};
