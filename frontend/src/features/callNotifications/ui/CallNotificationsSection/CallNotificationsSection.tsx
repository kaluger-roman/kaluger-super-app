import type { FC } from "react";

import { Switch, Typography } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { PermissionDeniedHelp } from "@shared";

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
import { callNotificationsModel } from "../../model";
import { IosInstallInstruction } from "../IosInstallInstruction";

export const CallNotificationsSection: FC = () => {
  useGate(callNotificationsModel.SettingsSectionGate);
  const status = useUnit(callNotificationsModel.$status);
  const toggle = useUnit(callNotificationsModel.toggled);

  if (status === null) return null;

  const enabled = status === "on";

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
              onChange={() => toggle()}
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
