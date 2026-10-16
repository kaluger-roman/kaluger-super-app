import type { FC } from "react";

import { VideoCall as VideoCallIcon } from "@mui/icons-material";
import { Typography } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { callHistoryModel, studentUserModel } from "@entities";
import type { CallHistoryPrincipal } from "@entities";
import { CallHistoryList } from "@features";

import * as Styled from "./CallHistoryPage.styled";

export const CallHistoryPage: FC = () => {
  const isStudent = useUnit(studentUserModel.$isStudentAuthenticated);
  const principal: CallHistoryPrincipal = isStudent ? "student" : "tutor";
  useGate(callHistoryModel.CallHistoryGate, principal);
  const records = useUnit(callHistoryModel.$callHistory);

  return (
    <Styled.StyledContainer maxWidth="md">
      <Styled.HeaderBox>
        <Styled.StyledTitle variant="h4">
          <Styled.TitleIcon aria-hidden>
            <VideoCallIcon fontSize="inherit" />
          </Styled.TitleIcon>
          История звонков
        </Styled.StyledTitle>
        <Typography variant="body1" color="text.secondary">
          Ваши видеозвонки
        </Typography>
      </Styled.HeaderBox>

      <Styled.StyledPaper>
        <CallHistoryList records={records} />
      </Styled.StyledPaper>
    </Styled.StyledContainer>
  );
};
