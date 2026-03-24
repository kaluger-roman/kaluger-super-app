import { CircularProgress, Switch } from "@mui/material";
import { useUnit } from "effector-react";

import { notificationsModel, $isToggling } from "@entities";

import { AVAILABLE_INTERVALS } from "./ReminderSettings.constants";
import { formatInterval } from "./ReminderSettings.helpers";
import * as Styled from "./ReminderSettings.styled";

export const ReminderSettings = () => {
  const settings = useUnit(notificationsModel.$reminderSettings);
  const isPushSupported = useUnit(notificationsModel.$isPushSupported);
  const pushPermission = useUnit(notificationsModel.$pushPermission);
  const isToggling = useUnit($isToggling);

  const actions = useUnit({
    remindersToggled: notificationsModel.remindersToggled,
    intervalToggled: notificationsModel.intervalToggled,
    muteToggled: notificationsModel.muteToggled,
  });

  if (!isPushSupported) {
    return (
      <Styled.SettingsPaper elevation={0}>
        <Styled.SettingsTitle variant="h6">
          Напоминания об уроках
        </Styled.SettingsTitle>
        <Styled.PermissionAlert severity="info">
          Ваш браузер не поддерживает push-уведомления
        </Styled.PermissionAlert>
      </Styled.SettingsPaper>
    );
  }

  return (
    <Styled.SettingsPaper elevation={0}>
      <Styled.SettingsTitle variant="h6">
        Напоминания об уроках
      </Styled.SettingsTitle>

      <Styled.SettingRow>
        <div>
          <Styled.SettingLabel>Включить напоминания</Styled.SettingLabel>
          <Styled.SettingDescription>
            Получайте уведомления перед началом урока
          </Styled.SettingDescription>
        </div>
        {isToggling ? <CircularProgress size={24} /> : (
          <Switch checked={settings.enabled} onChange={() => actions.remindersToggled()} />
        )}
      </Styled.SettingRow>

      {settings.enabled && (
        <>
          <Styled.SettingLabel>Напомнить за</Styled.SettingLabel>
          <Styled.IntervalsContainer>
            {AVAILABLE_INTERVALS.map((interval) => (
              <Styled.IntervalChip
                key={interval}
                label={formatInterval(interval)}
                color={settings.intervals.includes(interval) ? "primary" : "default"}
                variant={settings.intervals.includes(interval) ? "filled" : "outlined"}
                onClick={() => actions.intervalToggled(interval)}
              />
            ))}
          </Styled.IntervalsContainer>

          <Styled.SettingRow>
            <div>
              <Styled.SettingLabel>Не беспокоить во время урока</Styled.SettingLabel>
              <Styled.SettingDescription>
                Не отправлять напоминания, если у вас сейчас идёт урок
              </Styled.SettingDescription>
            </div>
            <Switch
              checked={settings.muteWhenInLesson}
              onChange={() => actions.muteToggled()}
            />
          </Styled.SettingRow>
        </>
      )}

      {pushPermission === "denied" && (
        <Styled.PermissionAlert severity="warning">
          Уведомления заблокированы. Чтобы разрешить: Android — Настройки сайта → Уведомления;
          iOS — Настройки → Safari → Уведомления; Desktop — значок 🔒 в адресной строке → Уведомления
        </Styled.PermissionAlert>
      )}
    </Styled.SettingsPaper>
  );
};
