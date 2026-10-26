import type { FC } from "react";
import { useState } from "react";

import { Switch, Typography } from "@mui/material";

import { isSwitchLocked } from "./CallNotificationsSection.helpers";
import * as Styled from "./CallNotificationsSection.styled";
import {
  SETTING_DESCRIPTION,
  SETTING_OFF_LABEL,
  SETTING_ON_LABEL,
  SETTING_SWITCH_LABEL,
  SETTINGS_TITLE,
  UNSUPPORTED_TEXT,
} from "../../callNotifications.constants";
import { getCallNotificationsStatusMock } from "../../callNotificationsMock.helpers";
import { IosInstallInstruction } from "../IosInstallInstruction";
import { PermissionDeniedHelp } from "../PermissionDeniedHelp";

export const CallNotificationsSection: FC = () => {
  // TODO(auto-feature): replace mock with callNotificationsModel.$status
  const status = getCallNotificationsStatusMock();
  // TODO(auto-feature): replace with callNotificationsModel.$status === "on" + callNotificationsModel.toggled
  const [enabled, setEnabled] = useState(status === "on");

  return (
    <Styled.SectionPaper variant="outlined">
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {SETTINGS_TITLE}
      </Typography>
      {status === "unsupported" ? (
        <Styled.Description variant="body2">{UNSUPPORTED_TEXT}</Styled.Description>
      ) : (
        <Styled.Body>
          <Styled.Row>
            <Styled.LabelBox>
              <Styled.Label variant="body1">
                {enabled ? SETTING_ON_LABEL : SETTING_OFF_LABEL}
              </Styled.Label>
              <Styled.Description variant="body2">{SETTING_DESCRIPTION}</Styled.Description>
            </Styled.LabelBox>
            <Switch
              checked={enabled}
              disabled={isSwitchLocked(status)}
              onChange={() => setEnabled((value) => !value)}
              slotProps={{ input: { "aria-label": SETTING_SWITCH_LABEL } }}
            />
          </Styled.Row>
          {status === "iosInstall" && <IosInstallInstruction />}
          {status === "denied" && <PermissionDeniedHelp />}
        </Styled.Body>
      )}
    </Styled.SectionPaper>
  );
};
