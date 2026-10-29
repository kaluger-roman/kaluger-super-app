import type { FC } from "react";

import { Switch } from "@mui/material";
import { useUnit } from "effector-react";

import { notificationsModel } from "@entities";
import { PermissionDeniedHelp } from "@shared";

import {
  CALL_NOTIFICATIONS_DESCRIPTION,
  CALL_NOTIFICATIONS_LABEL,
  CALL_NOTIFICATIONS_TITLE,
} from "./CallNotificationSettings.constants";
import * as Styled from "./CallNotificationSettings.styled";

// FR-021: on by default and independent of the lesson reminders above it; hidden without push
// support or server keys (FR-025). Locked while the browser denies notifications: the help below
// says how to allow them.
export const CallNotificationSettings: FC = () => {
  const isPushSupported = useUnit(notificationsModel.$isPushSupported);
  const vapidKey = useUnit(notificationsModel.$vapidKey);
  const enabled = useUnit(notificationsModel.$isCallNotificationsOn);
  const isPermissionDenied = useUnit(notificationsModel.$isPushPermissionDenied);
  const toggle = useUnit(notificationsModel.callNotificationsToggled);

  if (!isPushSupported || vapidKey === null) return null;

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
          disabled={isPermissionDenied}
          onChange={() => toggle()}
          slotProps={{ input: { "aria-label": CALL_NOTIFICATIONS_LABEL } }}
        />
      </Styled.SettingRow>
      {isPermissionDenied && (
        <Styled.DeniedHelpBox>
          <PermissionDeniedHelp />
        </Styled.DeniedHelpBox>
      )}
    </Styled.SettingsPaper>
  );
};
