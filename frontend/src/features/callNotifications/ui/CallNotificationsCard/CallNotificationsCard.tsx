import type { FC } from "react";
import { useState } from "react";

import {
  Close as CloseIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
} from "@mui/icons-material";

import { getCardTone, isInviteShown } from "./CallNotificationsCard.helpers";
import * as Styled from "./CallNotificationsCard.styled";
import { DENIED_TITLE, ENABLE_LABEL, INVITE_TITLE } from "../../callNotifications.constants";
import { getCallNotificationsStatusMock } from "../../callNotificationsMock.helpers";
import { IosInstallInstruction } from "../IosInstallInstruction";
import { PermissionDeniedHelp } from "../PermissionDeniedHelp";

export const CallNotificationsCard: FC = () => {
  // TODO(auto-feature): replace mock with callNotificationsModel.$status
  const status = getCallNotificationsStatusMock();
  // TODO(auto-feature): replace with callNotificationsModel.$isInviteDismissed + inviteDismissed
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !isInviteShown(status)) return null;

  const tone = getCardTone(status);

  return (
    <Styled.CardRoot $tone={tone} data-status={status}>
      <Styled.IconCircle $tone={tone}>
        {tone === "warning" ? <NotificationsOffIcon /> : <NotificationsActiveIcon />}
      </Styled.IconCircle>
      <Styled.Content>
        <Styled.Title variant="subtitle1">
          {status === "denied" ? DENIED_TITLE : INVITE_TITLE}
        </Styled.Title>
        {status === "off" && (
          // TODO(auto-feature): replace no-op with callNotificationsModel.enableClicked
          <Styled.EnableButton variant="contained" onClick={() => undefined}>
            {ENABLE_LABEL}
          </Styled.EnableButton>
        )}
        {status === "iosInstall" && <IosInstallInstruction />}
        {status === "denied" && <PermissionDeniedHelp />}
      </Styled.Content>
      <Styled.CloseButton size="small" aria-label="Скрыть" onClick={() => setDismissed(true)}>
        <CloseIcon fontSize="small" />
      </Styled.CloseButton>
    </Styled.CardRoot>
  );
};
