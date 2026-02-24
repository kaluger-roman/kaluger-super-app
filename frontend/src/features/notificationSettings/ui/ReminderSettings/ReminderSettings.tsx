import { Switch } from "@mui/material";
import { useUnit } from "effector-react";

import { notificationsModel } from "@entities";

import * as Styled from "./ReminderSettings.styled";

const AVAILABLE_INTERVALS = [5, 10, 15, 30, 60];

const formatInterval = (minutes: number): string => {
  if (minutes === 60) return "1 час";
  return `${minutes} мин`;
};

export const ReminderSettings = () => {
  const settings = useUnit(notificationsModel.$reminderSettings);
  const isPushSupported = useUnit(notificationsModel.$isPushSupported);
  const pushPermission = useUnit(notificationsModel.$pushPermission);
  const isPushSubscribed = useUnit(notificationsModel.$isPushSubscribed);
  const vapidKey = useUnit(notificationsModel.$vapidKey);
  const swRegistration = useUnit(notificationsModel.$serviceWorkerRegistration);

  const actions = useUnit({
    settingsUpdated: notificationsModel.settingsUpdated,
    subscribePushFx: notificationsModel.subscribePushFx,
    unsubscribePushFx: notificationsModel.unsubscribePushFx,
  });

  const handleToggleEnabled = async () => {
    const newEnabled = !settings.enabled;

    if (newEnabled && !isPushSubscribed && vapidKey && swRegistration) {
      try {
        await actions.subscribePushFx({ vapidKey, registration: swRegistration });
      } catch {
        return;
      }
    }

    actions.settingsUpdated({ enabled: newEnabled });
  };

  const handleToggleInterval = (interval: number) => {
    const currentIntervals = settings.intervals;
    const newIntervals = currentIntervals.includes(interval)
      ? currentIntervals.filter((i) => i !== interval)
      : [...currentIntervals, interval];

    actions.settingsUpdated({ intervals: newIntervals });
  };

  const handleToggleMute = () => {
    actions.settingsUpdated({ muteWhenInLesson: !settings.muteWhenInLesson });
  };

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
        <Switch checked={settings.enabled} onChange={handleToggleEnabled} />
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
                onClick={() => handleToggleInterval(interval)}
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
              onChange={handleToggleMute}
            />
          </Styled.SettingRow>
        </>
      )}

      {pushPermission === "denied" && (
        <Styled.PermissionAlert severity="warning">
          Уведомления заблокированы в настройках браузера. Разрешите уведомления для этого сайта
        </Styled.PermissionAlert>
      )}
    </Styled.SettingsPaper>
  );
};
