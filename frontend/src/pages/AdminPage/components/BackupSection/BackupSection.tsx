import type { FC } from "react";

import {
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { useUnit } from "effector-react";

import { adminModel } from "@features/admin";

import * as Styled from "./BackupSection.styled";

export const BackupSection: FC = () => {
  const backupSettings = useUnit(adminModel.$backupSettings);
  const backupFiles = useUnit(adminModel.$backupFiles);
  const totalSizeMb = useUnit(adminModel.$totalSizeMb);
  const intervalHours = useUnit(adminModel.$intervalHours);
  const maxStorageMb = useUnit(adminModel.$maxStorageMb);

  const actions = useUnit({
    update: adminModel.backupSettingsUpdated,
    create: adminModel.backupCreated,
    changeInterval: adminModel.intervalHoursChanged,
    changeMaxStorage: adminModel.maxStorageMbChanged,
  });

  if (!backupSettings) return null;

  const handleToggle = () => {
    actions.update({ enabled: !backupSettings.enabled });
  };

  const handleSave = () => {
    const hours = parseInt(intervalHours, 10);
    const mb = parseInt(maxStorageMb, 10);
    if (hours >= 1 && hours <= 168 && mb >= 10 && mb <= 10000) {
      actions.update({ intervalHours: hours, maxStorageMb: mb });
    }
  };

  return (
    <div>
      <Styled.StyledControls>
        <FormControlLabel
          control={
            <Switch
              checked={backupSettings.enabled}
              onChange={handleToggle}
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
        <TextField
          label="Интервал (часы)"
          type="number"
          value={intervalHours}
          onChange={(e) => actions.changeInterval(e.target.value)}
          size="small"
          inputProps={{ min: 1, max: 168 }}
        />
        <TextField
          label="Макс. размер (МБ)"
          type="number"
          value={maxStorageMb}
          onChange={(e) => actions.changeMaxStorage(e.target.value)}
          size="small"
          inputProps={{ min: 10, max: 10000 }}
        />
        <Button variant="outlined" onClick={handleSave}>
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
