import type { FC } from "react";

import {
  Close as CloseIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
} from "@mui/icons-material";
import { useGate, useUnit } from "effector-react";

import { PermissionDeniedHelp } from "@shared";

import { getCardTone } from "./CallNotificationsCard.helpers";
import * as Styled from "./CallNotificationsCard.styled";
import { DENIED_TITLE, ENABLE_LABEL, INVITE_TITLE } from "../../callNotifications.constants";
import { callNotificationsModel } from "../../model";
import { IosInstallInstruction } from "../IosInstallInstruction";

export const CallNotificationsCard: FC = () => {
  useGate(callNotificationsModel.InviteCardGate);
  const status = useUnit(callNotificationsModel.$status);
  const shown = useUnit(callNotificationsModel.$isInviteShown);
  const actions = useUnit({
    enable: callNotificationsModel.enableClicked,
    dismiss: callNotificationsModel.inviteDismissed,
  });

  if (!shown || status === null) return null;

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
          <Styled.EnableButton variant="contained" onClick={() => actions.enable()}>
            {ENABLE_LABEL}
          </Styled.EnableButton>
        )}
        {status === "iosInstall" && <IosInstallInstruction />}
        {status === "denied" && <PermissionDeniedHelp />}
      </Styled.Content>
      <Styled.CloseButton size="small" aria-label="Скрыть" onClick={() => actions.dismiss()}>
        <CloseIcon fontSize="small" />
      </Styled.CloseButton>
    </Styled.CardRoot>
  );
};
