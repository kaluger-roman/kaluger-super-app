import type { FC } from "react";

import { Button, Switch, FormControlLabel, Typography } from "@mui/material";
import { useUnit } from "effector-react";

import { adminDataModel, backupStatusModel } from "@features/admin";
import { formatDateTime } from "@shared";

import * as Styled from "./BackupSection.styled";
import { OffsiteStorageStatus } from "./components";

export const BackupSection: FC = () => {
  const backupSettings = useUnit(adminDataModel.$backupSettings);
  const backupFiles = useUnit(adminDataModel.$backupFiles);
  const totalSizeMb = useUnit(adminDataModel.$totalSizeMb);
  const intervalHours = useUnit(adminDataModel.$intervalHours);
  const maxStorageMb = useUnit(adminDataModel.$maxStorageMb);
  const minRetentionDays = useUnit(backupStatusModel.$minRetentionDays);
  const isStorageLimitExceeded = useUnit(backupStatusModel.$storageLimitExceeded);

  const actions = useUnit({
    toggle: adminDataModel.backupToggled,
    save: adminDataModel.backupSettingsSaved,
    create: adminDataModel.backupCreated,
    changeInterval: adminDataModel.intervalHoursChanged,
    changeMaxStorage: adminDataModel.maxStorageMbChanged,
  });

  if (!backupSettings) return null;

  return (
    <div>
      <Styled.StyledControls>
        <FormControlLabel
          control={<Switch checked={backupSettings.enabled} onChange={() => actions.toggle()} />}
          label="Автоматические бэкапы"
        />
        <Button variant="contained" onClick={() => actions.create()}>
          Создать бэкап
        </Button>
      </Styled.StyledControls>

      <Styled.StyledSettingsRow>
        <Styled.StyledSettingsField
          label="Интервал (часы)"
          type="number"
          value={intervalHours}
          onChange={(e) => actions.changeInterval(e.target.value)}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: 1, max: 168 },
          }}
        />
        <Styled.StyledSettingsField
          label="Макс. размер (МБ)"
          type="number"
          value={maxStorageMb}
          onChange={(e) => actions.changeMaxStorage(e.target.value)}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: 10, max: 10000 },
          }}
        />
        <Button variant="outlined" onClick={() => actions.save()}>
          Сохранить
        </Button>
      </Styled.StyledSettingsRow>
      <Styled.StyledRetentionHint>
        <Styled.StyledRetentionHintIcon />
        <Typography variant="body2">
          Бэкапы младше {minRetentionDays} дней не удаляются независимо от лимита размера
        </Typography>
      </Styled.StyledRetentionHint>
      {isStorageLimitExceeded && (
        <Styled.StyledLimitAlert severity="warning">
          Лимит превышен: бэкапы младше {minRetentionDays} дней не удаляются. Увеличьте лимит.
        </Styled.StyledLimitAlert>
      )}

      {backupSettings.lastBackupAt && (
        <Styled.StyledSummary>
          Последний бэкап: {formatDateTime(backupSettings.lastBackupAt)}
        </Styled.StyledSummary>
      )}
      <OffsiteStorageStatus />

      <Styled.StyledFilesWrapper>
        <Typography variant="h6" gutterBottom>
          Файлы бэкапов
        </Typography>
        {backupFiles.length === 0 && <Typography color="text.secondary">Нет бэкапов</Typography>}
        {backupFiles.map((file) => (
          <Styled.StyledFileCard key={file.name}>
            <Styled.StyledFileName>{file.name}</Styled.StyledFileName>
            <Styled.StyledFileInfo>
              {file.sizeMb} МБ &middot; {new Date(file.createdAt).toLocaleString("ru-RU")}
            </Styled.StyledFileInfo>
          </Styled.StyledFileCard>
        ))}
        {backupFiles.length > 0 && (
          <Styled.StyledSummary>
            Всего: {totalSizeMb} МБ / {backupSettings.maxStorageMb} МБ
          </Styled.StyledSummary>
        )}
      </Styled.StyledFilesWrapper>
    </div>
  );
};
