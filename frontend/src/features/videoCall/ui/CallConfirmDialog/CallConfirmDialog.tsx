import type { FC } from "react";

import { Videocam as VideocamIcon } from "@mui/icons-material";
import { Typography, useMediaQuery, useTheme } from "@mui/material";
import { useUnit } from "effector-react";

import { Button } from "@shared";

import { callConfirmModel } from "../../model";
import { formatCallLessonSubject, formatCallLessonTime } from "../../videoCall.helpers";
import { CallAvatar } from "../CallAvatar";
import * as Styled from "./CallConfirmDialog.styled";

export const CallConfirmDialog: FC = () => {
  const isOpen = useUnit(callConfirmModel.$isOpen);
  const call = useUnit(callConfirmModel.$call);
  const actions = useUnit({
    dismiss: callConfirmModel.confirmDismissed,
    confirm: callConfirmModel.callConfirmed,
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const peerName = call?.peerName ?? "";
  const lesson = call?.lesson ?? null;

  return (
    <Styled.StyledDialog
      open={isOpen}
      onClose={() => actions.dismiss()}
      maxWidth="xs"
      fullWidth
      aria-labelledby="call-confirm-title"
    >
      <Styled.Content>
        <Styled.Title id="call-confirm-title" variant="h6">
          Начать видеозвонок?
        </Styled.Title>
        <CallAvatar name={peerName} size={64} />
        <Styled.PeerName variant="subtitle1">{peerName}</Styled.PeerName>
        {lesson && (
          <Styled.LessonBox>
            <Styled.LessonCaption variant="overline" color="text.secondary">
              Звонок по уроку
            </Styled.LessonCaption>
            <Typography variant="subtitle2">{formatCallLessonSubject(lesson)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {formatCallLessonTime(lesson)}
            </Typography>
          </Styled.LessonBox>
        )}
      </Styled.Content>

      <Styled.Actions $isMobile={isMobile}>
        <Button variant="outlined" fullWidth={isMobile} onClick={() => actions.dismiss()}>
          Отмена
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<VideocamIcon />}
          fullWidth={isMobile}
          onClick={() => actions.confirm()}
        >
          Позвонить
        </Button>
      </Styled.Actions>
    </Styled.StyledDialog>
  );
};
