// Singleton id used for the one-and-only BackupSettings row. The
// 20260509100000_backup_settings_singleton migration consolidates any pre-
// existing rows onto this id.
export const BACKUP_SETTINGS_ID = "backup-settings-singleton";

export const BACKUP_FILE_EXTENSION = ".sql.gz";
export const BACKUP_TMP_SUFFIX = ".tmp";
export const BACKUP_FILE_NAME_REGEX =
  /^backup-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})(?:-(\d{3}))?Z\.sql\.gz$/;

// A valid pg_dump (even for an empty DB) includes schema info >> 100 bytes;
// an empty gzip header is ~20 bytes.
export const MIN_BACKUP_SIZE_BYTES = 100;
export const PG_DUMP_TIMEOUT_MS = 300000;

export const BYTES_PER_MB = 1024 * 1024;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const MIN_RETENTION_DAYS = 30;
// Far above PG_DUMP_TIMEOUT_MS, so a dump that is still being written is never swept.
export const STALE_TMP_MAX_AGE_MS = DAY_MS;

export const OFFSITE_LAST_PULL_FILE = ".offsite-last-pull";
export const RESTORE_CHECK_FILE = ".offsite-restore-check.json";
export const ISO_UTC_SECONDS_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export const RESTORE_CHECK_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  no_copy: "в резервном хранилище нет целых копий",
  stale_copy: "самая свежая копия устарела — новые бэкапы не доходят",
  gzip_corrupt: "архив копии повреждён",
  docker_failed: "не удалось запустить временную базу",
  restore_failed: "копия не разворачивается (ошибка SQL)",
  query_failed: "не удалось прочитать данные из временной базы",
  missing_table_users: "таблица users не найдена",
  missing_table_students: "таблица students не найдена",
  missing_table_lessons: "таблица lessons не найдена",
  empty_table_users: "таблица users пуста",
  empty_table_students: "таблица students пуста",
  empty_table_lessons: "таблица lessons пуста",
};
export const UNKNOWN_RESTORE_CHECK_ERROR = "неизвестная ошибка";
