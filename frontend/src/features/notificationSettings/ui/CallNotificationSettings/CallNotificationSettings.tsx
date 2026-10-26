import type { FC } from "react";
import { useState } from "react";

import { Switch } from "@mui/material";
import { useUnit } from "effector-react";

import { notificationsModel } from "@entities";

import {
  CALL_NOTIFICATIONS_DESCRIPTION,
  CALL_NOTIFICATIONS_LABEL,
  CALL_NOTIFICATIONS_TITLE,
} from "./CallNotificationSettings.constants";
import * as Styled from "./CallNotificationSettings.styled";

// FR-021: on by default and independent of the lesson reminders above it.
export const CallNotificationSettings: FC = () => {
  const isPushSupported = useUnit(notificationsModel.$isPushSupported);
  // TODO(auto-feature): replace mock with notificationsModel.$callNotificationsEnabled + callNotificationsToggled
  const [enabled, setEnabled] = useState(true);

  if (!isPushSupported) return null;

  return (
    <Styled.SettingsPaper elevation={0}>
      <Styled.SettingsTitle variant="h6">{CALL_NOTIFICATIONS_TITLE}</Styled.SettingsTitle>
      <Styled.SettingRow>
        <div>
          <Styled.SettingLabel>{CALL_NOTIFICATIONS_LABEL}</Styled.SettingLabel>
          <Styled.SettingDescription>{CALL_NOTIFICATIONS_DESCRIPTION}</Styled.SettingDescription>
        </div>
        <Switch
          checked={enabled}
          onChange={() => setEnabled((value) => !value)}
          slotProps={{ input: { "aria-label": CALL_NOTIFICATIONS_LABEL } }}
        />
      </Styled.SettingRow>
    </Styled.SettingsPaper>
  );
};
