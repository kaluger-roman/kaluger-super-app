import type { FC } from "react";

import {
  Button,
  Switch,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { useUnit } from "effector-react";

import { adminDataModel } from "@features/admin";

import * as Styled from "./BackupSection.styled";

export const BackupSection: FC = () => {
  const backupSettings = useUnit(adminDataModel.$backupSettings);
  const backupFiles = useUnit(adminDataModel.$backupFiles);
  const totalSizeMb = useUnit(adminDataModel.$totalSizeMb);
  const intervalHours = useUnit(adminDataModel.$intervalHours);
  const maxStorageMb = useUnit(adminDataModel.$maxStorageMb);

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
          control={
            <Switch
              checked={backupSettings.enabled}
              onChange={() => actions.toggle()}
            />
          }
          label="Автоматические бэкапы"
        />
        <Button
          variant="contained"
          onClick={() => actions.create()}
        >
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

      {backupSettings.lastBackupAt && (
        <Styled.StyledSummary>
          Последний бэкап:{" "}
          {new Date(backupSettings.lastBackupAt).toLocaleString("ru-RU")}
        </Styled.StyledSummary>
      )}

      <Styled.StyledFilesWrapper>
        <Typography variant="h6" gutterBottom>
          Файлы бэкапов
        </Typography>
        {backupFiles.length === 0 && (
          <Typography color="text.secondary">Нет бэкапов</Typography>
        )}
        {backupFiles.map((file) => (
          <Styled.StyledFileCard key={file.name}>
            <Styled.StyledFileName>{file.name}</Styled.StyledFileName>
            <Styled.StyledFileInfo>
              {file.sizeMb} МБ &middot;{" "}
              {new Date(file.createdAt).toLocaleString("ru-RU")}
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
