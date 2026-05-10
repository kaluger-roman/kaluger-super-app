-- Collapse BackupSettings to a singleton row. Without a stable id the previous
-- `findFirst + create-if-missing` pattern could race and leave two rows, with
-- updateBackupSettings hitting one and the cron reading the other.

-- Keep only the most recent row (if any) and rebrand its id.
WITH latest AS (
  SELECT id
  FROM "backup_settings"
  ORDER BY "createdAt" DESC
  LIMIT 1
)
DELETE FROM "backup_settings"
WHERE id NOT IN (SELECT id FROM latest);

UPDATE "backup_settings"
SET id = 'backup-settings-singleton'
WHERE id <> 'backup-settings-singleton';
