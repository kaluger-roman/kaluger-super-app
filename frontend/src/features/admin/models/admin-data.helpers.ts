type BackupSettingsInput = {
  intervalHours: string;
  maxStorageMb: string;
};

export const isBackupSettingsValid = ({
  intervalHours,
  maxStorageMb,
}: BackupSettingsInput): boolean => {
  const hours = parseInt(intervalHours, 10);
  const mb = parseInt(maxStorageMb, 10);
  return hours >= 1 && hours <= 168 && mb >= 10 && mb <= 10000;
};

export const prepareBackupSettings = ({
  intervalHours,
  maxStorageMb,
}: BackupSettingsInput) => ({
  intervalHours: parseInt(intervalHours, 10),
  maxStorageMb: parseInt(maxStorageMb, 10),
});
