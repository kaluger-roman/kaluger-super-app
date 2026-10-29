import type { FC } from "react";

import { Call as CallIcon, CallEnd as CallEndIcon } from "@mui/icons-material";
import { Typography } from "@mui/material";
import { useUnit } from "effector-react";

import { callEntryModel, callModel } from "../../model";
import { formatCallLessonSubject, formatCallLessonTime } from "../../videoCall.helpers";
import { CallAvatar } from "../CallAvatar";
import { RoundCallButton } from "../RoundCallButton";
import { isDeclineClose } from "./IncomingCallModal.helpers";
import * as Styled from "./IncomingCallModal.styled";

export const IncomingCallModal: FC = () => {
  const incomingCall = useUnit(callModel.$incomingCall);
  const actions = useUnit({
    accept: callEntryModel.answerRequested,
    reject: callEntryModel.rejectRequested,
  });

  const callerName = incomingCall?.callerName ?? "";
  const lesson = incomingCall?.lesson ?? null;

  return (
    <Styled.StyledDialog
      open={incomingCall !== null}
      onClose={(_, reason) => {
        if (isDeclineClose(reason)) actions.reject();
      }}
    >
      <Styled.Content>
        <Styled.Caption variant="overline" color="text.secondary">
          Входящий вызов
        </Styled.Caption>
        <CallAvatar name={callerName} size={88} />
        <Styled.Name variant="h6">{callerName}</Styled.Name>
        {lesson && (
          <Styled.LessonBox>
            <Styled.Caption variant="overline" color="text.secondary">
              Звонок по уроку
            </Styled.Caption>
            <Typography variant="subtitle2">{formatCallLessonSubject(lesson)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {formatCallLessonTime(lesson)}
            </Typography>
          </Styled.LessonBox>
        )}
      </Styled.Content>

      <Styled.Actions>
        <Styled.ActionColumn>
          <RoundCallButton
            $tone="danger"
            $size={60}
            onClick={() => actions.reject()}
            aria-label="Отклонить вызов"
          >
            <CallEndIcon />
          </RoundCallButton>
          <Styled.Caption variant="caption" color="text.secondary">
            Отклонить
          </Styled.Caption>
        </Styled.ActionColumn>

        <Styled.ActionColumn>
          <RoundCallButton
            $tone="success"
            $size={60}
            onClick={() => actions.accept()}
            aria-label="Принять вызов"
          >
            <CallIcon />
          </RoundCallButton>
          <Styled.Caption variant="caption" color="text.secondary">
            Принять
          </Styled.Caption>
        </Styled.ActionColumn>
      </Styled.Actions>
    </Styled.StyledDialog>
  );
};
