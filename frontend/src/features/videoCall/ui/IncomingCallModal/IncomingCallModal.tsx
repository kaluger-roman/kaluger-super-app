import type { FC } from "react";

import {
  Call as CallIcon,
  CallEnd as CallEndIcon,
} from "@mui/icons-material";
import { useUnit } from "effector-react";

import { callModel } from "../../model";
import { CallAvatar } from "../CallAvatar";
import * as Styled from "./IncomingCallModal.styled";

export const IncomingCallModal: FC = () => {
  const phase = useUnit(callModel.$callPhase);
  const incomingCall = useUnit(callModel.$incomingCall);
  const actions = useUnit({
    accept: callModel.acceptCall,
    reject: callModel.rejectCall,
  });

  const open = phase === "incoming" && incomingCall !== null;
  const callerName = incomingCall?.callerName ?? "";

  return (
    <Styled.StyledDialog open={open} onClose={() => actions.reject()}>
      <Styled.Content>
        <Styled.Caption variant="overline" color="text.secondary">
          Входящий вызов
        </Styled.Caption>
        <CallAvatar name={callerName} size={88} />
        <Styled.Name variant="h6">{callerName}</Styled.Name>
      </Styled.Content>

      <Styled.Actions>
        <Styled.ActionColumn>
          <Styled.DeclineButton
            onClick={() => actions.reject()}
            aria-label="Отклонить вызов"
          >
            <CallEndIcon />
          </Styled.DeclineButton>
          <Styled.Caption variant="caption" color="text.secondary">
            Отклонить
          </Styled.Caption>
        </Styled.ActionColumn>

        <Styled.ActionColumn>
          <Styled.AcceptButton
            onClick={() => actions.accept()}
            aria-label="Принять вызов"
          >
            <CallIcon />
          </Styled.AcceptButton>
          <Styled.Caption variant="caption" color="text.secondary">
            Принять
          </Styled.Caption>
        </Styled.ActionColumn>
      </Styled.Actions>
    </Styled.StyledDialog>
  );
};
